// Supabase OAuth client for the linkednt extension.
//
// Sign-in flow (implicit; one round-trip, no PKCE bookkeeping):
//   1. signInWithGoogle() builds the Supabase /auth/v1/authorize URL with
//      redirect_to pointing at the linkednt landing's /auth/callback/ page
//      and ?ext=<this-extension-id> appended.
//   2. chrome.identity.launchWebAuthFlow opens that URL in a system tab.
//      User signs in with Google → Supabase redirects to the relay page.
//   3. The relay page bounces to https://<extId>.chromiumapp.org/#access_token=...
//      Chrome intercepts the chromiumapp.org navigation and resolves
//      launchWebAuthFlow with that final URL.
//   4. We parse the URL hash → { access_token, refresh_token, expires_in,
//      user } → store under chrome.storage.local["auth.session"].
//
// getAccessToken() returns a valid JWT, refreshing via the Supabase token
// endpoint when within 60s of expiry. Used by the rewrite background handler
// before each /rewrite proxy call.

const LOG = "[linkednt:auth]";

const SUPABASE_URL = process.env.PLASMO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SITE_URL =
  process.env.PLASMO_PUBLIC_SITE_URL ?? "https://linkednt.pages.dev";

const SESSION_KEY = "auth.session";
const REFRESH_LEEWAY_MS = 60_000;

export interface SessionUser {
  id: string;
  email: string | null;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  /** ms since epoch. */
  expiresAt: number;
  user: SessionUser;
}

export type AuthResult =
  | { ok: true; session: Session }
  | { ok: false; code: AuthErrorCode; error: string };

export type AuthErrorCode =
  | "NOT_CONFIGURED"
  | "USER_CANCELLED"
  | "NO_TOKENS"
  | "REFRESH_FAILED"
  | "OAUTH_ERROR"
  | "NETWORK";

export async function signInWithGoogle(): Promise<AuthResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      error: "Backend isn't configured in this build.",
    };
  }

  const extensionId = chrome.runtime.id;
  const redirectTo = `${SITE_URL}/auth/callback/?ext=${extensionId}`;
  const authUrl =
    `${SUPABASE_URL}/auth/v1/authorize` +
    `?provider=google` +
    `&flow_type=implicit` +
    `&redirect_to=${encodeURIComponent(redirectTo)}`;

  let finalUrl: string | undefined;
  try {
    finalUrl = await new Promise<string | undefined>((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        (responseUrl) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            reject(new Error(lastError.message ?? "launchWebAuthFlow failed"));
            return;
          }
          resolve(responseUrl);
        },
      );
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/cancel|closed/i.test(msg)) {
      return { ok: false, code: "USER_CANCELLED", error: "Sign-in cancelled." };
    }
    console.warn(`${LOG} launchWebAuthFlow rejected`, { msg });
    return { ok: false, code: "OAUTH_ERROR", error: msg };
  }

  if (!finalUrl) {
    return {
      ok: false,
      code: "USER_CANCELLED",
      error: "Sign-in window closed before completing.",
    };
  }

  const parsed = parseAuthRedirect(finalUrl);
  if (!parsed.ok) return parsed;

  const session: Session = {
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken,
    expiresAt: Date.now() + parsed.expiresInSec * 1000,
    user: decodeUserFromJwt(parsed.accessToken),
  };
  await chrome.storage.local.set({ [SESSION_KEY]: session });
  console.info(`${LOG} signed in`, { userId: session.user.id });
  return { ok: true, session };
}

export async function signOut(): Promise<void> {
  const session = await getSession();
  await chrome.storage.local.remove(SESSION_KEY);
  console.info(`${LOG} signed out`, { userId: session?.user.id });
  if (session) {
    // Best-effort revoke; ignore errors.
    void fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
      },
    }).catch(() => {});
  }
}

export async function getSession(): Promise<Session | null> {
  const raw = await chrome.storage.local.get(SESSION_KEY);
  const s = raw[SESSION_KEY] as Session | undefined;
  return s ?? null;
}

/**
 * Returns a valid access token, refreshing if within the leeway window.
 * Returns null when there's no session at all.
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;

  if (session.expiresAt - Date.now() > REFRESH_LEEWAY_MS) {
    return session.accessToken;
  }

  const refreshed = await refreshSession(session.refreshToken);
  if (!refreshed.ok) {
    console.warn(`${LOG} refresh failed → signing out`, {
      code: refreshed.code,
    });
    await chrome.storage.local.remove(SESSION_KEY);
    return null;
  }
  return refreshed.session.accessToken;
}

async function refreshSession(refreshToken: string): Promise<AuthResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      error: "Backend isn't configured.",
    };
  }

  let res: Response;
  try {
    res = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
    );
  } catch (err) {
    return {
      ok: false,
      code: "NETWORK",
      error: err instanceof Error ? err.message : "Network error.",
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      code: "REFRESH_FAILED",
      error: `Refresh returned ${res.status}.`,
    };
  }

  const data = (await res.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user?: { id?: string; email?: string };
  } | null;

  if (
    !data?.access_token ||
    !data.refresh_token ||
    typeof data.expires_in !== "number"
  ) {
    return {
      ok: false,
      code: "REFRESH_FAILED",
      error: "Refresh response missing tokens.",
    };
  }

  const session: Session = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    user: data.user?.id
      ? { id: data.user.id, email: data.user.email ?? null }
      : decodeUserFromJwt(data.access_token),
  };
  await chrome.storage.local.set({ [SESSION_KEY]: session });
  return { ok: true, session };
}

// ---- helpers ----

type Parsed =
  | {
      ok: true;
      accessToken: string;
      refreshToken: string;
      expiresInSec: number;
    }
  | { ok: false; code: AuthErrorCode; error: string };

function parseAuthRedirect(url: string): Parsed {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, code: "NO_TOKENS", error: "Invalid redirect URL." };
  }

  // Supabase errors show up in the query string when OAuth itself failed.
  const errDesc = u.searchParams.get("error_description");
  const err = u.searchParams.get("error");
  if (errDesc || err) {
    return {
      ok: false,
      code: "OAUTH_ERROR",
      error: errDesc ?? err ?? "OAuth error",
    };
  }

  const hash = u.hash.startsWith("#") ? u.hash.slice(1) : u.hash;
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const expiresIn = params.get("expires_in");

  if (!accessToken || !refreshToken || !expiresIn) {
    return {
      ok: false,
      code: "NO_TOKENS",
      error: "Sign-in completed but no tokens were returned.",
    };
  }
  return {
    ok: true,
    accessToken,
    refreshToken,
    expiresInSec: Number(expiresIn) || 3600,
  };
}

function decodeUserFromJwt(jwt: string): SessionUser {
  try {
    const payload = jwt.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json) as { sub?: string; email?: string };
    return { id: claims.sub ?? "", email: claims.email ?? null };
  } catch {
    return { id: "", email: null };
  }
}
