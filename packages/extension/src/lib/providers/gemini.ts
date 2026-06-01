import type { RewriteErrorCode } from "../types";
import type { Provider, ProviderCallArgs, ProviderCallResult } from "./types";

const ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { code?: number; message?: string; status?: string };
}

async function call(args: ProviderCallArgs): Promise<ProviderCallResult> {
  // Gemini uses path params for model + an API-key header. We prefer the
  // header form over the query-string form so the key never lands in logs
  // that capture URLs.
  const endpoint = `${ENDPOINT_BASE}/${encodeURIComponent(args.model)}:generateContent`;

  const body = {
    systemInstruction: { parts: [{ text: args.systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: args.userPrompt }] }],
    generationConfig: {
      temperature: args.temperature,
      maxOutputTokens: args.maxTokens,
      topP: 0.95,
    },
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      headers: {
        "x-goog-api-key": args.apiKey,
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

  const data = (await response.json().catch(() => ({}))) as GeminiResponse;

  if (!response.ok) {
    return { ok: false, ...classifyError(response.status, data), raw: data };
  }

  const content = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("");

  return { ok: true, content, raw: data };
}

function classifyError(
  status: number,
  data: GeminiResponse,
): { code: RewriteErrorCode; error: string } {
  const detail = data.error?.message;
  if (status === 401 || status === 403) {
    return { code: "UNAUTHORIZED", error: "Gemini rejected the API key." };
  }
  if (status === 429) {
    return {
      code: "RATE_LIMITED",
      error: detail
        ? `Gemini rate limited: ${detail}`
        : "Gemini rate limited this request.",
    };
  }
  return { code: "HTTP", error: detail || `Gemini returned ${status}.` };
}

export const geminiProvider: Provider = {
  id: "gemini",
  label: "Google Gemini",
  defaultModel: "gemini-2.5-flash",
  modelSuggestions: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
  consoleUrl: "https://aistudio.google.com/app/apikey",
  keyPlaceholder: "AIza...",
  call,
};
