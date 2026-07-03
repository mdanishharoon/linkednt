import { LandingPage } from "@/components/landing/LandingPage";
import { CWS_URL, FAQS, SITE_URL } from "@/lib/content";

// Structured data: the extension as a SoftwareApplication plus the on-page
// FAQ, so searches like "linkedin slop translator" get rich context.
const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "linkedn't",
    alternateName: "linkednt",
    applicationCategory: "BrowserApplication",
    operatingSystem: "Chrome",
    url: SITE_URL,
    installUrl: CWS_URL,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "A free Chrome extension that translates LinkedIn slop — humblebrags, hustle-culture LARP, corporate speak — into plain English, one post at a time.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  },
];

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <LandingPage />
    </>
  );
}
