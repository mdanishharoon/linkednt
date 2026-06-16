// Central translator from internal error codes + raw messages into copy that's
// safe and useful to show a real user.
//
// Raw messages from providers, HTTP status lines, and token-refresh internals
// are great in the console but should never leak into the popup or the on-page
// card — a user doesn't know what "Refresh returned 401" or "Proxy returned
// 502" means. We OVERRIDE the codes whose raw text is technical/leaky, and PASS
// THROUGH the ones that are already friendly and actionable (e.g. "add your Groq
// key", "Out of credits", "X rejected the API key") so we don't lose useful,
// provider-specific guidance.
//
// Used by the on-page error card (contents/linkedin.ts) and the popup's
// sign-in error line. Both rewrite error codes (RewriteErrorCode) and auth
// codes (AuthErrorCode) are keyed here; the sets don't collide.

// Codes whose generated message reads like an internal/technical string and
// should be replaced with calm, plain copy. UNAUTHORIZED is deliberately NOT
// here: in the BYOK path it means "your API key was rejected" (the provider
// message is already good), and the session-expiry case is rewritten to
// friendly copy at its source (lib/proxy.ts, lib/account.ts).
const OVERRIDES: Record<string, string> = {
  HTTP: "linkedn't hit a snag on our end. Tap Retry in a moment.",
  NETWORK: "Connection problem — check your internet and tap Retry.",
  RATE_LIMITED: "Going a little fast — wait a few seconds, then Retry.",
  PROVIDER_UNKNOWN:
    "That provider isn't available right now. Pick another in settings.",
  PROXY_UNAVAILABLE:
    "linkedn't is briefly unavailable. Try again shortly, or switch to Bring-your-own-key.",
  EMPTY: "The model returned nothing usable. Tap Retry.",
  // Auth (popup sign-in) codes:
  OAUTH_ERROR: "Couldn't complete sign-in. Please try again.",
  NO_TOKENS: "Sign-in didn't finish. Please try again.",
  REFRESH_FAILED: "Your session expired — sign in again.",
  NOT_CONFIGURED: "Sign-in isn't available right now.",
};

/**
 * Turn an internal (code, rawMessage) pair into user-facing copy.
 *
 * - If the code has a prod-safe override, use it (hides HTTP codes / provider
 *   internals / network stack strings).
 * - Otherwise return the raw message as-is — it's one of the already-friendly,
 *   actionable ones (NO_API_KEY, TOO_SHORT, INSUFFICIENT_CREDITS, TIMEOUT,
 *   UNAUTHORIZED, USER_CANCELLED, the UNEXPECTED catch-all, …).
 * - Empty raw + unknown code falls back to a generic line.
 */
export function userFacingError(
  code: string | undefined,
  rawMessage: string,
): string {
  if (code && OVERRIDES[code]) return OVERRIDES[code];
  return rawMessage?.trim() || "Something went wrong. Tap Retry.";
}
