import { callOpenAICompatible } from "./openai-compatible";
import type { Provider } from "./types";

export const openaiProvider: Provider = {
  id: "openai",
  label: "OpenAI",
  defaultModel: "gpt-4o-mini",
  modelSuggestions: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "o4-mini"],
  consoleUrl: "https://platform.openai.com/api-keys",
  keyPlaceholder: "sk-...",
  call(args) {
    return callOpenAICompatible(
      {
        endpoint: "https://api.openai.com/v1/chat/completions",
        maxTokensField: "max_completion_tokens",
      },
      args,
    );
  },
};
