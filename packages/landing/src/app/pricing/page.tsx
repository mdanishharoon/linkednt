"use client";

import Link from "next/link";
import { useState } from "react";

// Pricing page — driven by PACKS. Each pack has a Polar product id from the
// dashboard. The Buy button POSTs to our Supabase edge function
// /create-polar-checkout with { productId, userId, credits }; that fn calls
// Polar's API to create a checkout session with metadata baked in and
// returns the session URL. We then redirect the browser there.
//
// Going through the API (instead of constructing a static buy.polar.sh
// URL) is the only reliable way to attach per-request metadata — the
// dashboard's Checkout Link URLs require pre-configured metadata
// templates, which we don't have because user_id varies per checkout.
//
// On payment, Polar fires order.paid → /polar-webhook reads the same
// metadata and inserts a credits_ledger row.

interface Pack {
  id: string;
  label: string;
  priceUsd: number;
  credits: number;
  /** Polar product id from the dashboard. Empty string disables the Buy
   *  button. */
  polarProductId: string;
  highlight?: string;
  blurb: string;
}

const PACKS: Pack[] = [
  {
    id: "unemployed",
    label: "Unemployed",
    priceUsd: 4,
    credits: 1800,
    polarProductId: "e3780aaa-6f49-4923-8b99-772da323eeab",
    blurb:
      "1,800 credits. Roughly 1,800 Strips, 900 Dry Translators, or 600 Internal Monologues. A couple months of casual feed-cleaning.",
  },
  {
    id: "open-to-work",
    label: "Open to Work",
    priceUsd: 6,
    credits: 3000,
    polarProductId: "efa662f9-70c8-4d8b-9976-1b0df7f7a1db",
    blurb:
      "3,000 credits. For the person who has a lot of thoughts about other people's journeys.",
  },
  {
    id: "thought-leader",
    label: "Thought Leader",
    priceUsd: 9,
    credits: 5000,
    polarProductId: "4032d550-a0ee-475b-9c09-dbb7a542243b",
    highlight: "Best value · 18% off",
    blurb:
      "5,000 credits. The pack for someone who truly understands the LinkedIn ecosystem. Credits never expire.",
  },
];

// Plumbed via NEXT_PUBLIC_* env (set in GitHub Actions Variables; mirrored
// into the build). The anon key is fine to ship — RLS is enforced at the
// database level and the create-polar-checkout function is set
// verify_jwt=false anyway.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://gmzisvcyvjrsjrovvysz.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

async function startCheckout(pack: Pack, userId: string): Promise<string> {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/create-polar-checkout`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        productId: pack.polarProductId,
        userId,
        credits: pack.credits,
      }),
    },
  );
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(data?.error ?? `Checkout returned ${res.status}.`);
  }
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("Checkout response missing url.");
  return data.url;
}

export default function PricingPage() {
  // Read once during lazy init; window is undefined on the SSR pass so we
  // start as null and pick up the real value on the client render.
  const [userId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("user_id");
  });
  const [busyPackId, setBusyPackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy(pack: Pack) {
    if (!userId) return;
    setBusyPackId(pack.id);
    setError(null);
    try {
      const url = await startCheckout(pack, userId);
      // .assign() is the method form — the eslint immutability rule rejects
      // the equivalent `window.location.href = url` even though it's a
      // standard browser API.
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setBusyPackId(null);
    }
  }

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
            <strong>Open the extension popup first</strong> — click the
            &ldquo;Buy credits&rdquo; pill. The popup hands your account id
            through so the credits land in the right place.
          </p>
        )}
        {userId && (
          <p className="pricing-account">
            Buying credits for{" "}
            <code className="pricing-code">{userId.slice(0, 8)}…</code>
          </p>
        )}
        {error && (
          <p className="pricing-error" role="alert">
            {error}
          </p>
        )}
      </header>

      <section className="pack-grid" aria-label="Credit packs">
        {PACKS.map((pack) => {
          const available = pack.polarProductId !== "";
          const buyable = available && !!userId;
          const busy = busyPackId === pack.id;
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
              <button
                type="button"
                className={`pack-buy ${!buyable ? "is-disabled" : ""}`}
                disabled={!buyable || busy}
                onClick={() => void handleBuy(pack)}
              >
                {busy
                  ? "Opening checkout…"
                  : !available
                    ? "Coming soon"
                    : !userId
                      ? "Open popup to buy"
                      : `Buy ${pack.label} →`}
              </button>
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
