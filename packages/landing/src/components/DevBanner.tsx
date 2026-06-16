// Permanent, unmissable marker that a build is NOT production. Renders a fixed
// corner badge showing the deploy env + the wired Supabase project and Polar
// product UUIDs, so sandbox/dev deploys are obvious at a glance and the
// env-specific config is verifiable without opening devtools.
//
// This is safe to keep on every branch INCLUDING main: it's gated on
// NEXT_PUBLIC_POLAR_ENV and returns null for the production build, so it can
// never leak onto linkednt.com. Don't branch-fork it — let the env decide.
//
// All values are NEXT_PUBLIC_* inlined at build time (already public; no
// secrets here — the anon key and product ids ship in the client bundle
// regardless).

const ENV = process.env.NEXT_PUBLIC_POLAR_ENV ?? "local";

const SUPABASE_REF = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .replace(/^https?:\/\//, "")
  .split(".")[0];

const PRODUCTS: [string, string | undefined][] = [
  ["Unemployed", process.env.NEXT_PUBLIC_POLAR_PRODUCT_UNEMPLOYED],
  ["Open to Work", process.env.NEXT_PUBLIC_POLAR_PRODUCT_OPEN_TO_WORK],
  ["Thought Leader", process.env.NEXT_PUBLIC_POLAR_PRODUCT_THOUGHT_LEADER],
];

export function DevBanner() {
  // Hard gate: the production build never renders this.
  if (ENV === "production") return null;

  return (
    <aside
      aria-label="Non-production build notice"
      style={{
        position: "fixed",
        bottom: "12px",
        left: "12px",
        zIndex: 9999,
        maxWidth: "min(92vw, 420px)",
        padding: "8px 12px",
        background: "#FEF3C7",
        color: "#1F2937",
        border: "1px solid #B45309",
        borderRadius: "8px",
        boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
        font: "12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      <div style={{ fontWeight: 700, letterSpacing: "0.02em" }}>
        ⚠ {ENV.toUpperCase()} BUILD — not production
      </div>
      <div style={{ marginTop: "4px", opacity: 0.85 }}>
        env=<b>{ENV}</b> · db=<b>{SUPABASE_REF || "—"}</b>
      </div>
      <div style={{ marginTop: "2px", opacity: 0.85 }}>
        {PRODUCTS.map(([label, id]) => (
          <div key={label}>
            {label}: <b>{id ?? "unset"}</b>
          </div>
        ))}
      </div>
    </aside>
  );
}
