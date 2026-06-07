// linkednt /rewrite edge function.
//
// Flow:
//   1. CORS preflight passthrough.
//   2. Auth: read Supabase JWT from Authorization header → resolve user_id.
//   3. Token-bucket rate limit (30/min by default).
//   4. Validate body (text, mode).
//   5. Hash text → look up rewrite_cache. If hit → return + log cache_hit=true.
//   6. Credits check:
//        - free user with free_used_lifetime < 30 → allow, decrement counter
//        - paid user with balance >= MODE_CREDITS[mode] → debit ledger
//        - else 402
//   7. Route mode → (provider, model, env-key). Call provider via rewriter.
//   8. Write rewrite_cache + usage_log.
//   9. Return { ok, rewrite, mode, cached:false }.
//
// Env vars (set via `supabase secrets set`):
//   - GROQ_API_KEY        (Strip + Summarise)
//   - OPENROUTER_API_KEY  (Roast via Claude Sonnet 4.6)
//
// Auto-injected by the platform:
//   - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { sha256Hex } from "../_shared/hash.ts";
import { PROMPT_VERSION } from "../_shared/prompts.ts";
import { runRewrite } from "../_shared/rewriter.ts";
import { routeForMode } from "../_shared/routing.ts";
import type { Mode, RewriteResponse } from "../_shared/types.ts";
import { MODE_CREDITS } from "../_shared/types.ts";

// Helper-fn shorthand. SupabaseClient's default generics resolve to
// `any` in every slot when we don't supply a generated Database type,
// which is exactly what we want here — deno check otherwise infers
// `never[]` from the empty default and rejects every .from()/.rpc()
// call site. Naming the type also keeps the helper signatures short.
type Admin = SupabaseClient;

const LOG = "[linkednt:fn:rewrite]";
const FREE_TRIAL_LIMIT = 30;

// Per-user daily cap on the paid path. Free trial is already capped by
// FREE_TRIAL_LIMIT lifetime so it doesn't need a daily cap. The number is a
// soft cap (returns 402-style INSUFFICIENT_CREDITS with a daily-cap message)
// — not a hard rate limit (that's the per-mode token bucket).
const DAILY_PAID_CAP = Number(Deno.env.get("DAILY_PAID_CAP") ?? "500");

// Global circuit breaker. Sum of cost_credits across all users since UTC
// midnight; if exceeded the function 503s for everyone. Lets us trip the
// killswitch via `supabase secrets set DAILY_CREDIT_CEILING=...` without a
// code deploy. 0 disables the check.
const DAILY_CREDIT_CEILING = Number(
  Deno.env.get("DAILY_CREDIT_CEILING") ?? "0",
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function err(
  code: RewriteResponse extends { ok: false; code: infer C } ? C : never,
  error: string,
  status: number,
): Response {
  return json({ ok: false, code, error }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return err("HTTP", "Method not allowed.", 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return err("UNAUTHORIZED", "Missing Authorization header.", 401);
  }

  // User-scoped client for auth + RLS-respecting reads.
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return err("UNAUTHORIZED", "Invalid session.", 401);
  }

  // Service-role client for writes that bypass RLS (credits_ledger,
  // rewrite_cache, usage_log).
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Body must be parsed before rate-limiting so we can pick the right
  // per-mode bucket.
  let body: { text?: string; mode?: Mode };
  try {
    body = await req.json();
  } catch {
    return err("HTTP", "Invalid JSON body.", 400);
  }
  const text = (body.text ?? "").trim();
  const mode = body.mode;
  if (!mode || !(mode in MODE_CREDITS)) {
    return err("HTTP", "Body.mode must be strip|summarise|roast.", 400);
  }
  if (text.length < 24) {
    return err("TOO_SHORT", "Not enough slop to work with.", 400);
  }

  // Global cost ceiling (kill switch). Polled cheaply per call.
  if (DAILY_CREDIT_CEILING > 0) {
    const { data: usedToday } = await admin.rpc("global_credits_used_today");
    if (typeof usedToday === "number" && usedToday >= DAILY_CREDIT_CEILING) {
      console.warn(`${LOG} global ceiling hit`, {
        used: usedToday,
        ceiling: DAILY_CREDIT_CEILING,
      });
      return err(
        "HTTP",
        "linkedn't is taking a breather. Try again in a few minutes.",
        503,
      );
    }
  }

  // Per-mode token bucket — strip 30/min, summarise 15/min, roast 5/min.
  const { data: allowed } = await admin.rpc("consume_rate_token", {
    p_user_id: user.id,
    p_mode: mode,
  });
  if (allowed === false) {
    return err("RATE_LIMITED", "Slow down — try again in a moment.", 429);
  }

  const route = routeForMode(mode);
  const modelVersion = `${PROMPT_VERSION}:${route.providerId}:${route.model}`;
  const inputHash = await sha256Hex(text);
  const cost = MODE_CREDITS[mode];

  // ---- cache lookup ----
  const cacheHit = await admin
    .from("rewrite_cache")
    .select("output")
    .eq("input_hash", inputHash)
    .eq("mode", mode)
    .eq("model_version", modelVersion)
    .maybeSingle();

  if (cacheHit.data?.output) {
    // bump hit_count + last_hit_at; fire-and-forget.
    void admin
      .from("rewrite_cache")
      .update({ last_hit_at: new Date().toISOString() })
      .eq("input_hash", inputHash)
      .eq("mode", mode)
      .eq("model_version", modelVersion);

    // Idempotency guard for the retry-after-timeout race:
    //
    //   t=0   client POSTs, server starts the Sonnet call
    //   t=8s  client AbortController fires, popup shows the error card
    //   t=12s server finishes, writes rewrite_cache, debits 1 credit
    //   t=15s user hits Retry, server hits cache — without this guard
    //         we'd debit a 2nd credit for what is effectively the same
    //         rewrite the user only ever saw once.
    //
    // Bypasses the debit if the same user already paid for the same
    // (input_hash, mode) within the last hour. usage_log_input_hash_idx
    // covers the lookup; the extra filters narrow it to a single row.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: alreadyPaid } = await admin
      .from("usage_log")
      .select("id")
      .eq("user_id", user.id)
      .eq("input_hash", inputHash)
      .eq("mode", mode)
      .gt("cost_credits", 0)
      .gte("created_at", oneHourAgo)
      .limit(1)
      .maybeSingle();

    if (alreadyPaid) {
      // Log the cache hit at cost_credits=0 so analytics still see the
      // request, but the balance stays put.
      await admin.from("usage_log").insert({
        user_id: user.id,
        mode,
        provider: route.providerId,
        model: route.model,
        cache_hit: true,
        input_hash: inputHash,
        cost_credits: 0,
        latency_ms: 0,
      });
      console.info(`${LOG} cache hit, idempotent — no debit`, {
        mode,
        user: user.id,
      });
    } else {
      await debitOrTrack(admin, user.id, mode, cost, true, route, inputHash, 0);
      console.info(`${LOG} cache hit`, { mode, user: user.id });
    }

    const ok: RewriteResponse = {
      ok: true,
      rewrite: cacheHit.data.output,
      mode,
      cached: true,
    };
    return json(ok);
  }

  // ---- credits gate ----
  const credCheck = await checkCredits(admin, user.id, cost);
  if (!credCheck.ok) {
    return err("INSUFFICIENT_CREDITS", credCheck.error, 402);
  }

  // If we're past the free trial, check + bump the daily paid cap before
  // touching the provider. The check is atomic (SELECT FOR UPDATE +
  // UPDATE in the SQL fn) so two concurrent calls can't both squeak past.
  if (credCheck.path === "paid") {
    const { data: dailyOk } = await admin.rpc("check_and_bump_daily", {
      p_user_id: user.id,
      p_cost: cost,
      p_cap: DAILY_PAID_CAP,
    });
    if (dailyOk === false) {
      return err(
        "INSUFFICIENT_CREDITS",
        `Daily cap reached (${DAILY_PAID_CAP} credits/day). Resets at UTC midnight.`,
        402,
      );
    }
  }

  // ---- provider call ----
  const apiKey = Deno.env.get(route.apiKeyEnv);
  if (!apiKey) {
    console.error(`${LOG} missing env`, { env: route.apiKeyEnv });
    return err("HTTP", "Server misconfigured.", 500);
  }

  const startedAt = performance.now();
  const result = await runRewrite({
    text,
    mode,
    providerId: route.providerId,
    apiKey,
    model: route.model,
  });
  const ms = Math.round(performance.now() - startedAt);

  if (!result.ok) {
    // Roll back the daily-counter reservation from check_and_bump_daily.
    // We bumped it pre-flight so concurrent calls can't both squeak past
    // the cap; on a provider failure we never debit credits, so the
    // reservation has to be released — otherwise repeated Sonnet flakes
    // would silently shrink a user's daily cap until they hit a wall they
    // never actually used.
    if (credCheck.path === "paid") {
      await admin.rpc("decrement_daily", {
        p_user_id: user.id,
        p_cost: cost,
      });
    }
    await admin.from("usage_log").insert({
      user_id: user.id,
      mode,
      provider: route.providerId,
      model: route.model,
      cache_hit: false,
      input_hash: inputHash,
      cost_credits: 0,
      latency_ms: ms,
      error_code: result.code,
    });
    return err(result.code, result.error, 502);
  }

  // ---- write cache + debit credits + log ----
  await admin.from("rewrite_cache").insert({
    input_hash: inputHash,
    mode,
    model_version: modelVersion,
    output: result.rewrite,
  });

  await debitOrTrack(admin, user.id, mode, cost, false, route, inputHash, ms);

  console.info(`${LOG} ok`, {
    mode,
    user: user.id,
    provider: route.providerId,
    model: route.model,
    ms,
  });
  const ok: RewriteResponse = {
    ok: true,
    rewrite: result.rewrite,
    mode,
    cached: false,
  };
  return json(ok);
});

// ---- helpers ----

async function checkCredits(
  admin: Admin,
  userId: string,
  cost: number,
): Promise<{ ok: true; path: "free" | "paid" } | { ok: false; error: string }> {
  const { data: u } = await admin
    .from("users")
    .select("plan, free_used_lifetime")
    .eq("id", userId)
    .maybeSingle();
  if (!u) return { ok: false, error: "User row not found." };

  if ((u.free_used_lifetime ?? 0) + cost <= FREE_TRIAL_LIMIT) {
    return { ok: true, path: "free" };
  }

  const { data: bal } = await admin.rpc("credits_balance", {
    p_user_id: userId,
  });
  if ((bal ?? 0) >= cost) return { ok: true, path: "paid" };

  return {
    ok: false,
    error:
      "Out of credits. Buy a top-up or switch to Bring own key in the popup.",
  };
}

async function debitOrTrack(
  admin: Admin,
  userId: string,
  mode: Mode,
  cost: number,
  cacheHit: boolean,
  route: { providerId: string; model: string },
  inputHash: string,
  ms: number,
): Promise<void> {
  const { data: u } = await admin
    .from("users")
    .select("free_used_lifetime")
    .eq("id", userId)
    .maybeSingle();

  const usedFree = u?.free_used_lifetime ?? 0;
  if (usedFree + cost <= FREE_TRIAL_LIMIT) {
    await admin
      .from("users")
      .update({ free_used_lifetime: usedFree + cost })
      .eq("id", userId);
  } else {
    await admin.from("credits_ledger").insert({
      user_id: userId,
      delta: -cost,
      reason: "rewrite",
    });
  }

  await admin.from("usage_log").insert({
    user_id: userId,
    mode,
    provider: route.providerId,
    model: route.model,
    cache_hit: cacheHit,
    input_hash: inputHash,
    cost_credits: cost,
    latency_ms: ms,
  });
}
