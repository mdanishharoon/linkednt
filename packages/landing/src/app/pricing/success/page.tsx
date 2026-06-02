"use client";

import Link from "next/link";
import { useState } from "react";

// Polar redirects here after a successful checkout (success_url field on
// the create-polar-checkout API call). The actual credit grant happens
// asynchronously via the polar-webhook edge function, so this page is just
// a "thanks, head back to your feed" confirmation — there's nothing for
// the page to do other than reassure the user.

export default function PricingSuccessPage() {
  const [credits] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = new URLSearchParams(window.location.search).get("credits");
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  });

  return (
    <main className="pricing">
      <header className="pricing-header">
        <Link href="/" className="pricing-back" aria-label="Back to home">
          ← linkedn&rsquo;t
        </Link>
        <h1 className="pricing-title">Thanks ✨</h1>
        <p className="pricing-lede">
          {credits
            ? `${credits.toLocaleString()} credits are on the way to your account.`
            : "Your credits are on the way to your account."}{" "}
          They land within a few seconds once Polar confirms the payment —
          reopen the extension popup and you&rsquo;ll see the new balance.
        </p>
        <p className="pricing-account">
          Receipt + invoice will be emailed by Polar.
        </p>
      </header>

      <section style={{ textAlign: "center", marginTop: 16 }}>
        <a
          href="https://www.linkedin.com/feed/"
          target="_blank"
          rel="noreferrer"
          className="pack-buy"
          style={{ display: "inline-block", maxWidth: 320 }}
        >
          Back to your feed →
        </a>
      </section>
    </main>
  );
}
