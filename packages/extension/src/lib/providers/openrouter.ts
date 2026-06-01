import { callOpenAICompatible } from "./openai-compatible";
import type { Provider } from "./types";

export const openrouterProvider: Provider = {
  id: "openrouter",
  label: "OpenRouter",
  defaultModel: "anthropic/claude-sonnet-4.6",
  modelSuggestions: [
    // Free tier first — most users on BYOK want zero-cost options.
    "openai/gpt-oss-120b:free",
    "openai/gpt-oss-20b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-chat-v3.1:free",
    // Paid, ordered cheapest → best.
    "openai/gpt-4o-mini",
    "deepseek/deepseek-v3",
    "anthropic/claude-haiku-4.5",
    "anthropic/claude-sonnet-4.6",
  ],
  consoleUrl: "https://openrouter.ai/keys",
  keyPlaceholder: "sk-or-...",
  call(args) {
    return callOpenAICompatible(
      {
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        maxTokensField: "max_tokens",
        // OpenRouter wants attribution headers so app traffic shows up in
        // their analytics + helps us if we ever apply for higher rate limits.
        extraHeaders: {
          "HTTP-Referer": "https://linkednt.pages.dev",
          "X-Title": "linkednt",
        },
      },
      args,
    );
  },
};
