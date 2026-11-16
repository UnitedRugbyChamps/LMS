import { URC_FIXTURES } from "../data/urc-2026-27";
import { URC_RULES } from "../engine/rules";
import { teamOptions, roundState } from "../engine/teamPick";
import type { Fixture, TeamPick } from "../engine/types";
import type { CurrentUser, Game, GameData, Store } from "./types";

const KEY = "rugby-lms-demo-v1";
export const MAIN_GAME_ID = "urc-2026-27-main";

const GAME: Game = {
  id: MAIN_GAME_ID,
  name: "URC 2026/27 Last Man Standing",
  competition: "URC",
  seasonName: "2026/27",
  firstRound: 6,
  rules: URC_RULES,
};

const RIVALS = ["Thandi", "Rhys", "Ciara", "Marco", "Pieter"];

interface DemoState {
  user: CurrentUser | null;
  joined: boolean;
  picks: TeamPick[];
  results: Record<string, Pick<Fixture, "status" | "result" | "homeScore" | "awayScore">>;
  clockOffset: number;
}

const blank: DemoState = { user: null, joined: false, picks: [], results: {}, clockOffset: 0 };

function read(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...blank, ...JSON.parse(raw) } : { ...blank };
  } catch {
    return { ...blank };
  }
}

function write(state: DemoState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: demo still works for this page view */
  }
}

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function fixturesWithResults(state: DemoState): Fixture[] {
  return URC_FIXTURES.map((f) => ({ ...f, ...(state.results[f.id] ?? {}) }));
}

/** Rival players pick automatically: one deterministic available team per locked or open round. */
function rivalPicks(fixtures: Fixture[], now: Date): TeamPick[] {
  const picks: TeamPick[] = [];
  const rounds = Array.from(new Set(fixtures.map((f) => f.round))).filter((r) => r >= GAME.firstRound).sort((a, b) => a - b);
  for (const round of rounds) {
    if (roundState(fixtures, round, GAME.rules, GAME.firstRound, now) === "upcoming") break;
    for (const name of RIVALS) {
      const entryId = `rival-${name}`;
      const options = teamOptions(entryId, round, picks, fixtures, GAME.rules, now).filter((o) => o.available && o.home);
      const pool = options.length ? options : teamOptions(entryId, round, picks, fixtures, GAME.rules, now).filter((o) => o.available);
      if (!pool.length) continue;
      const o = pool[hash(name + round) % pool.length];
      picks.push({ entryId, round, team: o.team, fixtureId: o.fixtureId });
    }
  }
  return picks;
}

export function createDemoStore(): Store {
  return {
    mode: "demo",
    now: () => new Date(Date.now() + read().clockOffset),
    async getUser() {
      return read().user;
    },
    async signIn(email) {
      const s = read();
      s.user = { id: "demo-user", email, displayName: s.user?.displayName ?? null, isAdmin: true };
      write(s);
    },
    async signOut() {
      write({ ...blank });
    },
    async setDisplayName(name) {
      const s = read();
      if (s.user) s.user.displayName = name;
      write(s);
    },
    async loadGame(): Promise<GameData> {
      const s = read();
      const fixtures = fixturesWithResults(s);
      const now = new Date(Date.now() + s.clockOffset);
      const entries = RIVALS.map((name) => ({ id: `rival-${name}`, name, userId: `rival-${name}` }));
      if (s.joined && s.user) entries.push({ id: "me", name: s.user.displayName ?? "You", userId: s.user.id });
      return { game: GAME, fixtures, entries, picks: [...rivalPicks(fixtures, now), ...s.picks] };
    },
    async joinGame(_gameId, displayName) {
      const s = read();
      if (!s.user) throw new Error("Sign in first.");
      s.user.displayName = displayName;
      s.joined = true;
      write(s);
    },
    async savePick(_gameId, pick) {
      const s = read();
      s.picks = s.picks.filter((p) => p.round !== pick.round);
      s.picks.push({ ...pick, entryId: "me" });
      write(s);
    },
    async setResult(fixtureId, update) {
      const s = read();
      s.results[fixtureId] = update;
      write(s);
    },
    setClockOffset(ms) {
      const s = read();
      s.clockOffset = ms;
      write(s);
    },
    clockOffset: () => read().clockOffset,
  };
}
