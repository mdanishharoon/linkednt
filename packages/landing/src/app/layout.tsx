import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { DevBanner } from "../components/DevBanner";
import { SITE_URL } from "@/lib/content";

// The body runs on the native system grotesk (see --sans in globals.css) to sit
// in LinkedIn's uncanny valley. Plus Jakarta Sans is used only for the wordmark
// and the "n't" badge — exposed as --font-jakarta and referenced inline there.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

// The title carries the query people actually type ("linkedin slop
// translator"); the brand tagline lives in the description instead.
const TITLE = "linkedn't — the LinkedIn slop translator";
const DESCRIPTION =
  "A free Chrome extension that translates LinkedIn slop into plain English. One click turns the humblebrags, the hustle-culture LARP and the corporate speak into what they actually meant.";

export const metadata: Metadata = {
  // metadataBase MUST be absolute so OG/Twitter scrapers can resolve the image
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "LinkedIn slop translator",
    "LinkedIn slop",
    "LinkedIn translator",
    "LinkedIn LARP",
    "corporate speak translator",
    "corporate jargon translator",
    "LinkedIn cringe",
    "LinkedIn parody",
    "LinkedIn satire",
    "deslop",
    "Chrome extension",
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
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
