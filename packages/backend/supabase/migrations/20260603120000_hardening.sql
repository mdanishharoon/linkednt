-- Proxy hardening — per-mode rate buckets, daily usage cap, global ceiling.
--
-- Three independent defenses against quota / cost drainage:
--   1. Per-mode token bucket. strip is cheap so users get 30/min; roast hits
--      Sonnet 4.6 so cap at 5/min. One user can no longer burn the entire
--      OpenRouter quota by spamming roasts.
--   2. Daily usage cap per user (paid only — free trial is already 30
--      lifetime). Stops one paid user with a fat balance from blowing through
--      all credits in a single sitting.
--   3. global_credits_used_today() helper for a kill switch the edge fn polls
--      against an env-var ceiling. If anything goes wrong (price hike, bug,
--      abuse wave) we trip the circuit breaker without shipping new code.
--
-- The rate_limits table is reshaped (PK becomes (user_id, mode)) so we drop
-- and recreate. The old single-bucket function signature changes too, so
-- drop that as well. No backfill needed — buckets self-heal on next call.

----------------------------------------------------------------------
-- 1. Per-mode rate buckets
----------------------------------------------------------------------
drop function if exists public.consume_rate_token(uuid, double precision, double precision);
drop table if exists public.rate_limits;

create table public.rate_limits (
  user_id     uuid not null references public.users(id) on delete cascade,
  mode        text not null check (mode in ('strip', 'summarise', 'roast')),
  tokens      float not null,
  refilled_at timestamptz not null default now(),
  primary key (user_id, mode)
);

alter table public.rate_limits enable row level security;
-- Service role only; no policies = denied for anon/authenticated.

-- Per-mode capacity table. Keep in sync with MODE_CREDITS on the edge fn
-- and lib/types.ts: cheaper modes get a bigger bucket.
create or replace function public.consume_rate_token(
  p_user_id uuid,
  p_mode    text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now           timestamptz := now();
  v_capacity      float;
  v_tokens        float;
  v_refilled_at   timestamptz;
  v_elapsed_sec   float;
  v_new_tokens    float;
begin
  v_capacity := case p_mode
    when 'strip'     then 30.0
    when 'summarise' then 15.0
    when 'roast'     then  5.0
    else 0.0
  end;
  if v_capacity = 0 then
    return false;
  end if;

  insert into public.rate_limits (user_id, mode, tokens, refilled_at)
  values (p_user_id, p_mode, v_capacity, v_now)
  on conflict (user_id, mode) do nothing;

  select tokens, refilled_at into v_tokens, v_refilled_at
  from public.rate_limits
  where user_id = p_user_id and mode = p_mode
  for update;

  v_elapsed_sec := extract(epoch from (v_now - v_refilled_at));
  v_new_tokens := least(v_capacity, v_tokens + (v_elapsed_sec * v_capacity / 60.0));

  if v_new_tokens < 1 then
    update public.rate_limits
       set tokens = v_new_tokens, refilled_at = v_now
     where user_id = p_user_id and mode = p_mode;
    return false;
  end if;

  update public.rate_limits
     set tokens = v_new_tokens - 1, refilled_at = v_now
   where user_id = p_user_id and mode = p_mode;
  return true;
end;
$$;

revoke execute on function public.consume_rate_token(uuid, text)
  from public, anon, authenticated;
grant execute on function public.consume_rate_token(uuid, text)
  to service_role;

----------------------------------------------------------------------
-- 2. Daily usage cap per user
----------------------------------------------------------------------
-- Tracks today's credit consumption per user; resets on UTC date change.
-- Only consulted on the paid path — the free trial is already capped by
-- free_used_lifetime <= 30.
alter table public.users
  add column if not exists daily_used    int  not null default 0,
  add column if not exists daily_used_on date not null default current_date;

create or replace function public.check_and_bump_daily(
  p_user_id uuid,
  p_cost    int,
  p_cap     int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used  int;
  v_on    date;
begin
  select daily_used, daily_used_on into v_used, v_on
  from public.users where id = p_user_id
  for update;

  if not found then
    return false;
  end if;

  -- Roll the counter on UTC date change.
  if v_on < current_date then
    v_used := 0;
    update public.users
       set daily_used = 0, daily_used_on = current_date
     where id = p_user_id;
  end if;

  if v_used + p_cost > p_cap then
    return false;
  end if;

  update public.users
     set daily_used = daily_used + p_cost
   where id = p_user_id;
  return true;
end;
$$;

revoke execute on function public.check_and_bump_daily(uuid, int, int)
  from public, anon, authenticated;
grant execute on function public.check_and_bump_daily(uuid, int, int)
  to service_role;

----------------------------------------------------------------------
-- 3. Global cost ceiling helper
----------------------------------------------------------------------
-- Sum of credits spent across all users since UTC midnight. The edge fn
-- compares this to an env-var ceiling and 503s if exceeded — kill switch
-- without a redeploy.
create or replace function public.global_credits_used_today()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(cost_credits), 0)::int
  from public.usage_log
  where created_at >= date_trunc('day', now() at time zone 'utc');
$$;

revoke execute on function public.global_credits_used_today()
  from public, anon, authenticated;
grant execute on function public.global_credits_used_today()
  to service_role;

----------------------------------------------------------------------
-- 4. Update my_account_status() to surface daily_used so the popup can
--    show "X used today" alongside the credit balance.
----------------------------------------------------------------------
create or replace function public.my_account_status()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_email       text;
  v_plan        text;
  v_free_used   int;
  v_daily_used  int;
  v_daily_on    date;
  v_balance     int;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select email, plan, free_used_lifetime, daily_used, daily_used_on
    into v_email, v_plan, v_free_used, v_daily_used, v_daily_on
  from public.users
  where id = v_user_id;

  if not found then
    return json_build_object(
      'email', null,
      'plan', 'free',
      'free_remaining', 30,
      'paid_balance', 0,
      'daily_used', 0
    );
  end if;

  select coalesce(sum(delta), 0)::int
  into v_balance
  from public.credits_ledger
  where user_id = v_user_id;

  -- daily_used resets on UTC date change. If the stored counter is from a
  -- prior day, report 0 so the popup doesn't lie.
  if v_daily_on < current_date then
    v_daily_used := 0;
  end if;

  return json_build_object(
    'email', v_email,
    'plan', v_plan,
    'free_remaining', greatest(0, 30 - v_free_used),
    'paid_balance', v_balance,
    'daily_used', v_daily_used
  );
end;
$$;
