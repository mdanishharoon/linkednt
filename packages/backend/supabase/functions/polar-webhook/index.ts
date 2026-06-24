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
//   - POLAR_WEBHOOK_SECRET           — live webhook signing secret (polar_whs_…)
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

// Candidate HMAC keys derived from the signing secret. Polar's signature is
// HMAC-SHA256 over `{webhook-id}.{webhook-timestamp}.{body}`, base64-encoded —
// but how it derives the *key* from the secret depends on how the secret was
// created. Empirically (sandbox, secret supplied via the API), Polar keys the
// HMAC on the FULL secret string as raw UTF-8 bytes — INCLUDING the `whsec_`
// prefix — NOT the Standard Webhooks convention (strip `whsec_`, base64-decode
// the rest). To stay correct across both — custom-supplied secrets and
// dashboard-generated ones — we try every reasonable derivation and accept the
// signature if ANY matches. All are over the same secret, so this doesn't
// weaken security (an attacker still needs the secret).
function secretKeyCandidates(secret: string): Uint8Array[] {
  const enc = new TextEncoder();
  const candidates: Uint8Array[] = [enc.encode(secret)]; // raw full string ← Polar (sandbox + prod)
  // Polar prefixes the signing secret, and the prefix differs by source:
  // sandbox secrets we supplied via the API use `whsec_`, while Polar-generated
  // prod secrets use `polar_whs_`. Strip whichever is present so the
  // prefix-stripped + base64 derivations below work for both.
  let noPrefix = secret;
  for (const prefix of ["whsec_", "polar_whs_"]) {
    if (secret.startsWith(prefix)) {
      noPrefix = secret.slice(prefix.length);
      break;
    }
  }
  if (noPrefix !== secret) candidates.push(enc.encode(noPrefix)); // raw, prefix stripped
  try {
    // Standard Webhooks: base64-decode the part after the prefix.
    const bin = atob(noPrefix);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    candidates.push(bytes);
  } catch {
    // noPrefix wasn't valid base64 — skip that derivation.
  }
  return candidates;
}

// The HMAC-SHA256 is over `{webhook-id}.{webhook-timestamp}.{body}` and the
// `webhook-signature` header is a space-separated list of `v1,<base64sig>`
// entries. Accept if any signature matches any key derivation.
//
// We deliberately do NOT enforce a timestamp tolerance: Polar reuses the
// original id/timestamp/signature when retrying a failed delivery, which can
// arrive hours later, and `processed_webhooks` already gives us replay +
// duplicate protection.
async function verifySignature(
  id: string,
  timestamp: string,
  body: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !secret || !id || !timestamp) return false;

  const provided = signatureHeader
    .split(" ")
    .filter((p) => p.startsWith("v1,"))
    .map((p) => p.slice("v1,".length));
  if (provided.length === 0) return false;

  const signed = new TextEncoder().encode(`${id}.${timestamp}.${body}`);

  for (const keyBytes of secretKeyCandidates(secret)) {
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const computed = await crypto.subtle.sign("HMAC", key, signed);
    const expected = btoa(String.fromCharCode(...new Uint8Array(computed)));
    for (const sig of provided) {
      if (timingSafeEqual(sig, expected)) return true;
    }
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

  const customerEmail = event.data.customer?.email ?? null;

  // Single atomic, self-healing grant. grant_purchase_credits() runs in one
  // transaction: idempotency check, missing-user backfill from auth.users,
  // ledger insert, processed_webhooks mark, and plan flip. Replaces the prior
  // four separate writes whose ledger INSERT could FK-fail and lose the order.
  const { data: result, error: grantError } = await admin.rpc(
    "grant_purchase_credits",
    {
      p_order_id: webhookId,
      p_user_id: userId,
      p_credits: credits,
      p_email: customerEmail,
    },
  );

  if (grantError) {
    // A paid order must NEVER be silently lost. Record it to the dead-letter
    // table for reconciliation, whatever the cause. Best-effort: even if this
    // insert fails, the error is logged and Polar still has the event.
    const msg = grantError.message ?? String(grantError);
    console.error(`${LOG} grant failed`, { webhookId, userId, credits, msg });
    const dead = await admin.from("failed_grants").insert({
      order_id: webhookId,
      user_id: userId,
      credits,
      reason: msg,
      payload: event.data,
    });
    if (dead.error) {
      console.error(`${LOG} failed_grants insert ALSO failed`, dead.error);
    }

    // Permanent failures (misrouted/unknown user, constraint violations) won't
    // recover on retry — ack 200 so Polar stops hammering; reconcile from
    // failed_grants. Transient failures (timeouts, 5xx) → 500 so Polar retries.
    const permanent =
      /AUTH_USER_NOT_FOUND|INVALID_ARGS|foreign key|violates|duplicate key/i.test(
        msg,
      );
    return ack(
      permanent ? "recorded for reconciliation" : "transient failure, retry",
      permanent ? 200 : 500,
    );
  }

  console.info(`${LOG} credited`, {
    webhookId,
    userId,
    credits,
    matchedEnv,
    result,
  });
  return ack("ok", 200);
});
