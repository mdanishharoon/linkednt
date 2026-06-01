import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages serves a fully static build. `output: "export"` makes
  // Next.js emit /out/ with everything pre-rendered at build time (incl.
  // the OG image and favicon from opengraph-image.tsx + icon.tsx).
  output: "export",

  // Required when output:"export". next/image's default loader needs a server;
  // unoptimized makes <Image> emit a plain <img>.
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },

  // Cloudflare Pages serves /foo/ → /foo/index.html. Trailing slashes match
  // that routing so clean URLs work without /_next rewrites.
  trailingSlash: true,
};

export default nextConfig;
