import { callOpenAICompatible } from "./openai-compatible";
import type { Provider } from "./types";

export const groqProvider: Provider = {
  id: "groq",
  label: "Groq",
  defaultModel: "qwen/qwen3-32b",
  modelSuggestions: [
    "qwen/qwen3-32b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "openai/gpt-oss-120b",
  ],
  consoleUrl: "https://console.groq.com/keys",
  keyPlaceholder: "gsk_...",
  call(args) {
    return callOpenAICompatible(
      {
        endpoint: "https://api.groq.com/openai/v1/chat/completions",
        maxTokensField: "max_completion_tokens",
        injectGroqReasoning: true,
      },
      args,
    );
  },
};
