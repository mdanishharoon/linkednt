import type { RewriteErrorCode } from "../types.ts";
import type { ProviderCallArgs, ProviderCallResult } from "./types.ts";

export interface OpenAICompatibleConfig {
  endpoint: string;
  extraHeaders?: Record<string, string>;
  maxTokensField: "max_tokens" | "max_completion_tokens";
  injectGroqReasoning?: boolean;
}

export async function callOpenAICompatible(
  cfg: OpenAICompatibleConfig,
  args: ProviderCallArgs,
): Promise<ProviderCallResult> {
  const body: Record<string, unknown> = {
    model: args.model,
    messages: [
      { role: "system", content: args.systemPrompt },
      { role: "user", content: args.userPrompt },
    ],
    temperature: args.temperature,
    top_p: 0.95,
    stream: false,
    stop: null,
    [cfg.maxTokensField]: args.maxTokens,
  };
  if (
    cfg.injectGroqReasoning &&
    args.reasoningHidden &&
    groqModelSupportsReasoning(args.model)
  ) {
    body.reasoning_format = "hidden";
  }

  let response: Response;
  try {
    response = await fetch(cfg.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
        ...(cfg.extraHeaders ?? {}),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return {
      ok: false,
      code: "NETWORK",
      error: err instanceof Error ? err.message : "Network request failed.",
    };
  }

  type ChatResponse = {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
    message?: string;
    // OpenAI-compatible token accounting (Groq + OpenRouter both return it).
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const data = (await response.json().catch(() => ({}))) as ChatResponse;

  if (!response.ok) {
    return {
      ok: false,
      ...classifyChatError(response.status, data),
      raw: data,
    };
  }

  return {
    ok: true,
    content: data.choices?.[0]?.message?.content ?? "",
    raw: data,
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    },
  };
}

// Groq only accepts `reasoning_format` on its reasoning models (qwen3,
// deepseek-r1, gpt-oss, qwq). Llama/gemma/mixtral reject it with a 400
// ("`reasoning_format` is not supported with this model"), so gate the
// injection on the model rather than the provider — the routing table sends
// llama models for strip/summarise.
function groqModelSupportsReasoning(model: string): boolean {
  const m = model.toLowerCase();
  return (
    m.includes("qwen") ||
    m.includes("deepseek-r1") ||
    m.includes("gpt-oss") ||
    m.includes("qwq")
  );
}

function classifyChatError(
  status: number,
  data: { error?: { message?: string }; message?: string },
): { code: RewriteErrorCode; error: string } {
  const detail = data.error?.message || data.message;
  if (detail?.toLowerCase().includes("insufficient credits")) {
    return {
      code: "INSUFFICIENT_CREDITS",
      error: "Provider returned insufficient credits.",
    };
  }
  if (status === 401 || status === 403) {
    return { code: "UNAUTHORIZED", error: "Provider rejected the API key." };
  }
  if (status === 429) {
    return {
      code: "RATE_LIMITED",
      error: detail
        ? `Provider rate limited this request: ${detail}`
        : "Provider rate limited this request.",
    };
  }
  return { code: "HTTP", error: detail || `Provider returned ${status}.` };
}
