import type { RewriteErrorCode } from "../types";
import type { Provider, ProviderCallArgs, ProviderCallResult } from "./types";

const ENDPOINT = "https://api.anthropic.com/v1/messages";

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
  error?: { type?: string; message?: string };
}

async function call(args: ProviderCallArgs): Promise<ProviderCallResult> {
  const body = {
    model: args.model,
    system: args.systemPrompt,
    messages: [{ role: "user", content: args.userPrompt }],
    max_tokens: args.maxTokens,
    temperature: args.temperature,
  };

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      headers: {
        "x-api-key": args.apiKey,
        "anthropic-version": "2023-06-01",
        // Required to call the Messages API from a non-server context (browser
        // extension SW counts as a non-server origin). Without this header,
        // Anthropic returns a CORS error before our fetch sees a status code.
        "anthropic-dangerous-direct-browser-access": "true",
        "Content-Type": "application/json",
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

  const data = (await response.json().catch(() => ({}))) as AnthropicResponse;

  if (!response.ok) {
    return { ok: false, ...classifyError(response.status, data), raw: data };
  }

  // Concatenate all text blocks; Anthropic can return multiple if tool use is
  // involved, but we never enable tools so this is almost always one block.
  const content = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");

  return { ok: true, content, raw: data };
}

function classifyError(
  status: number,
  data: AnthropicResponse,
): { code: RewriteErrorCode; error: string } {
  const detail = data.error?.message;
  if (status === 401 || status === 403) {
    return {
      code: "UNAUTHORIZED",
      error: "Anthropic rejected the API key.",
    };
  }
  if (status === 429) {
    return {
      code: "RATE_LIMITED",
      error: detail
        ? `Anthropic rate limited: ${detail}`
        : "Anthropic rate limited this request.",
    };
  }
  if (data.error?.type === "billing_error") {
    return {
      code: "INSUFFICIENT_CREDITS",
      error: detail ?? "Anthropic returned a billing error.",
    };
  }
  return { code: "HTTP", error: detail || `Anthropic returned ${status}.` };
}

export const anthropicProvider: Provider = {
  id: "anthropic",
  label: "Anthropic",
  defaultModel: "claude-sonnet-4-6",
  modelSuggestions: [
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001",
    "claude-opus-4-7",
  ],
  consoleUrl: "https://console.anthropic.com/settings/keys",
  keyPlaceholder: "sk-ant-...",
  call,
};
