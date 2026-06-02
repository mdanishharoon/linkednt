// Thin client for calling the Supabase edge function `/rewrite`.
//
// Auth is the long-pole here. Until phase 4 (Google OAuth via PKCE) lands,
// there's no user session JWT — the edge fn returns 401 → we surface
// PROXY_UNAVAILABLE in the popup. Once auth is wired, we read the session
// from chrome.storage and pass it as the Authorization header.

import type { Mode, RewriteResponse } from "./types";

const SUPABASE_URL = process.env.PLASMO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY ?? "";

const LOG = "[linkednt:proxy]";

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
    });
  } catch (err) {
    console.error(`${LOG} fetch threw`, err);
    return {
      ok: false,
      code: "NETWORK",
      error: err instanceof Error ? err.message : "Network request failed.",
    };
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
  return data;
}
