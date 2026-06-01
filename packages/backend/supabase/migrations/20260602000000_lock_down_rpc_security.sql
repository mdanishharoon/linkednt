-- Tighten SECURITY DEFINER functions exposed via PostgREST.
--
-- The init migration declared three SECURITY DEFINER functions
-- (consume_rate_token, credits_balance, handle_new_auth_user) that
-- are only meant to be called by the edge function as service_role
-- (or by a trigger, in handle_new_auth_user's case). With default
-- grants, signed-in users can hit /rest/v1/rpc/credits_balance and
-- pass any uuid to read someone else's balance, or hammer
-- consume_rate_token against arbitrary user_ids.
--
-- Fix: revoke EXECUTE from public/anon/authenticated; re-grant only
-- to service_role. Triggers still fire — trigger invocation does not
-- check EXECUTE.
--
-- Also pins the search_path on deny_ledger_mutation so a hostile
-- search_path can't be used to bypass the append-only guard.

revoke execute on function public.consume_rate_token(uuid, double precision, double precision)
  from public, anon, authenticated;
grant execute on function public.consume_rate_token(uuid, double precision, double precision)
  to service_role;

revoke execute on function public.credits_balance(uuid)
  from public, anon, authenticated;
grant execute on function public.credits_balance(uuid)
  to service_role;

revoke execute on function public.handle_new_auth_user()
  from public, anon, authenticated;
-- service_role does not need EXECUTE here; the function only ever runs as a
-- trigger on auth.users (insert), which fires regardless of EXECUTE grants.

alter function public.deny_ledger_mutation() set search_path = public;
