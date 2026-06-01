import type { RewriteErrorCode } from "../types";

export type BuiltinProviderId =
  | "groq"
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter";

// Allow string for user-defined custom provider IDs.
export type ProviderId = BuiltinProviderId | (string & {});

export interface ProviderCallArgs {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
  // For reasoning-capable models (Groq qwen3, OpenAI o1, etc.). The adapter
  // decides how to express "keep thinking internal" in its native API.
  reasoningHidden?: boolean;
}

export type ProviderCallResult =
  | { ok: true; content: string; raw: unknown }
  | { ok: false; code: RewriteErrorCode; error: string; raw?: unknown };

export interface Provider {
  id: ProviderId;
  label: string;
  defaultModel: string;
  /** Suggested models the popup shows as datalist hints. */
  modelSuggestions: string[];
  /** Where the user goes to mint a key. Linked from the popup. */
  consoleUrl: string;
  /** Visible placeholder for the BYOK key field (e.g. `gsk_...`, `sk-...`). */
  keyPlaceholder: string;
  call(args: ProviderCallArgs): Promise<ProviderCallResult>;
}
