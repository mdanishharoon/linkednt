"use client";

import { useEffect, useState } from "react";

// OAuth relay for the linkednt extension.
//
// Flow:
//   1. Extension calls chrome.identity.launchWebAuthFlow → opens Supabase
//      OAuth with redirectTo set to this page + ?ext=<extensionId>.
//   2. Supabase signs the user in, then redirects back here with the
//      session in the URL hash (#access_token=...&refresh_token=...).
//   3. This page bounces to https://<extensionId>.chromiumapp.org/#<hash>,
//      which Chrome's identity API intercepts → resolves launchWebAuthFlow
//      with that final URL → extension reads the tokens.
//
// The ext id is validated against the Chrome extension ID alphabet (a-p,
// length 32) so a malicious link can't redirect to an arbitrary host.

const EXT_ID_RE = /^[a-p]{32}$/;

// `pending` is the SSR/build-time placeholder; resolved to one of the other
// kinds on the client during the lazy useState init.
type Status =
  | { kind: "pending" }
  | { kind: "bouncing"; redirectTo: string }
  | { kind: "fallback"; reason: string }
  | { kind: "error"; message: string };

function resolveStatus(): Status {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash;

  const oauthError = params.get("error_description") ?? params.get("error");
  if (oauthError) {
    return { kind: "error", message: oauthError };
  }

  const ext = params.get("ext") ?? "";
  if (!EXT_ID_RE.test(ext)) {
    return {
      kind: "fallback",
      reason:
        "This page is the sign-in relay for the linkedn't extension. Open it from the extension's Sign in button.",
    };
  }

  if (!hash || !hash.includes("access_token")) {
    return {
      kind: "fallback",
      reason: "No session was returned. Try signing in again.",
    };
  }

  return {
    kind: "bouncing",
    redirectTo: `https://${ext}.chromiumapp.org/${hash}`,
  };
}

export default function AuthCallbackPage() {
  const [status] = useState<Status>(() => {
    if (typeof window === "undefined") return { kind: "pending" };
    return resolveStatus();
  });

  useEffect(() => {
    if (status.kind === "bouncing") {
      window.location.replace(status.redirectTo);
    }
  }, [status]);

  const isLoading = status.kind === "pending" || status.kind === "bouncing";

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "48px 24px",
        background: "var(--feed)",
      }}
    >
      <div
        suppressHydrationWarning
        style={{
          maxWidth: 460,
          width: "100%",
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: 16,
          padding: "32px 28px",
          boxShadow: "var(--shadow-md)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jakarta)",
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            marginBottom: 6,
          }}
        >
          linkedn&apos;t
        </div>

        {isLoading && (
          <>
            <h1
              style={{
                margin: "12px 0 8px",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.015em",
              }}
            >
              Signing you in…
            </h1>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>
              Handing the session back to the extension.
            </p>
          </>
        )}

        {status.kind === "fallback" && (
          <>
            <h1
              style={{
                margin: "12px 0 8px",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.015em",
              }}
            >
              Nothing to do here
            </h1>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>
              {status.reason}
            </p>
          </>
        )}

        {status.kind === "error" && (
          <>
            <h1
              style={{
                margin: "12px 0 8px",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.015em",
                color: "#b3261e",
              }}
            >
              Sign-in failed
            </h1>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>
              {status.message}
            </p>
          </>
        )}

        <p
          style={{
            marginTop: 24,
            fontSize: 12.5,
            color: "var(--muted-2)",
          }}
        >
          You can close this tab.
        </p>
      </div>
    </main>
  );
}
