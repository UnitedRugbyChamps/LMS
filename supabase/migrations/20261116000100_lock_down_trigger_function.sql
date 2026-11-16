-- The trigger function never needs to be called directly over the API.
revoke execute on function public.team_picks_guard() from public, anon, authenticated;
-- round_lock, period_of and is_admin stay callable: RLS policies use them, and they only reveal public data.
