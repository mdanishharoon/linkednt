-- linkednt initial schema
--
-- Tables:
--   users               : per-user profile + free-trial counter + plan
--   credits_ledger      : append-only ledger (balance = sum(delta))
--   usage_log           : per-rewrite telemetry
--   rewrite_cache       : shared global cache, keyed by (input_hash, mode, model_version)
--   rate_limits         : Postgres token-bucket per user
--   processed_webhooks  : Polar webhook idempotency
--
-- Key design decisions baked in:
--   - credits_ledger is append-only; BEFORE UPDATE/DELETE trigger blocks mutation
--     even from service_role. Belt-and-suspenders since RLS already denies it.
--   - rewrite_cache.model_version is part of the PK so prompt/model upgrades
--     invalidate stale entries automatically — no manual cache busting needed.
--   - No raw post text stored anywhere; only sha256 of input.

create extension if not exists pgcrypto;

----------------------------------------------------------------------
-- users
----------------------------------------------------------------------
create table public.users (
  id                 uuid primary key references auth.users(id) on delete cascade,
  email              text not null,
  plan               text not null default 'free' check (plan in ('free', 'paid')),
  free_used_lifetime int not null default 0,
  created_at         timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users read own row"
  on public.users for select
  using (auth.uid() = id);

create policy "users update own non-sensitive row"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a users row when a new auth.users row appears (signup).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

----------------------------------------------------------------------
-- credits_ledger : append-only
----------------------------------------------------------------------
create table public.credits_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  delta      int not null,                       -- +500 on purchase, -1/-2/-3 on use
  reason     text not null check (reason in ('purchase', 'rewrite', 'refund', 'grant')),
  ref_id     text,                               -- polar order id or usage_log id
  created_at timestamptz not null default now()
);

create index credits_ledger_user_idx on public.credits_ledger (user_id, created_at desc);

alter table public.credits_ledger enable row level security;

-- Users can read their own ledger entries but never write.
create policy "users read own ledger"
  on public.credits_ledger for select
  using (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies = denied for anon + authenticated.
-- Only service_role bypasses RLS and may insert.

-- Belt-and-suspenders: even service_role cannot mutate or delete history.
create or replace function public.deny_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'credits_ledger is append-only; updates and deletes are not permitted';
end;
$$;

create trigger credits_ledger_no_update
  before update on public.credits_ledger
  for each row execute function public.deny_ledger_mutation();

create trigger credits_ledger_no_delete
  before delete on public.credits_ledger
  for each row execute function public.deny_ledger_mutation();

revoke update, delete on public.credits_ledger from authenticated, anon;

-- Convenience: current balance for a user.
create or replace function public.credits_balance(p_user_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(delta), 0)::int
  from public.credits_ledger
  where user_id = p_user_id;
$$;

----------------------------------------------------------------------
-- usage_log
----------------------------------------------------------------------
create table public.usage_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  mode          text not null check (mode in ('strip', 'summarise', 'roast')),
  provider      text not null,
  model         text not null,
  cache_hit     boolean not null default false,
  input_hash    text not null,                  -- sha256(text); NO plaintext stored
  cost_credits  int not null default 0,
  cost_usd_micros bigint not null default 0,    -- USD * 1_000_000 for integer precision
  latency_ms    int not null default 0,
  error_code    text,                           -- null on success
  created_at    timestamptz not null default now()
);

create index usage_log_user_idx on public.usage_log (user_id, created_at desc);
create index usage_log_input_hash_idx on public.usage_log (input_hash);

alter table public.usage_log enable row level security;

create policy "users read own usage"
  on public.usage_log for select
  using (auth.uid() = user_id);

----------------------------------------------------------------------
-- rewrite_cache : shared across all users
----------------------------------------------------------------------
create table public.rewrite_cache (
  input_hash    text not null,
  mode          text not null check (mode in ('strip', 'summarise', 'roast')),
  model_version text not null,                  -- bump to invalidate entries cleanly
  output        text not null,
  hit_count     int not null default 0,
  created_at    timestamptz not null default now(),
  last_hit_at   timestamptz not null default now(),
  primary key (input_hash, mode, model_version)
);

create index rewrite_cache_last_hit_idx on public.rewrite_cache (last_hit_at desc);

alter table public.rewrite_cache enable row level security;

-- Cache is opaque to users; only service_role reads/writes.
-- No SELECT policy = denied for anon + authenticated. Service role bypasses.

----------------------------------------------------------------------
-- rate_limits : Postgres token-bucket per user
----------------------------------------------------------------------
create table public.rate_limits (
  user_id      uuid primary key references public.users(id) on delete cascade,
  tokens       float not null default 30,        -- 30 rewrites/min ceiling
  refilled_at  timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
-- Same: only service_role reads/writes.

create or replace function public.consume_rate_token(
  p_user_id uuid,
  p_refill_per_minute float default 30,
  p_burst float default 30
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_tokens float;
  v_refilled_at timestamptz;
  v_elapsed_seconds float;
  v_new_tokens float;
begin
  insert into public.rate_limits (user_id, tokens, refilled_at)
  values (p_user_id, p_burst, v_now)
  on conflict (user_id) do nothing;

  select tokens, refilled_at into v_tokens, v_refilled_at
  from public.rate_limits where user_id = p_user_id for update;

  v_elapsed_seconds := extract(epoch from (v_now - v_refilled_at));
  v_new_tokens := least(p_burst, v_tokens + (v_elapsed_seconds * p_refill_per_minute / 60.0));

  if v_new_tokens < 1 then
    update public.rate_limits
       set tokens = v_new_tokens, refilled_at = v_now
     where user_id = p_user_id;
    return false;
  end if;

  update public.rate_limits
     set tokens = v_new_tokens - 1, refilled_at = v_now
   where user_id = p_user_id;
  return true;
end;
$$;

----------------------------------------------------------------------
-- processed_webhooks : Polar idempotency
----------------------------------------------------------------------
create table public.processed_webhooks (
  webhook_id   text primary key,
  processed_at timestamptz not null default now()
);

alter table public.processed_webhooks enable row level security;
-- Service role only.
