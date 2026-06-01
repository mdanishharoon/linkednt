// Logo.tsx — the wordmark: "linked" in ink, "n't" hijacking LinkedIn's blue badge.

const JAKARTA = "var(--font-jakarta), var(--sans)";

export function Logo({
  size = 24,
  dark = false,
  blue = "#2D64BC",
}: {
  size?: number;
  dark?: boolean;
  blue?: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.13,
        fontFamily: JAKARTA,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: -size * 0.025,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: dark ? "#fff" : "var(--ink)" }}>linked</span>
      <span
        style={{
          background: blue,
          color: "#fff",
          borderRadius: size * 0.26,
          padding: `${size * 0.07}px ${size * 0.2}px ${size * 0.1}px`,
          display: "inline-flex",
          alignItems: "baseline",
        }}
      >
        n
        <span style={{ fontSize: size * 0.82, margin: `0 ${size * 0.01}px` }}>
          &rsquo;
        </span>
        t
      </span>
    </span>
  );
}

export function MiniBadge() {
  return (
    <span
      style={{
        width: 25,
        height: 25,
        borderRadius: 7,
        background: "var(--blue)",
        display: "inline-flex",
        alignItems: "baseline",
        justifyContent: "center",
        color: "#fff",
        fontFamily: JAKARTA,
        fontWeight: 800,
        fontSize: 11,
        paddingTop: 6,
        boxSizing: "border-box",
        letterSpacing: "-.02em",
      }}
    >
      n<span style={{ fontSize: 8.5 }}>&rsquo;</span>t
    </span>
  );
}
