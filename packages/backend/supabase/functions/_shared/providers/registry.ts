import { groqProvider } from "./groq.ts";
import { openrouterProvider } from "./openrouter.ts";
import type { BuiltinProviderId, Provider } from "./types.ts";

// Server-side we only enable the providers we actually route mode→model
// against. OpenAI / Anthropic direct / Gemini can be added later; the
// extension's full registry is for BYOK where users supply their own keys.
const PROVIDERS: Record<string, Provider> = {
  groq: groqProvider,
  openrouter: openrouterProvider,
};

export function getProvider(id: string): Provider | null {
  return PROVIDERS[id] ?? null;
}

export type { BuiltinProviderId };
