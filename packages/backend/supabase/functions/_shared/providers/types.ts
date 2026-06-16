import type { RewriteErrorCode } from "../types.ts";

export type BuiltinProviderId =
  | "groq"
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter";

export interface ProviderCallArgs {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
  reasoningHidden?: boolean;
}

/** Token usage reported by the provider, for operator cost accounting. */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export type ProviderCallResult =
  | { ok: true; content: string; raw: unknown; usage?: TokenUsage }
  | { ok: false; code: RewriteErrorCode; error: string; raw?: unknown };

export interface Provider {
  id: BuiltinProviderId;
  label: string;
  defaultModel: string;
  call(args: ProviderCallArgs): Promise<ProviderCallResult>;
}
