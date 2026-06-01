import { anthropicProvider } from "./anthropic";
import { isCustomProviderId, makeCustomProvider } from "./custom";
import { geminiProvider } from "./gemini";
import { groqProvider } from "./groq";
import { openaiProvider } from "./openai";
import { openrouterProvider } from "./openrouter";
import type { BuiltinProviderId, CustomProvider, Provider } from "./types";

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

/**
 * Look up a provider by id. Builtin ids resolve from the static registry;
 * ids starting with `custom_` resolve from the per-user `customs` array
 * passed in by the caller (lives in chrome.storage.local under
 * settings.customProviders).
 */
export function getProvider(
  id: string,
  customs: CustomProvider[] = [],
): Provider | null {
  const builtin = (BUILTIN_PROVIDERS as Record<string, Provider | undefined>)[
    id
  ];
  if (builtin) return builtin;
  if (isCustomProviderId(id)) {
    const custom = customs.find((c) => c.id === id);
    if (custom) return makeCustomProvider(custom);
  }
  return null;
}

/** Builtin providers only — the original list used by the popup's BYOK
 *  picker before custom providers existed. */
export function listProviders(): Provider[] {
  return BUILTIN_PROVIDER_IDS.map((id) => BUILTIN_PROVIDERS[id]);
}

/** Builtin + the user's saved customs, materialized as Providers. The popup
 *  uses this for the BYOK provider dropdown so customs show up inline. */
export function listAllProviders(customs: CustomProvider[]): Provider[] {
  return [...listProviders(), ...customs.map(makeCustomProvider)];
}
