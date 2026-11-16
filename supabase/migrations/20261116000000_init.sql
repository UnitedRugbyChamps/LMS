-- Rugby LMS 2027: core schema for Team Pick LMS.
-- Rules mirror src/lib/engine/teamPick.ts. The app validates picks with the engine;
-- the database re-checks the critical rules (lock time, team in fixture, no reuse in a period).

create table public.competitions (
  id text primary key,
  name text not null,
  short_name text not null
);

create table public.seasons (
  id text primary key,
  competition_id text not null references public.competitions(id),
  name text not null,
  team_count int not null check (team_count > 1),
  knockout_rounds int[] not null default '{}',
  lock_minutes int not null default 30,
  open_minutes int not null default 120,
  window_days int not null default 7
);

create table public.fixtures (
  id text primary key,
  season_id text not null references public.seasons(id),
  round int not null,
  home text not null,
  away text not null,
  kickoff timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'postponed')),
  result text check (result in ('home', 'away', 'draw')),
  home_score int,
  away_score int,
  updated_at timestamptz not null default now()
);
create index fixtures_season_round on public.fixtures (season_id, round);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.games (
  id text primary key,
  season_id text not null references public.seasons(id),
  name text not null,
  mode text not null default 'team_pick' check (mode in ('team_pick')),
  first_round int not null default 1,
  is_public boolean not null default true,
  join_code text unique,
  created_at timestamptz not null default now()
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (game_id, user_id)
);

create table public.team_picks (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  round int not null,
  team text not null,
  fixture_id text not null references public.fixtures(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entry_id, round)
);

-- Helpers ---------------------------------------------------------------

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- When all picks for a round lock: N minutes before the round's first kickoff.
create or replace function public.round_lock(p_season text, p_round int) returns timestamptz
language sql stable security definer set search_path = public as $$
  select min(f.kickoff) - make_interval(mins => s.lock_minutes)
  from public.fixtures f join public.seasons s on s.id = f.season_id
  where f.season_id = p_season and f.round = p_round
  group by s.lock_minutes;
$$;

create or replace function public.period_of(p_season text, p_round int) returns text
language sql stable security definer set search_path = public as $$
  select case when p_round = any (s.knockout_rounds) then 'knockout'
              else 'regular-' || ((p_round - 1) / s.team_count)::text end
  from public.seasons s where s.id = p_season;
$$;

-- Pick guard: runs on every insert/update of a pick.
create or replace function public.team_picks_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_entry public.entries%rowtype;
  v_game public.games%rowtype;
  v_fixture public.fixtures%rowtype;
  v_lock timestamptz;
  v_period text;
begin
  select * into v_entry from public.entries where id = new.entry_id;
  select * into v_game from public.games where id = v_entry.game_id;
  select * into v_fixture from public.fixtures where id = new.fixture_id;

  if not public.is_admin() and v_entry.user_id is distinct from auth.uid() then
    raise exception 'You can only pick for your own entry';
  end if;
  if v_fixture.season_id <> v_game.season_id or v_fixture.round <> new.round then
    raise exception 'That match is not in this round';
  end if;
  if new.team not in (v_fixture.home, v_fixture.away) then
    raise exception 'That team is not playing in this match';
  end if;
  if new.round < v_game.first_round then
    raise exception 'This game had not started in that round';
  end if;

  v_lock := public.round_lock(v_game.season_id, new.round);
  if not public.is_admin() and now() >= v_lock then
    raise exception 'This round is locked';
  end if;

  v_period := public.period_of(v_game.season_id, new.round);
  if v_period <> 'knockout' and exists (
    select 1 from public.team_picks p
    join public.fixtures f on f.id = p.fixture_id
    where p.entry_id = new.entry_id
      and p.round < new.round
      and p.team = new.team
      and f.status <> 'postponed'
      and public.period_of(v_game.season_id, p.round) = v_period
  ) then
    raise exception 'You have already used % in this period', new.team;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger team_picks_guard
before insert or update on public.team_picks
for each row execute function public.team_picks_guard();

-- Row level security ----------------------------------------------------

alter table public.competitions enable row level security;
alter table public.seasons enable row level security;
alter table public.fixtures enable row level security;
alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.games enable row level security;
alter table public.entries enable row level security;
alter table public.team_picks enable row level security;

create policy "read competitions" on public.competitions for select using (true);
create policy "read seasons" on public.seasons for select using (true);
create policy "read fixtures" on public.fixtures for select using (true);
create policy "admins update fixtures" on public.fixtures for update using (public.is_admin()) with check (public.is_admin());

create policy "read profiles" on public.profiles for select using (true);
create policy "insert own profile" on public.profiles for insert with check (id = auth.uid());
create policy "update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "admins see admins" on public.admins for select using (user_id = auth.uid());

create policy "read public games" on public.games for select using (is_public or public.is_admin());

create policy "read entries" on public.entries for select using (true);
create policy "join as yourself" on public.entries for insert with check (user_id = auth.uid());

-- Your own picks are always visible; everyone else's only after the round locks.
create policy "read picks" on public.team_picks for select using (
  exists (select 1 from public.entries e where e.id = entry_id and e.user_id = auth.uid())
  or now() >= public.round_lock(
    (select g.season_id from public.entries e join public.games g on g.id = e.game_id where e.id = entry_id),
    round)
  or public.is_admin()
);
create policy "make own picks" on public.team_picks for insert with check (
  exists (select 1 from public.entries e where e.id = entry_id and e.user_id = auth.uid())
);
create policy "change own picks" on public.team_picks for update using (
  exists (select 1 from public.entries e where e.id = entry_id and e.user_id = auth.uid())
) with check (
  exists (select 1 from public.entries e where e.id = entry_id and e.user_id = auth.uid())
);
