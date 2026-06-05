import type { CustomProvider, ProviderId } from "./providers/types";

export type Mode = "strip" | "summarise" | "roast";

export const DEFAULT_MODE: Mode = "roast";

// Must stay in sync with backend/_shared/types.ts — the server's MODE_CREDITS
// is the source of truth for billing; this copy is only used for the popup's
// optimistic UI decrement after a successful rewrite.
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
  | "TIMEOUT"
  | "PROVIDER_UNKNOWN"
  | "PROXY_UNAVAILABLE";

export type RewriteResponse =
  // `cached` is proxy-only — set by the edge function on rewrite_cache hits.
  // BYOK responses omit it; the popup treats absence as "not cached" so the
  // optimistic credits decrement only fires for fresh proxy generations.
  | { ok: true; rewrite: string; mode: Mode; cached?: boolean }
  | { ok: false; error: string; code: RewriteErrorCode };

export interface Settings {
  enabled: boolean;
  mode: Mode;
  /** "byok" uses apiKeys[providerId] + the user's chosen provider/model.
   *  "proxy" routes through the linkednt edge function (requires sign-in /
   *  credits). */
  path: Path;
  /** Active provider when path === "byok". May be a builtin id (groq,
   *  openrouter, …) or a custom provider id from customProviders. */
  providerId: ProviderId;
  /** Per-builtin-provider API keys. apiKeys["groq"] = "gsk_...", etc.
   *  Custom providers store their key inside the CustomProvider object. */
  apiKeys: Record<string, string>;
  /** Per-builtin-provider model selection. Falls back to provider.defaultModel.
   *  Custom providers store their model inside the CustomProvider object. */
  models: Record<string, string>;
  /** User-saved OpenAI-compatible endpoints. The popup's BYOK dropdown
   *  merges these with builtin providers. Day-1 UI exposes a single slot
   *  but the data model already supports many. */
  customProviders: CustomProvider[];
}

export const DEFAULT_SETTINGS: Settings = {
  // The popup no longer exposes a kill switch — `enabled` is a programmatic
  // setting only. New installs default to on. The content script + background
  // migration also force-enable on extension install/update.
  enabled: true,
  mode: DEFAULT_MODE,
  path: "proxy",
  providerId: "groq",
  apiKeys: {},
  models: {},
  customProviders: [],
};

// Auth message shapes — kept here so the messages.d.ts ambient module sees
// them. The full Session lives in lib/auth.ts; the popup only ever needs
// the user identity slice.
export interface SessionUserShape {
  id: string;
  email: string | null;
}

export type SignInResponse =
  | { ok: true; user: SessionUserShape }
  | { ok: false; code: string; error: string };

export interface SignOutResponse {
  ok: true;
}

export interface SessionResponse {
  user: SessionUserShape | null;
}

// Account status — what /rpc/my_account_status returns, plus the cached
// fetchedAt timestamp the popup uses for "Refreshed Xs ago" labels. Mirrors
// lib/account.ts AccountStatus so the messaging boundary is typed.
export interface AccountStatusShape {
  email: string | null;
  plan: "free" | "paid";
  freeRemaining: number;
  paidBalance: number;
  dailyUsed: number;
  fetchedAt: number;
}

export type AccountStatusResponse =
  | { ok: true; status: AccountStatusShape; fromCache: boolean }
  | { ok: false; code: string; error: string };
