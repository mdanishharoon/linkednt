-- Compensating action for check_and_bump_daily.
--
-- check_and_bump_daily reserves quota before the provider call. If the
-- provider then fails (timeout, 502, empty output), we never debit credits
-- but the daily counter was already bumped. Without a rollback the user's
-- daily cap silently shrinks every time the model misbehaves.
--
-- We only decrement when daily_used_on matches today — if UTC rolled over
-- between the bump and the failure (rare but possible on long calls), the
-- counter has already been reset to 0 and we don't want to underflow.

create or replace function public.decrement_daily(
  p_user_id uuid,
  p_cost    int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
     set daily_used = greatest(0, daily_used - p_cost)
   where id = p_user_id
     and daily_used_on = current_date;
end;
$$;

revoke execute on function public.decrement_daily(uuid, int)
  from public, anon, authenticated;
grant execute on function public.decrement_daily(uuid, int)
  to service_role;
