import { createBrowserClient } from "@supabase/ssr";
import type { Fixture, TeamPick } from "../engine/types";
import type { Game, GameData, Store } from "./types";

interface SeasonRow {
  id: string;
  name: string;
  team_count: number;
  knockout_rounds: number[];
  lock_minutes: number;
  open_minutes: number;
  window_days: number;
  competitions: { short_name: string } | null;
}

export function createSupabaseStore(url: string, key: string): Store {
  const db = createBrowserClient(url, key);

  async function userId(): Promise<string> {
    const { data } = await db.auth.getUser();
    if (!data.user) throw new Error("Please sign in first.");
    return data.user.id;
  }

  return {
    mode: "live",
    now: () => new Date(),

    async getUser() {
      const { data } = await db.auth.getUser();
      if (!data.user) return null;
      const [{ data: profile }, { data: admin }] = await Promise.all([
        db.from("profiles").select("display_name").eq("id", data.user.id).maybeSingle(),
        db.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle(),
      ]);
      return {
        id: data.user.id,
        email: data.user.email ?? null,
        displayName: profile?.display_name ?? null,
        isAdmin: !!admin,
      };
    },

    async signIn(email) {
      const { error } = await db.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/play` },
      });
      if (error) throw error;
    },

    async signOut() {
      await db.auth.signOut();
    },

    async setDisplayName(name) {
      const id = await userId();
      const { error } = await db.from("profiles").upsert({ id, display_name: name });
      if (error) throw error;
    },

    async loadGame(gameId): Promise<GameData> {
      const { data: g, error } = await db
        .from("games")
        .select("id, name, first_round, season_id, seasons(id, name, team_count, knockout_rounds, lock_minutes, open_minutes, window_days, competitions(short_name))")
        .eq("id", gameId)
        .single();
      if (error) throw error;
      const season = g.seasons as unknown as SeasonRow;
      const game: Game = {
        id: g.id,
        name: g.name,
        competition: season.competitions?.short_name ?? "",
        seasonName: season.name,
        firstRound: g.first_round,
        rules: {
          teamCount: season.team_count,
          knockoutRounds: season.knockout_rounds,
          lockMinutesBeforeFirstKickoff: season.lock_minutes,
          openMinutesAfterPreviousRound: season.open_minutes,
          roundWindowDays: season.window_days,
        },
      };
      const [fx, en, pk] = await Promise.all([
        db.from("fixtures").select("*").eq("season_id", g.season_id).order("kickoff"),
        db.from("entries").select("id, user_id, display_name").eq("game_id", gameId),
        db.from("team_picks").select("entry_id, round, team, fixture_id, entries!inner(game_id)").eq("entries.game_id", gameId),
      ]);
      for (const r of [fx, en, pk]) if (r.error) throw r.error;
      const fixtures: Fixture[] = (fx.data ?? []).map((f) => ({
        id: f.id,
        round: f.round,
        home: f.home,
        away: f.away,
        kickoff: f.kickoff,
        status: f.status,
        result: f.result ?? undefined,
        homeScore: f.home_score ?? undefined,
        awayScore: f.away_score ?? undefined,
      }));
      const entries = (en.data ?? []).map((e) => ({ id: e.id, userId: e.user_id, name: e.display_name }));
      const picks: TeamPick[] = (pk.data ?? []).map((p) => ({
        entryId: p.entry_id,
        round: p.round,
        team: p.team,
        fixtureId: p.fixture_id,
      }));
      return { game, fixtures, entries, picks };
    },

    async joinGame(gameId, displayName) {
      const id = await userId();
      await db.from("profiles").upsert({ id, display_name: displayName });
      const { error } = await db.from("entries").insert({ game_id: gameId, user_id: id, display_name: displayName });
      if (error && error.code !== "23505") throw error; // already joined is fine
    },

    async savePick(gameId, pick) {
      const id = await userId();
      const { data: entry, error: entryError } = await db
        .from("entries")
        .select("id")
        .eq("game_id", gameId)
        .eq("user_id", id)
        .single();
      if (entryError) throw new Error("Join the game first.");
      const { error } = await db
        .from("team_picks")
        .upsert(
          { entry_id: entry.id, round: pick.round, team: pick.team, fixture_id: pick.fixtureId },
          { onConflict: "entry_id,round" },
        );
      if (error) throw new Error(error.message);
    },

    async setResult(fixtureId, update) {
      const { error } = await db
        .from("fixtures")
        .update({
          status: update.status,
          result: update.result ?? null,
          home_score: update.homeScore ?? null,
          away_score: update.awayScore ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", fixtureId);
      if (error) throw error;
    },
  };
}
