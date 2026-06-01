# @linkednt/backend

Supabase project (DB + auth + edge functions) for linkednt's proxy path.

## One-time setup

```bash
# 1. Install supabase CLI if not already.
#    (nix shell has it; otherwise: https://supabase.com/docs/guides/cli)

# 2. Create a Supabase project (free tier is fine for v1).
supabase login
supabase projects create linkednt
#    → outputs project-ref (e.g. abcdefghijkl).

# 3. Link this local config to that remote project.
cd packages/backend
supabase link --project-ref <project-ref>

# 4. Push the initial migration.
supabase db push
#    → creates users, credits_ledger, usage_log, rewrite_cache,
#      rate_limits, processed_webhooks tables + RLS + triggers.

# 5. Set provider secrets (used by the /rewrite edge function).
supabase secrets set GROQ_API_KEY=gsk_...
supabase secrets set OPENROUTER_API_KEY=sk-or-...

# 6. Deploy the edge function.
supabase functions deploy rewrite
```

## Local dev

```bash
# Pre-req: copy .env.example → .env.local and fill in keys.
cp .env.example .env.local
bun fn:serve
# → starts the function on http://localhost:54321/functions/v1/rewrite
```

## Schema overview

| Table                | Purpose                                             |
| -------------------- | --------------------------------------------------- |
| `users`              | Profile + free-trial counter + plan                 |
| `credits_ledger`     | Append-only ledger (balance = `sum(delta)`)         |
| `usage_log`          | Per-rewrite telemetry (mode/provider/model/cost/ms) |
| `rewrite_cache`      | Shared cache, PK = (hash, mode, model_version)      |
| `rate_limits`        | Postgres token-bucket (30/min default)              |
| `processed_webhooks` | Polar webhook idempotency                           |

Key invariants:

- `credits_ledger` is append-only at the trigger level. Even service_role
  cannot UPDATE/DELETE — `deny_ledger_mutation()` raises an exception.
- `rewrite_cache.model_version` is part of the PK. Bumping `PROMPT_VERSION`
  (in `functions/_shared/prompts.ts`) or any route in `routing.ts` makes old
  entries unreachable — no manual cache-busting needed.
- No raw post text is stored anywhere. The cache PK is `sha256(text)`; only
  the rewritten output lands in Postgres.

## Mode routing (server-side, proxy path only)

In `functions/_shared/routing.ts`:

| Mode      | Provider   | Model                       | Credits |
| --------- | ---------- | --------------------------- | ------- |
| strip     | Groq       | llama-3.1-8b-instant        | 1       |
| summarise | Groq       | llama-3.3-70b-versatile     | 2       |
| roast     | OpenRouter | anthropic/claude-sonnet-4.6 | 3       |

Free trial: 30 lifetime rewrites per signed-in user before credits are
required. Beyond that, `credits_ledger` debits per call.
