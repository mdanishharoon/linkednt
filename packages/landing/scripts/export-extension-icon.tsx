// Render the "n't" badge from app/icon.tsx as a 512x512 PNG and write it to
// packages/extension/assets/icon.png. Plasmo picks up that single high-res
// source and emits the manifest icon sizes (16/32/48/128) at build time.
//
// Run: bun run --filter '@linkednt/landing' export-extension-icon
//
// Re-run any time the badge design in app/icon.tsx changes so the toolbar
// icon and the favicon stay in sync.

import { Resvg } from "@resvg/resvg-js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import satori from "satori";

const SIZE = 512;

const ROOT = new URL("..", import.meta.url).pathname;
const OUTPUT = join(
  ROOT,
  "..",
  "..",
  "packages",
  "extension",
  "assets",
  "icon.png",
);

async function main() {
  const jakarta = await readFile(
    join(ROOT, "assets/PlusJakartaSans-ExtraBold.ttf"),
  );

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
        borderRadius: Math.round(SIZE * (15 / 64)),
        fontFamily: "Jakarta",
        fontWeight: 800,
        fontSize: Math.round(SIZE * (40 / 64)),
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          marginTop: Math.round(SIZE * (3 / 64)),
        }}
      >
        n
        <span
          style={{
            fontSize: Math.round(SIZE * (31 / 64)),
            margin: `0 ${SIZE * (0.5 / 64)}px`,
          }}
        >
          &rsquo;
        </span>
        t
      </div>
    </div>,
    {
      width: SIZE,
      height: SIZE,
      fonts: [{ name: "Jakarta", data: jakarta, weight: 800, style: "normal" }],
    },
  );

  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: SIZE },
  })
    .render()
    .asPng();

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, png);

  console.info(`wrote ${OUTPUT} (${png.byteLength} bytes, ${SIZE}x${SIZE})`);
}

await main();
