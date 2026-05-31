import {
  STRICT_OUTPUT_SUFFIX,
  maxTokensForMode,
  promptForMode,
  temperatureForMode,
} from "./prompts";
import type { Mode, RewriteErrorCode, RewriteResponse } from "./types";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MIN_TEXT_LENGTH = 24;
const LOG = "[linkednt:rw]";

interface GroqRequestBody {
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  temperature: number;
  top_p: number;
  stream: false;
  stop: null;
  max_completion_tokens: number;
  // Groq-specific extension for reasoning models (qwen3, deepseek-r1, etc.).
  // "hidden" keeps the chain-of-thought internal and returns only the final
  // answer in `content` — without this, content is wrapped in <think> blocks
  // that get stripped by cleanModelOutput, leaving empty results.
  reasoning_format?: "raw" | "hidden" | "parsed";
}

interface GroqResponseShape {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
  message?: string;
}

interface RewriteArgs {
  text: string;
  mode: Mode;
  apiKey: string;
  model: string;
}

type CallResult =
  | { ok: true; raw: string }
  | { ok: false; code: RewriteErrorCode; error: string };

export async function rewrite(args: RewriteArgs): Promise<RewriteResponse> {
  const text = args.text.trim();

  if (text.length < MIN_TEXT_LENGTH) {
    return {
      ok: false,
      code: "TOO_SHORT",
      error: "Not enough slop to work with.",
    };
  }
  if (!args.apiKey) {
    return {
      ok: false,
      code: "NO_API_KEY",
      error: "Open linkednt from Chrome's toolbar and add your Groq key.",
    };
  }

  const firstAttempt = await callGroq({ ...args, text, strict: false });
  if (!firstAttempt.ok) return firstAttempt;

  let output = cleanModelOutput(firstAttempt.raw);

  if (!output && firstAttempt.raw) {
    console.warn(
      `${LOG} first attempt: clean produced empty output, raw was:`,
      {
        rawChars: firstAttempt.raw.length,
        rawPreview: firstAttempt.raw.slice(0, 300),
      },
    );
  }

  const retryReason = retryReasonFor(output, args.mode);
  if (retryReason) {
    console.info(`${LOG} retrying with strict suffix`, {
      reason: retryReason,
      mode: args.mode,
    });
    const retry = await callGroq({ ...args, text, strict: true });
    if (retry.ok) {
      const retryClean = cleanModelOutput(retry.raw);
      if (!retryClean && retry.raw) {
        console.warn(`${LOG} retry: clean produced empty output, raw was:`, {
          rawChars: retry.raw.length,
          rawPreview: retry.raw.slice(0, 300),
        });
      }
      if (retryClean) output = retryClean;
    } else {
      console.warn(`${LOG} retry call failed`, {
        code: retry.code,
        error: retry.error,
      });
    }
  }

  if (!output) {
    return {
      ok: false,
      code: "EMPTY",
      error: "Groq returned an empty translation.",
    };
  }

  return { ok: true, rewrite: output, mode: args.mode };
}

async function callGroq(
  args: RewriteArgs & { strict: boolean },
): Promise<CallResult> {
  const body = buildBody(args);
  const startedAt = performance.now();

  let response: Response;
  try {
    response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const ms = Math.round(performance.now() - startedAt);
    console.error(`${LOG} fetch threw`, { ms, err });
    return {
      ok: false,
      code: "NETWORK",
      error: err instanceof Error ? err.message : "Network request failed.",
    };
  }

  const ms = Math.round(performance.now() - startedAt);
  const data = (await response.json().catch(() => ({}))) as GroqResponseShape;

  console.info(`${LOG} groq response`, {
    status: response.status,
    ok: response.ok,
    ms,
    model: args.model,
    strict: args.strict,
    contentChars: data.choices?.[0]?.message?.content?.length ?? 0,
  });

  if (!response.ok) {
    return { ok: false, ...classifyError(response.status, data) };
  }

  return { ok: true, raw: data.choices?.[0]?.message?.content ?? "" };
}

function buildBody(args: RewriteArgs & { strict: boolean }): GroqRequestBody {
  const basePrompt = promptForMode(args.mode);
  const systemPrompt = args.strict
    ? basePrompt + STRICT_OUTPUT_SUFFIX
    : basePrompt;
  return {
    model: args.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: args.text },
    ],
    temperature: temperatureForMode(args.mode, args.strict),
    top_p: 0.95,
    stream: false,
    stop: null,
    max_completion_tokens: maxTokensForMode(args.mode),
    reasoning_format: "hidden",
  };
}

function cleanModelOutput(content: string): string {
  return String(content || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/i, "")
    .replace(/^\s*(Translation|Monologue|Summary|Strip):\s*/i, "")
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/\n?```$/, "")
    .trim();
}

function retryReasonFor(result: string, mode: Mode): string | null {
  if (!result) return "empty output";
  if (/<\/?think/i.test(result)) return "<think> tag survived cleaning";

  const trimmed = result.trim();
  if (!/[.!?")']$/.test(trimmed)) return "output does not end in punctuation";

  if (mode === "roast") {
    const lower = trimmed.toLowerCase();
    const hasFirstPerson = /\b(i|i'm|i've|i'd|i'll|my|me|mine)\b/i.test(
      trimmed,
    );
    const secondPersonHits = (
      lower.match(/\b(you|you're|your|you are)\b/g) || []
    ).length;
    if (!hasFirstPerson) return "roast missing first-person voice";
    if (secondPersonHits > 0)
      return `roast used second-person ${secondPersonHits}x`;
  }

  if (mode === "strip") {
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount > 28) return `strip exceeded 28 words (${wordCount})`;
  }

  return null;
}

function classifyError(
  status: number,
  data: GroqResponseShape,
): { code: RewriteErrorCode; error: string } {
  const detail = data.error?.message || data.message;

  if (detail?.toLowerCase().includes("insufficient credits")) {
    return {
      code: "INSUFFICIENT_CREDITS",
      error:
        "Groq returned an insufficient credits error. Switch to a smaller model.",
    };
  }
  if (status === 401 || status === 403) {
    return {
      code: "UNAUTHORIZED",
      error: "Groq rejected the API key. Save a valid key in linkednt.",
    };
  }
  if (status === 429) {
    return {
      code: "RATE_LIMITED",
      error: detail
        ? `Groq rate limited this request: ${detail}`
        : "Groq rate limited this request. Try again later.",
    };
  }
  return { code: "HTTP", error: detail || `Groq returned ${status}.` };
}
