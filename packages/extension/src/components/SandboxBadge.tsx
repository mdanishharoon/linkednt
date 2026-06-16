import { IS_PRODUCTION, SITE_URL, SUPABASE_REF } from "~lib/supabase-config";

// Permanent, env-gated marker that this extension build targets a
// non-production (sandbox/dev) backend. Mirrors the landing DevBanner.
//
// Gated on IS_PRODUCTION (derived from the resolved Supabase target, not a
// branch or a separate env var), so the prod/Web-Store build renders null. It
// is therefore safe to keep on every branch INCLUDING main — it can never
// appear in production, so there's nothing to "remember not to merge."
//
// Anchored bottom-right with pointerEvents:none so it never covers or
// intercepts a click on the popup UI (the ⚙ settings button is top-right).
export function SandboxBadge() {
  if (IS_PRODUCTION) return null;

  return (
    <div
      role="status"
      aria-label={`Sandbox build — Supabase ${SUPABASE_REF}, site ${SITE_URL}`}
      title={`SANDBOX build\nSupabase: ${SUPABASE_REF}\nSite: ${SITE_URL}`}
      style={{
        position: "fixed",
        bottom: 8,
        right: 8,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 8px",
        background: "#FEF3C7",
        color: "#7C2D12",
        border: "1px solid #B45309",
        borderRadius: 999,
        font: "700 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace",
        letterSpacing: "0.04em",
        boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: "#B45309",
        }}
      />
      SANDBOX
    </div>
  );
}
