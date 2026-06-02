"use client";

import Link from "next/link";
import { useState } from "react";

// Pricing page — driven entirely by the PACKS array. Each pack has a Polar
// product id (filled in after creating the products in the Polar dashboard).
// The Buy button builds a Polar Checkout URL with our metadata baked in:
//
//   https://buy.polar.sh/<productId>?metadata[user_id]=<uid>&metadata[credits]=<n>
//
// The polar-webhook edge function reads that metadata on `order.paid` and
// inserts a credits_ledger row for user_id with delta = credits.

interface Pack {
  id: string;
  label: string;
  priceUsd: number;
  credits: number;
  /** Replace with the real Polar product id after creating it in the Polar
   *  dashboard. While empty, the Buy button is disabled and shows a
   *  "Coming soon" badge. */
  polarProductId: string;
  highlight?: string;
  blurb: string;
}

const PACKS: Pack[] = [
  {
    id: "starter",
    label: "Starter",
    priceUsd: 5,
    credits: 500,
    polarProductId: "",
    blurb:
      "Enough for about 330 rewrites across the three voices. Good for trying the paid path without commitment.",
  },
  {
    id: "pro",
    label: "Pro",
    priceUsd: 20,
    credits: 2500,
    polarProductId: "",
    highlight: "Best value · 25% bonus",
    blurb:
      "Heavier feed-cleaning. About 1,600 rewrites. Credits never expire and stack on top of any free trial you have left.",
  },
];

function buildCheckoutUrl(pack: Pack, userId: string | null): string | null {
  if (!pack.polarProductId) return null;
  const base = `https://buy.polar.sh/${pack.polarProductId}`;
  if (!userId) return base;
  const params = new URLSearchParams();
  params.set("metadata[user_id]", userId);
  params.set("metadata[credits]", String(pack.credits));
  return `${base}?${params.toString()}`;
}

export default function PricingPage() {
  // Read once during lazy init; window is undefined on the SSR pass so we
  // start as null and pick up the real value on the client render. Avoids
  // the react-hooks/set-state-in-effect rule that fires on the more
  // obvious useEffect + setState pattern.
  const [userId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("user_id");
  });

  return (
    <main className="pricing">
      <header className="pricing-header">
        <Link href="/" className="pricing-back" aria-label="Back to home">
          ← linkedn&rsquo;t
        </Link>
        <h1 className="pricing-title">Credits</h1>
        <p className="pricing-lede">
          One credit ≈ one rewrite, give or take the voice you pick. Strip is 1
          credit, Dry Translator is 2, Internal Monologue is 3 (it&rsquo;s the
          most expensive model under the hood).
        </p>
        {!userId && (
          <p className="pricing-signin">
            <strong>Open the extension popup first</strong> — click the gear,
            then &ldquo;Buy credits&rdquo;. The popup hands your account id
            through so the credits land in the right place.
          </p>
        )}
        {userId && (
          <p className="pricing-account">
            Buying credits for{" "}
            <code className="pricing-code">{userId.slice(0, 8)}…</code>
          </p>
        )}
      </header>

      <section className="pack-grid" aria-label="Credit packs">
        {PACKS.map((pack) => {
          const url = buildCheckoutUrl(pack, userId);
          const available = pack.polarProductId !== "";
          const buyable = available && userId;
          return (
            <article
              key={pack.id}
              className={`pack ${pack.highlight ? "pack-featured" : ""}`}
            >
              {pack.highlight && (
                <span className="pack-flag">{pack.highlight}</span>
              )}
              <h2 className="pack-label">{pack.label}</h2>
              <div className="pack-price">
                <span className="pack-price-amt">${pack.priceUsd}</span>
                <span className="pack-price-unit">one-time</span>
              </div>
              <div className="pack-credits">
                <strong>{pack.credits.toLocaleString()}</strong> credits
              </div>
              <p className="pack-blurb">{pack.blurb}</p>
              {buyable ? (
                <a
                  className="pack-buy"
                  href={url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buy {pack.label} →
                </a>
              ) : (
                <button className="pack-buy is-disabled" disabled type="button">
                  {available ? "Open popup to buy" : "Coming soon"}
                </button>
              )}
            </article>
          );
        })}
      </section>

      <p className="pricing-foot">
        Payments handled by Polar. Credits never expire. Refunds available
        within 14 days for unused credits —{" "}
        <a href="mailto:hi@linkednt.com">hi@linkednt.com</a>.
      </p>
    </main>
  );
}
