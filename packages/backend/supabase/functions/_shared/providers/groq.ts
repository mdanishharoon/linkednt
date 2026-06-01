import { callOpenAICompatible } from "./openai-compatible.ts";
import type { Provider } from "./types.ts";

export const groqProvider: Provider = {
  id: "groq",
  label: "Groq",
  defaultModel: "qwen/qwen3-32b",
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
