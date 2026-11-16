-- Table privileges for the API roles. Row level security policies still decide which rows each user can touch.
grant usage on schema public to anon, authenticated;
grant select on public.competitions, public.seasons, public.fixtures, public.games, public.entries, public.profiles to anon, authenticated;
grant select on public.team_picks to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant insert on public.entries to authenticated;
grant insert, update on public.team_picks to authenticated;
grant update on public.fixtures to authenticated;
grant select on public.admins to authenticated;
