import type { Mode } from "./types.ts";
import type { BuiltinProviderId } from "./providers/types.ts";

interface ModeRoute {
  providerId: BuiltinProviderId;
  /** Env var holding the API key for this provider on the server. */
  apiKeyEnv: string;
  model: string;
}

// Server-side routing — proxy users don't pick a provider, the backend does.
// Tuned for the 1/2/3 credit price tiers: Strip is cheapest (Groq llama-8B),
// Summarise gets a smarter Groq model, Roast pays Sonnet 4.6 for taste.
//
// When updating this table, bump PROMPT_VERSION in prompts.ts so the cache
// invalidates cleanly — model_version is part of the rewrite_cache PK.
export const MODE_ROUTING: Record<Mode, ModeRoute> = {
  strip: {
    providerId: "groq",
    apiKeyEnv: "GROQ_API_KEY",
    model: "llama-3.1-8b-instant",
  },
  summarise: {
    providerId: "groq",
    apiKeyEnv: "GROQ_API_KEY",
    model: "llama-3.3-70b-versatile",
  },
  roast: {
    providerId: "openrouter",
    apiKeyEnv: "OPENROUTER_API_KEY",
    model: "anthropic/claude-sonnet-4.6",
  },
};

// Fallback routes — tried ONLY when the primary provider call fails (e.g.
// OpenRouter out of balance, rate-limited, or down). A paid rewrite degrades
// gracefully to Groq instead of hard-failing the user. Groq is the safety net
// because its key is always present and it bills separately from OpenRouter, so
// an OpenRouter outage/empty-balance can't take roast down too. Roast loses some
// taste on llama-70B but still returns a first-person roast.
export const MODE_FALLBACK: Partial<Record<Mode, ModeRoute>> = {
  roast: {
    providerId: "groq",
    apiKeyEnv: "GROQ_API_KEY",
    model: "llama-3.3-70b-versatile",
  },
};

export function routeForMode(mode: Mode): ModeRoute {
  return MODE_ROUTING[mode];
}

export function fallbackForMode(mode: Mode): ModeRoute | null {
  return MODE_FALLBACK[mode] ?? null;
}
