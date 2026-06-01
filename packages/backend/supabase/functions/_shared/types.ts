// Shared types between the extension and the edge function. Kept identical to
// packages/extension/src/lib/types.ts on purpose — when one changes, mirror
// the other so the wire shape stays in sync.

export type Mode = "strip" | "summarise" | "roast";

export const MODE_CREDITS: Record<Mode, number> = {
  strip: 1,
  summarise: 2,
  roast: 3,
};

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

export interface RewriteRequest {
  text: string;
  mode: Mode;
}

export type RewriteResponse =
  | { ok: true; rewrite: string; mode: Mode; cached: boolean }
  | { ok: false; error: string; code: RewriteErrorCode };
