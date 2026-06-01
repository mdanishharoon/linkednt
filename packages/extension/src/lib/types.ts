import type { ProviderId } from "./providers/types";

export type Mode = "strip" | "summarise" | "roast";

export const DEFAULT_MODE: Mode = "strip";

export const MODE_CREDITS: Record<Mode, number> = {
  strip: 1,
  summarise: 2,
  roast: 3,
};

export const MODES: Mode[] = ["strip", "summarise", "roast"];

/** Legacy single-key field — kept for storage migration only. */
export const DEFAULT_GROQ_MODEL = "qwen/qwen3-32b";

export type Path = "byok" | "proxy";

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
  | "NETWORK"
  | "PROVIDER_UNKNOWN"
  | "PROXY_UNAVAILABLE";

export type RewriteResponse =
  | { ok: true; rewrite: string; mode: Mode }
  | { ok: false; error: string; code: RewriteErrorCode };

export interface Settings {
  enabled: boolean;
  mode: Mode;
  /** "byok" uses apiKeys[providerId] + the user's chosen provider/model.
   *  "proxy" routes through the linkednt edge function (requires sign-in /
   *  credits — not wired yet, popup shows a placeholder). */
  path: Path;
  /** Active provider when path === "byok". */
  providerId: ProviderId;
  /** Per-provider API keys. apiKeys["groq"] = "gsk_...", etc. */
  apiKeys: Record<string, string>;
  /** Per-provider model selection. Falls back to provider.defaultModel. */
  models: Record<string, string>;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: false,
  mode: DEFAULT_MODE,
  path: "proxy",
  providerId: "groq",
  apiKeys: {},
  models: {},
};
