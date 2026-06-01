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

export type ProviderCallResult =
  | { ok: true; content: string; raw: unknown }
  | { ok: false; code: RewriteErrorCode; error: string; raw?: unknown };

export interface Provider {
  id: BuiltinProviderId;
  label: string;
  defaultModel: string;
  call(args: ProviderCallArgs): Promise<ProviderCallResult>;
}
