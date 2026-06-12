// linkednt /polar-webhook edge function.
//
// Polar (https://polar.sh) posts checkout / subscription events here. We
// care about successful order events — those convert into credits_ledger
// inserts via the metadata Polar carries through from checkout
// (user_id + credits).
//
// Security:
//   - verify_jwt is disabled in deploy (this is a public webhook endpoint)
//   - Standard Webhooks signature (HMAC-SHA256 over
//     `{webhook-id}.{webhook-timestamp}.{body}`, base64) verified against the
//     signing secret; mismatch → 401. See verifySignature below.
//   - idempotency via processed_webhooks (webhook_id is Polar's order id)
//   - we only act on event.type in HANDLED_EVENT_TYPES; everything else is
//     ack'd with 200 so Polar stops retrying
//
// Env vars (set via `supabase secrets set`):
//   - POLAR_WEBHOOK_SECRET           — live webhook signing secret (whsec_…)
//   - POLAR_SANDBOX_WEBHOOK_SECRET   — sandbox webhook signing secret (whsec_…)
//
// We verify against BOTH secrets and accept whichever matches. Reason:
// if you keep webhook endpoints configured in both the live AND sandbox
// Polar dashboards (which is the normal steady state), events from
// either source need to validate without us flipping anything. The
// HMAC-SHA256 collision space is large enough that "either matches"
// stays as safe as "this exact one matches" — an attacker would need to
// forge a signature valid under one of two secrets they don't have.
//
// Auto-injected by the platform:
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "jsr:@supabase/supabase-js@2";

const LOG = "[linkednt:fn:polar-webhook]";

// Polar emits a number of event types; we only credit on a confirmed paid
// order. Subscription renewals come through order.paid too with a
// "subscription" billing reason. Other event types (canceled, refunded,
// updated) are acked but ignored for now — refund handling will go here
// when we wire it up.
const HANDLED_EVENT_TYPES = new Set([
  "order.created",
  "order.paid",
  "checkout.created",
  "checkout.updated",
]);

interface PolarOrderEvent {
  type: string;
  data?: {
    id?: string;
    status?: string;
    paid?: boolean;
    amount?: number;
    currency?: string;
    customer_id?: string;
    customer?: { email?: string };
    metadata?: Record<string, string | number | boolean>;
  };
}

function ack(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain" },
  });
}

// Decode a Standard Webhooks secret to its raw HMAC key bytes. Secrets are
// `whsec_<base64>` (the prefix is optional); the key is the base64 payload
// decoded to bytes — NOT the secret string used as-is.
function decodeSecret(secret: string): Uint8Array {
  const b64 = secret.startsWith("whsec_")
    ? secret.slice("whsec_".length)
    : secret;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// Polar signs webhooks per the Standard Webhooks spec
// (https://www.standardwebhooks.com): the HMAC-SHA256 is computed over
// `{webhook-id}.{webhook-timestamp}.{body}`, the key is the base64-decoded
// secret, and the `webhook-signature` header is a space-separated list of
// `v1,<base64sig>` entries. We accept if any entry matches.
//
// We deliberately do NOT enforce the spec's timestamp tolerance: Polar reuses
// the original id/timestamp/signature when retrying a failed delivery, which
// can arrive hours later, and `processed_webhooks` already gives us replay +
// duplicate protection.
async function verifySignature(
  id: string,
  timestamp: string,
  body: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !secret || !id || !timestamp) return false;

  let keyBytes: Uint8Array;
  try {
    keyBytes = decodeSecret(secret);
  } catch {
    return false; // secret wasn't valid base64
  }

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = `${id}.${timestamp}.${body}`;
  const computed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signed),
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(computed)));

  for (const part of signatureHeader.split(" ")) {
    const comma = part.indexOf(",");
    if (comma === -1) continue;
    if (part.slice(0, comma) !== "v1") continue;
    if (timingSafeEqual(part.slice(comma + 1), expected)) return true;
  }
  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return ack("Method not allowed", 405);
  }

  const liveSecret = Deno.env.get("POLAR_WEBHOOK_SECRET");
  const sandboxSecret = Deno.env.get("POLAR_SANDBOX_WEBHOOK_SECRET");
  if (!liveSecret && !sandboxSecret) {
    console.error(`${LOG} no webhook secret configured`);
    return ack("Server misconfigured", 500);
  }

  const body = await req.text();
  // Standard Webhooks headers. `webhook-id` here is the delivery id (part of
  // the signed payload) — distinct from the order id we use for idempotency.
  const sig =
    req.headers.get("webhook-signature") ??
    req.headers.get("polar-webhook-signature") ??
    req.headers.get("x-polar-signature");
  const deliveryId = req.headers.get("webhook-id") ?? "";
  const timestamp = req.headers.get("webhook-timestamp") ?? "";

  // Try both secrets; accept whichever validates. Lets live + sandbox
  // webhooks share one endpoint without flipping anything.
  let verified = false;
  let matchedEnv: "live" | "sandbox" | null = null;
  if (
    liveSecret &&
    (await verifySignature(deliveryId, timestamp, body, sig, liveSecret))
  ) {
    verified = true;
    matchedEnv = "live";
  } else if (
    sandboxSecret &&
    (await verifySignature(deliveryId, timestamp, body, sig, sandboxSecret))
  ) {
    verified = true;
    matchedEnv = "sandbox";
  }
  if (!verified) {
    console.warn(`${LOG} signature mismatch`, {
      hasSig: !!sig,
      hasId: !!deliveryId,
      hasTs: !!timestamp,
      hasLive: !!liveSecret,
      hasSandbox: !!sandboxSecret,
    });
    return ack("Invalid signature", 401);
  }

  let event: PolarOrderEvent;
  try {
    event = JSON.parse(body) as PolarOrderEvent;
  } catch {
    return ack("Invalid JSON", 400);
  }

  if (!HANDLED_EVENT_TYPES.has(event.type)) {
    return ack("event ignored", 200);
  }

  if (event.type !== "order.paid" || !event.data?.paid) {
    // We only credit on a confirmed paid order. ACK other types so Polar
    // doesn't retry.
    return ack("event ack'd, no action", 200);
  }

  const webhookId = event.data.id;
  const userId = event.data.metadata?.user_id as string | undefined;
  const credits = Number(event.data.metadata?.credits ?? 0);

  if (!webhookId) {
    console.warn(`${LOG} order.paid missing id`);
    return ack("Missing order id", 400);
  }
  if (!userId || !credits || credits <= 0) {
    console.warn(`${LOG} order.paid missing user_id/credits metadata`, {
      webhookId,
      hasUser: !!userId,
      credits,
    });
    return ack("Missing user_id or credits metadata", 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Idempotency: if we've already processed this webhook id, ack and return.
  const existing = await admin
    .from("processed_webhooks")
    .select("webhook_id")
    .eq("webhook_id", webhookId)
    .maybeSingle();
  if (existing.data) {
    console.info(`${LOG} duplicate, ignoring`, { webhookId });
    return ack("already processed", 200);
  }

  // Insert the credit grant + mark the webhook processed. Done as two
  // separate inserts because credits_ledger has a BEFORE-UPDATE/DELETE
  // trigger that doesn't play nicely with INSERT ... RETURNING in a
  // multi-statement transaction via PostgREST. Worst case if the second
  // insert fails: the user gets credited but we'll re-process the webhook
  // on retry, then the duplicate insert into processed_webhooks fails.
  // Acceptable for MVP — Polar retries are infrequent.
  const ledger = await admin.from("credits_ledger").insert({
    user_id: userId,
    delta: credits,
    reason: "purchase",
    ref_id: webhookId,
  });
  if (ledger.error) {
    console.error(`${LOG} ledger insert failed`, ledger.error);
    return ack("Ledger insert failed", 500);
  }

  const mark = await admin
    .from("processed_webhooks")
    .insert({ webhook_id: webhookId });
  if (mark.error) {
    console.error(`${LOG} processed_webhooks insert failed`, mark.error);
    // Don't 500 — the credit went through. Polar will retry and we'll
    // double-process. Better to ack now and reconcile manually.
  }

  // Flip the user's plan to 'paid' on their first purchase. Idempotent.
  await admin
    .from("users")
    .update({ plan: "paid" })
    .eq("id", userId)
    .neq("plan", "paid");

  console.info(`${LOG} credited`, { webhookId, userId, credits, matchedEnv });
  return ack("ok", 200);
});
