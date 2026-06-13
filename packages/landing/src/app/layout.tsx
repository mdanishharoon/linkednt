import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { DevBanner } from "../components/DevBanner";

// The body runs on the native system grotesk (see --sans in globals.css) to sit
// in LinkedIn's uncanny valley. Plus Jakarta Sans is used only for the wordmark
// and the "n't" badge — exposed as --font-jakarta and referenced inline there.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

// metadataBase MUST be an absolute URL so OG/Twitter scrapers can resolve the
// image. Cloudflare Pages doesn't set VERCEL_URL, so we fall back to the
// production Cloudflare domain. Override at build time with NEXT_PUBLIC_SITE_URL
// (e.g. `NEXT_PUBLIC_SITE_URL=https://linkednt.com bun run build`).
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  "https://linkednt.com";

const TITLE = "linkedn't — see what they actually meant";
const DESCRIPTION =
  "linkedn't quietly rewrites LinkedIn posts into plain, honest English. The humblebrags, the “thrilled to announce,” the 4am gratitude threads — translated, one click at a time.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  // og:image / twitter:image are supplied automatically by app/opengraph-image.tsx
  openGraph: {
    type: "website",
    url: "/",
    siteName: "linkedn't",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        {children}
        <DevBanner />
      </body>
    </html>
  );
}
