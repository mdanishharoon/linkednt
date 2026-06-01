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
  if (cfg.injectGroqReasoning && args.reasoningHidden) {
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
  };
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
