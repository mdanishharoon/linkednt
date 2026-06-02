// Render the "n't" badge from app/icon.tsx as PNGs and write them to
// packages/extension/assets/. Plasmo's icon pipeline desaturates
// assets/icon.png when it auto-generates the 16/32/48/128 manifest icons
// for the action toolbar (Chrome's monochrome-icon convention) so we
// emit per-size PNGs directly. Plasmo uses those as-is without colour
// mangling, keeping the toolbar icon blue.
//
// Run: bun run --filter '@linkednt/landing' export-extension-icon
//
// Re-run any time the badge design in app/icon.tsx changes so the toolbar
// icon and the favicon stay in sync.

import { Resvg } from "@resvg/resvg-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import satori from "satori";

// 16/32/48/128 are Chrome's manifest icon sizes; 512 is the master/fallback.
const SIZES = [16, 32, 48, 128, 512] as const;

const ROOT = new URL("..", import.meta.url).pathname;
const OUTPUT_DIR = join(ROOT, "..", "..", "packages", "extension", "assets");

function outputPath(size: number): string {
  return join(OUTPUT_DIR, size === 512 ? "icon.png" : `icon${size}.png`);
}

async function renderAt(size: number, jakarta: Buffer) {
  const svg = await satori(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#2D64BC",
        color: "#fff",
        // Scale the corner radius with size so the badge keeps the same
        // visual proportions as the 64x64 favicon (15/64 ≈ 0.234).
        borderRadius: Math.max(2, Math.round(size * (15 / 64))),
        fontFamily: "Jakarta",
        fontWeight: 800,
        fontSize: Math.max(8, Math.round(size * (40 / 64))),
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          marginTop: Math.max(0, Math.round(size * (3 / 64))),
        }}
      >
        n
        <span
          style={{
            fontSize: Math.max(6, Math.round(size * (31 / 64))),
            margin: `0 ${size * (0.5 / 64)}px`,
          }}
        >
          &rsquo;
        </span>
        t
      </div>
    </div>,
    {
      width: size,
      height: size,
      fonts: [{ name: "Jakarta", data: jakarta, weight: 800, style: "normal" }],
    },
  );

  const png = new Resvg(svg, { fitTo: { mode: "width", value: size } })
    .render()
    .asPng();
  const out = outputPath(size);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, png);
  console.info(`wrote ${out} (${png.byteLength} bytes, ${size}x${size})`);
}

async function main() {
  const jakarta = await readFile(
    join(ROOT, "assets/PlusJakartaSans-ExtraBold.ttf"),
  );
  for (const size of SIZES) {
    await renderAt(size, jakarta);
  }
}

await main();
