import { anthropicProvider } from "./anthropic";
import { geminiProvider } from "./gemini";
import { groqProvider } from "./groq";
import { openaiProvider } from "./openai";
import { openrouterProvider } from "./openrouter";
import type { BuiltinProviderId, Provider } from "./types";

export const BUILTIN_PROVIDERS: Record<BuiltinProviderId, Provider> = {
  groq: groqProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
  openrouter: openrouterProvider,
};

export const BUILTIN_PROVIDER_IDS: BuiltinProviderId[] = [
  "groq",
  "openai",
  "anthropic",
  "gemini",
  "openrouter",
];

export const DEFAULT_PROVIDER_ID: BuiltinProviderId = "groq";

export function getProvider(id: string): Provider | null {
  return (
    (BUILTIN_PROVIDERS as Record<string, Provider | undefined>)[id] ?? null
  );
}

export function listProviders(): Provider[] {
  return BUILTIN_PROVIDER_IDS.map((id) => BUILTIN_PROVIDERS[id]);
}
