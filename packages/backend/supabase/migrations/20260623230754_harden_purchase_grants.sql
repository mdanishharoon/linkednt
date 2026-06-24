-- Harden the purchase → credits grant path so a paid Polar order can never
-- silently fail to credit a user.
--
-- Background: the polar-webhook previously did four separate PostgREST writes
-- (idempotency check, credits_ledger insert, processed_webhooks insert, plan
-- update). credits_ledger.user_id has a FK to public.users(id). If the
-- public.users row was missing — e.g. the on_auth_user_created signup trigger
-- didn't fire, or the user_id came from a session against a different project —
-- the ledger INSERT raised a foreign-key violation, the webhook returned 500,
-- Polar retried 10× and gave up, and the paid order was lost with no record.
--
-- Two fixes:
--   1. grant_purchase_credits(): a single-transaction, self-healing RPC the
--      webhook now calls. It backfills the public.users row from auth.users
--      when missing, inserts the ledger row, records idempotency, and flips the
--      plan — atomically.
--   2. failed_grants: a dead-letter table. Any grant that still fails is
--      recorded here in full so a paid order is never lost and can be replayed.

----------------------------------------------------------------------
-- failed_grants : dead-letter for paid orders we couldn't credit
----------------------------------------------------------------------
create table if not exists public.failed_grants (
  id          uuid primary key default gen_random_uuid(),
  order_id    text not null,
  user_id     uuid,
  credits     int,
  reason      text,                 -- error message / classification
  payload     jsonb,                -- raw event.data, for manual replay
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists failed_grants_unresolved_idx
  on public.failed_grants (created_at desc)
  where not resolved;

alter table public.failed_grants enable row level security;
-- No policies → only service_role (which bypasses RLS) can read/write. This
-- holds raw order data we never want exposed to anon/authenticated clients.

----------------------------------------------------------------------
-- grant_purchase_credits : atomic, self-healing credit grant
----------------------------------------------------------------------
create or replace function public.grant_purchase_credits(
  p_order_id text,
  p_user_id  uuid,
  p_credits  int,
  p_email    text default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_order_id is null or p_user_id is null
     or p_credits is null or p_credits <= 0 then
    raise exception 'INVALID_ARGS';
  end if;

  -- Idempotency: already processed this order → no-op.
  if exists (select 1 from processed_webhooks where webhook_id = p_order_id) then
    return 'duplicate';
  end if;

  -- Self-heal: ensure the app-user row exists. on_auth_user_created normally
  -- creates it at signup; if it didn't (trigger missing, or migration applied
  -- after the user signed up), backfill it from auth.users.
  if not exists (select 1 from public.users where id = p_user_id) then
    if not exists (select 1 from auth.users where id = p_user_id) then
      -- user_id doesn't exist in THIS project's auth schema — a purchase
      -- routed to the wrong Supabase project. Cannot credit here; surface it
      -- so the webhook dead-letters the order instead of looping forever.
      raise exception 'AUTH_USER_NOT_FOUND';
    end if;
    insert into public.users (id, email)
    select id, coalesce(p_email, email, '') from auth.users where id = p_user_id
    on conflict (id) do nothing;
  end if;

  insert into public.credits_ledger (user_id, delta, reason, ref_id)
  values (p_user_id, p_credits, 'purchase', p_order_id);

  insert into public.processed_webhooks (webhook_id) values (p_order_id)
  on conflict (webhook_id) do nothing;

  update public.users set plan = 'paid'
  where id = p_user_id and plan <> 'paid';

  return 'granted';
end;
$$;

-- Only the webhook (service_role) may call this. Deny everyone else.
revoke all on function public.grant_purchase_credits(text, uuid, int, text)
  from public, anon, authenticated;
grant execute on function public.grant_purchase_credits(text, uuid, int, text)
  to service_role;
