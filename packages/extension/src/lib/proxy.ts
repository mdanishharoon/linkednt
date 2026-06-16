// Thin client for calling the Supabase edge function `/rewrite`.
//
// Auth is the long-pole here. Until phase 4 (Google OAuth via PKCE) lands,
// there's no user session JWT — the edge fn returns 401 → we surface
// PROXY_UNAVAILABLE in the popup. Once auth is wired, we read the session
// from chrome.storage and pass it as the Authorization header.

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config";
import type { Mode, RewriteResponse } from "./types";

const LOG = "[linkednt:proxy]";
// Generous client-side timeout — Sonnet 4.6 on a 4-sentence roast can run
// 15-20s on a bad day. The edge fn runs to completion regardless of client
// abort, writes the cache, and an idempotency guard prevents double-charging
// when a retry hits that cache. So this timeout is purely a UX backstop, not
// a circuit breaker.
const PROXY_TIMEOUT_MS = 25_000;

export interface ProxyCallArgs {
  text: string;
  mode: Mode;
  /** Supabase access_token from the user's session. Empty string when
   *  the user isn't signed in — fn returns 401 in that case. */
  sessionJwt: string;
}

export async function callProxyRewrite(
  args: ProxyCallArgs,
): Promise<RewriteResponse> {
  if (!args.sessionJwt) {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      error: "Sign in to use credits. Switch to Bring own key for now.",
    };
  }

  const startedAt = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/rewrite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${args.sessionJwt}`,
      },
      body: JSON.stringify({ text: args.text, mode: args.mode }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn(`${LOG} request timed out after ${PROXY_TIMEOUT_MS}ms`);
      return {
        ok: false,
        code: "TIMEOUT",
        error: "Server took too long — tap Retry to try again.",
      };
    }
    console.error(`${LOG} fetch threw`, err);
    return {
      ok: false,
      code: "NETWORK",
      error: err instanceof Error ? err.message : "Network request failed.",
    };
  } finally {
    clearTimeout(timeoutId);
  }

  const ms = Math.round(performance.now() - startedAt);
  const data = (await response
    .json()
    .catch(() => null)) as RewriteResponse | null;

  console.info(`${LOG} response`, { status: response.status, ms });

  if (!data) {
    return {
      ok: false,
      code: "HTTP",
      error: `Proxy returned ${response.status}.`,
    };
  }
  // A post-fetch 401 means the server rejected a JWT we DID send — i.e. the
  // session expired mid-use (the no-session case returns early above). Rewrite
  // the server's terse "Invalid session." into actionable copy.
  if (!data.ok && data.code === "UNAUTHORIZED") {
    return {
      ok: false,
      code: "UNAUTHORIZED",
      error: "Your session expired — open linkedn't and sign in again.",
    };
  }
  return data;
}
