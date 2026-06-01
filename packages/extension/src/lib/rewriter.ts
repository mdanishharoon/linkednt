import {
  STRICT_OUTPUT_SUFFIX,
  maxTokensForMode,
  promptForMode,
  temperatureForMode,
} from "./prompts";
import { getProvider } from "./providers/registry";
import type {
  CustomProvider,
  ProviderCallArgs,
  ProviderId,
} from "./providers/types";
import type { Mode, RewriteResponse } from "./types";

const MIN_TEXT_LENGTH = 24;
const LOG = "[linkednt:rw]";

export interface RewriteArgs {
  text: string;
  mode: Mode;
  providerId: ProviderId;
  apiKey: string;
  model: string;
  /** Pass-through for custom provider resolution. Empty array when caller
   *  knows the providerId is a builtin. */
  customProviders?: CustomProvider[];
}

export async function rewrite(args: RewriteArgs): Promise<RewriteResponse> {
  const text = args.text.trim();

  if (text.length < MIN_TEXT_LENGTH) {
    return {
      ok: false,
      code: "TOO_SHORT",
      error: "Not enough slop to work with.",
    };
  }

  const provider = getProvider(args.providerId, args.customProviders ?? []);
  if (!provider) {
    return {
      ok: false,
      code: "PROVIDER_UNKNOWN",
      error: `Unknown provider: ${args.providerId}`,
    };
  }

  if (!args.apiKey) {
    return {
      ok: false,
      code: "NO_API_KEY",
      error: `Open linkednt from Chrome's toolbar and add your ${provider.label} key.`,
    };
  }

  const model = args.model || provider.defaultModel;

  // First attempt — without the strict-output suffix. Most well-behaved models
  // satisfy the per-mode constraints on the first try.
  const firstAttempt = await callProvider(provider.call, {
    ...args,
    text,
    model,
    strict: false,
  });
  if (!firstAttempt.ok) return firstAttempt;

  let output = cleanModelOutput(firstAttempt.content);

  if (!output && firstAttempt.content) {
    console.warn(
      `${LOG} first attempt: clean produced empty output, raw was:`,
      {
        rawChars: firstAttempt.content.length,
        rawPreview: firstAttempt.content.slice(0, 300),
      },
    );
  }

  const retryReason = retryReasonFor(output, args.mode);
  if (retryReason) {
    console.info(`${LOG} retrying with strict suffix`, {
      reason: retryReason,
      mode: args.mode,
      provider: args.providerId,
    });
    const retry = await callProvider(provider.call, {
      ...args,
      text,
      model,
      strict: true,
    });
    if (retry.ok) {
      const retryClean = cleanModelOutput(retry.content);
      if (!retryClean && retry.content) {
        console.warn(`${LOG} retry: clean produced empty output, raw was:`, {
          rawChars: retry.content.length,
          rawPreview: retry.content.slice(0, 300),
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
      error: `${provider.label} returned an empty translation.`,
    };
  }

  return { ok: true, rewrite: output, mode: args.mode };
}

// Adapter: builds ProviderCallArgs from our per-mode rewrite args + logs timing.
async function callProvider(
  providerCall: (a: ProviderCallArgs) => Promise<
    | {
        ok: true;
        content: string;
        raw: unknown;
      }
    | {
        ok: false;
        code: import("./types").RewriteErrorCode;
        error: string;
        raw?: unknown;
      }
  >,
  args: RewriteArgs & { text: string; strict: boolean; model: string },
) {
  const startedAt = performance.now();
  const basePrompt = promptForMode(args.mode);
  const systemPrompt = args.strict
    ? basePrompt + STRICT_OUTPUT_SUFFIX
    : basePrompt;

  const result = await providerCall({
    systemPrompt,
    userPrompt: args.text,
    model: args.model,
    temperature: temperatureForMode(args.mode, args.strict),
    maxTokens: maxTokensForMode(args.mode),
    apiKey: args.apiKey,
    reasoningHidden: true,
  });
  const ms = Math.round(performance.now() - startedAt);

  if (result.ok) {
    console.info(`${LOG} provider response`, {
      provider: args.providerId,
      model: args.model,
      ms,
      strict: args.strict,
      contentChars: result.content.length,
    });
    return { ok: true as const, content: result.content };
  }

  console.warn(`${LOG} provider error`, {
    provider: args.providerId,
    model: args.model,
    ms,
    strict: args.strict,
    code: result.code,
    error: result.error,
  });
  return { ok: false as const, code: result.code, error: result.error };
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
