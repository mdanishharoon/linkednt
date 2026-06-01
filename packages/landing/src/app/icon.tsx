import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Favicon = the "n't" badge from the linkedn't wordmark — blue rounded square,
// white text with the small raised apostrophe (mirrors <MiniBadge />).
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Force static pre-render at build time for `output: "export"`. Without this,
// the favicon route is treated as dynamic and is missing from the Cloudflare
// static build output.
export const dynamic = "force-static";

export default async function Icon() {
  const jakarta = await readFile(
    join(process.cwd(), "assets/PlusJakartaSans-ExtraBold.ttf"),
  );

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#2D64BC",
        color: "#fff",
        borderRadius: 15,
        fontFamily: "Jakarta",
        fontWeight: 800,
        fontSize: 40,
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", marginTop: 3 }}>
        n<span style={{ fontSize: 31, margin: "0 0.5px" }}>&rsquo;</span>t
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Jakarta", data: jakarta, weight: 800, style: "normal" }],
    },
  );
}
