// Custom OpenAI-compatible provider — built on the fly from a user-saved
// CustomProvider config. Used for Ollama, LM Studio, Together, Cerebras, or
// any other chat-completions endpoint that speaks the OpenAI API.
//
// We don't pre-register custom providers in the builtin registry; instead,
// getProvider() in registry.ts looks them up in the per-user settings and
// calls makeCustomProvider() to materialize a Provider when needed.

import { callOpenAICompatible } from "./openai-compatible";
import type { CustomProvider, Provider } from "./types";

const CUSTOM_ID_PREFIX = "custom_";

export function isCustomProviderId(id: string): boolean {
  return id.startsWith(CUSTOM_ID_PREFIX);
}

export function newCustomProviderId(): string {
  return `${CUSTOM_ID_PREFIX}${Date.now()}`;
}

export function makeCustomProvider(custom: CustomProvider): Provider {
  return {
    id: custom.id,
    label: custom.label || "Custom",
    defaultModel: custom.model,
    // Suggestions for a custom endpoint are unknown; show only what the user
    // already saved. The popup's "Custom model…" fallback path still lets
    // them change it.
    modelSuggestions: custom.model ? [custom.model] : [],
    // No public console — leave blank so the popup hides the "Get one →" link.
    consoleUrl: "",
    keyPlaceholder: "Optional for local endpoints",
    call(args) {
      return callOpenAICompatible(
        {
          endpoint: custom.baseUrl,
          // Most OpenAI-compatible endpoints accept max_tokens; Groq's
          // max_completion_tokens is a quirk we only need for the builtin
          // Groq adapter, not for arbitrary custom endpoints.
          maxTokensField: "max_tokens",
        },
        args,
      );
    },
  };
}
