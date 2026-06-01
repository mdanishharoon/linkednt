import { callOpenAICompatible } from "./openai-compatible.ts";
import type { Provider } from "./types.ts";

export const openrouterProvider: Provider = {
  id: "openrouter",
  label: "OpenRouter",
  defaultModel: "anthropic/claude-sonnet-4.6",
  call(args) {
    return callOpenAICompatible(
      {
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        maxTokensField: "max_tokens",
        extraHeaders: {
          "HTTP-Referer": "https://linkednt.com",
          "X-Title": "linkednt",
        },
      },
      args,
    );
  },
};
