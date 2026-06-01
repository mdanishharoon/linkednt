import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "linkedn't — see what they actually meant.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Required for `output: "export"`: tells Next.js to pre-render this OG image
// at build time as a static file (out/opengraph-image.png) instead of treating
// it as a dynamic route. Without this, Cloudflare Pages serves the page with
// an unresolved og:image meta tag and scrapers fall back to text-only previews.
export const dynamic = "force-static";

// OG card: the full linkedn't wordmark (see <Logo />) on the brand's warm
// feed-tint + dotted backdrop, with the hero tagline beneath it.
export default async function Image() {
  const [extrabold, medium] = await Promise.all([
    readFile(join(process.cwd(), "assets/PlusJakartaSans-ExtraBold.ttf")),
    readFile(join(process.cwd(), "assets/PlusJakartaSans-Medium.ttf")),
  ]);

  const S = 150; // wordmark size, matching <Logo size> proportions

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#F4F2EE",
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(20,25,30,0.06) 1px, transparent 0)",
        backgroundSize: "28px 28px",
        fontFamily: "Jakarta",
      }}
    >
      {/* wordmark */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: S * 0.13,
          fontWeight: 800,
          fontSize: S,
          lineHeight: 1,
          letterSpacing: -S * 0.025,
        }}
      >
        <span style={{ color: "#191D22" }}>linked</span>
        <span
          style={{
            display: "flex",
            alignItems: "baseline",
            background: "#2D64BC",
            color: "#fff",
            borderRadius: S * 0.26,
            padding: `${S * 0.07}px ${S * 0.2}px ${S * 0.1}px`,
          }}
        >
          n
          <span style={{ fontSize: S * 0.82, margin: `0 ${S * 0.01}px` }}>
            &rsquo;
          </span>
          t
        </span>
      </div>

      {/* tagline */}
      <div
        style={{
          marginTop: 52,
          fontFamily: "JakartaMedium",
          fontWeight: 500,
          fontSize: 46,
          color: "#3A454E",
          letterSpacing: "-0.02em",
        }}
      >
        See what they actually meant.
      </div>

      {/* subline */}
      <div
        style={{
          marginTop: 22,
          fontFamily: "JakartaMedium",
          fontWeight: 500,
          fontSize: 27,
          color: "#5E6B74",
          maxWidth: 760,
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        A free Chrome extension that translates LinkedIn slop into plain, honest
        English.
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Jakarta", data: extrabold, weight: 800, style: "normal" },
        { name: "JakartaMedium", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
