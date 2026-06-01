-- my_account_status() — single-round-trip account snapshot for the popup.
--
-- The existing credits_balance(p_user_id) function takes a user_id and we
-- revoked PostgREST EXECUTE on it in lock_down_rpc_security so signed-in
-- users couldn't read someone else's balance. The popup still needs to read
-- the SIGNED-IN USER's own balance + free trial counter + plan in one call.
--
-- my_account_status() solves that safely: it uses auth.uid() internally so
-- there's no way to query for another user, and it returns a JSON envelope
-- so future fields (e.g. last_grant_at, next_reset_at) can be added without
-- breaking callers.

create or replace function public.my_account_status()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_plan text;
  v_free_used int;
  v_balance int;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select email, plan, free_used_lifetime
  into v_email, v_plan, v_free_used
  from public.users
  where id = v_user_id;

  -- Brand new auth.users row that the handle_new_auth_user trigger hasn't
  -- mirrored yet (rare race window). Return the bootstrap defaults so the
  -- popup can render something instead of erroring.
  if not found then
    return json_build_object(
      'email', null,
      'plan', 'free',
      'free_remaining', 30,
      'paid_balance', 0
    );
  end if;

  select coalesce(sum(delta), 0)::int
  into v_balance
  from public.credits_ledger
  where user_id = v_user_id;

  return json_build_object(
    'email', v_email,
    'plan', v_plan,
    'free_remaining', greatest(0, 30 - v_free_used),
    'paid_balance', v_balance
  );
end;
$$;

-- Public/anon explicitly denied; only signed-in users can call.
revoke execute on function public.my_account_status() from public, anon;
grant execute on function public.my_account_status() to authenticated, service_role;
