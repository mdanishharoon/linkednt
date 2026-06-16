-- Operator cost telemetry.
--
-- usage_log already had cost_usd_micros (it was never populated). The rewrite
-- edge fn now reads token usage from the provider response and writes the real
-- input/output token counts + an estimated USD cost (from a per-model price
-- table in the fn). This migration:
--   1. adds the token-count columns, and
--   2. adds a daily spend rollup so we can see what WE pay Groq / OpenRouter,
--      separate from the user-facing credits.
--
-- "Our cost" is cost_usd_micros / cost_usd (USD). "What the user was charged"
-- stays cost_credits. They're intentionally different units.

alter table public.usage_log
  add column if not exists input_tokens  int not null default 0,
  add column if not exists output_tokens int not null default 0;

-- Daily spend rollup by provider/model. OPERATOR-ONLY: it aggregates cost
-- across ALL users, so SELECT is revoked from anon + authenticated and the view
-- is security_invoker (never bypasses usage_log RLS). Query it from the
-- dashboard SQL editor (postgres) or a service_role connection:
--   select * from public.cost_daily order by day desc;
create or replace view public.cost_daily
with (security_invoker = true) as
select
  (created_at at time zone 'utc')::date          as day,
  provider,
  model,
  count(*)                                        as calls,
  count(*) filter (where cache_hit)               as cache_hits,
  count(*) filter (where error_code is not null)  as errors,
  sum(input_tokens)                               as input_tokens,
  sum(output_tokens)                              as output_tokens,
  sum(cost_usd_micros)                            as cost_usd_micros,
  round(sum(cost_usd_micros) / 1e6, 4)            as cost_usd
from public.usage_log
group by 1, 2, 3;

revoke all on public.cost_daily from anon, authenticated;
