// linkednt /create-polar-checkout edge function.
//
// The /pricing page on the landing calls this when a Buy button is clicked.
// We create a Polar checkout session via their API with metadata.user_id +
// metadata.credits baked in, then return the URL for the browser to
// redirect to. Polar's webhook later fires order.paid → /polar-webhook
// reads the same metadata and credits the user.
//
// Going through the API (instead of constructing a static checkout URL) is
// the only way to reliably attach per-request metadata — Polar's
// dashboard-created Checkout Link URLs require pre-configured metadata
// templates, which we don't have because user_id varies per checkout.
//
// Security:
//   - verify_jwt: false (anon callable). Anyone calling this can only
//     create a checkout that credits a SPECIFIC user_id — if they pay,
//     that user gets the credits. There's no abuse vector beyond
//     "stranger paid for my credits", which is fine.
//   - Polar's own rate limits (and Supabase Edge Functions' per-IP) cap
//     casual spam.
//   - The Polar API token never leaves the server.
//
// Env vars (set via `supabase secrets set`):
//   - POLAR_ENV: "sandbox" (default) or "production". Defaulting to sandbox
//     means a missing/typoed env never accidentally moves real money — you
//     have to explicitly opt in to live charges. Switching this single var
//     swaps both the API base AND the credentials below, so test/live can
//     coexist as two sets of secrets and flipping is one command.
//   - POLAR_ACCESS_TOKEN         — live org token (used when POLAR_ENV=production)
//   - POLAR_SANDBOX_TOKEN        — sandbox org token (used when POLAR_ENV=sandbox)
//
// Tokens are env-specific: sandbox tokens 401 against the live API and
// vice versa, so the lookup order is keyed on POLAR_ENV.

import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const LOG = "[linkednt:fn:create-polar-checkout]";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const POLAR_ENV = (Deno.env.get("POLAR_ENV") ?? "sandbox").toLowerCase();
const IS_PRODUCTION = POLAR_ENV === "production";
const POLAR_API_BASE = IS_PRODUCTION
  ? "https://api.polar.sh"
  : "https://sandbox-api.polar.sh";
const POLAR_API = `${POLAR_API_BASE}/v1/checkouts/`;
const POLAR_TOKEN_ENV = IS_PRODUCTION
  ? "POLAR_ACCESS_TOKEN"
  : "POLAR_SANDBOX_TOKEN";

const requestSchema = z.object({
  productId: z.string().uuid(),
  userId: z.string().uuid(),
  credits: z.number().int().positive().max(1_000_000),
  customerEmail: z.string().email().optional(),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

console.info(`${LOG} boot`, { env: POLAR_ENV, apiBase: POLAR_API_BASE });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const token = Deno.env.get(POLAR_TOKEN_ENV);
  if (!token) {
    console.error(`${LOG} missing ${POLAR_TOKEN_ENV}`, { env: POLAR_ENV });
    return json({ error: "Server misconfigured" }, 500);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Invalid body", issues: parsed.error.flatten() }, 400);
  }
  const { productId, userId, credits, customerEmail } = parsed.data;

  // Polar's Checkout API supports an array of products on a single session,
  // but we only ever offer one pack per click.
  const polarBody = {
    products: [productId],
    metadata: {
      user_id: userId,
      // Polar stringifies metadata values, so encode credits as a string
      // (the webhook fn parses it back to number).
      credits: String(credits),
    },
    customer_email: customerEmail,
    success_url: `https://linkednt.com/pricing/success?credits=${credits}`,
    embed_origin: "https://linkednt.com",
  };

  let res: Response;
  try {
    res = await fetch(POLAR_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(polarBody),
    });
  } catch (err) {
    console.error(`${LOG} polar fetch threw`, err);
    return json({ error: "Polar request failed" }, 502);
  }

  if (!res.ok) {
    const text = await res.text();
    console.warn(`${LOG} polar non-2xx`, { status: res.status, text });
    return json({ error: "Polar checkout failed", status: res.status }, 502);
  }

  const data = (await res.json().catch(() => null)) as {
    url?: string;
    id?: string;
  } | null;
  if (!data?.url) {
    console.warn(`${LOG} polar response missing url`, data);
    return json({ error: "Polar response missing url" }, 502);
  }

  console.info(`${LOG} created`, {
    checkoutId: data.id,
    userId,
    credits,
    productId,
  });
  return json({ url: data.url });
});
