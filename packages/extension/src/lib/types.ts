export type Mode = "strip" | "summarise" | "roast";

export const DEFAULT_MODE: Mode = "strip";

export const MODE_CREDITS: Record<Mode, number> = {
  strip: 1,
  summarise: 2,
  roast: 3,
};

export const MODES: Mode[] = ["strip", "summarise", "roast"];

export const DEFAULT_GROQ_MODEL = "qwen/qwen3-32b";

export interface RewriteRequest {
  text: string;
  mode: Mode;
}

export type RewriteErrorCode =
  | "NO_API_KEY"
  | "TOO_SHORT"
  | "EMPTY"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "INSUFFICIENT_CREDITS"
  | "HTTP"
  | "NETWORK";

export type RewriteResponse =
  | { ok: true; rewrite: string; mode: Mode }
  | { ok: false; error: string; code: RewriteErrorCode };

export interface Settings {
  enabled: boolean;
  mode: Mode;
  apiKey: string;
  model: string;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: false,
  mode: DEFAULT_MODE,
  apiKey: "",
  model: DEFAULT_GROQ_MODEL,
};
