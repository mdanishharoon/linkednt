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

/**
 * A user-saved OpenAI-compatible endpoint. Stored in chrome.storage under
 * settings.customProviders. Multi-slot from day one — the popup currently
 * exposes a single-entry UI but the data model + storage already support
 * an array so we can add a "manage all" view later without a migration.
 */
export interface CustomProvider {
  /** Stable id, format `custom_<unix-ms>`. Used as Settings.providerId when
   *  this provider is the active one. */
  id: string;
  /** User-given label shown in the provider dropdown. */
  label: string;
  /** Chat completions URL — e.g. http://localhost:11434/v1/chat/completions
   *  for Ollama, or any OpenAI-compatible endpoint. */
  baseUrl: string;
  /** API key for this endpoint. Optional — leave empty for local Ollama. */
  apiKey: string;
  /** Default model id used when calling this endpoint. */
  model: string;
}
