import type {
  CompetitionRules,
  Entry,
  EntryStanding,
  Fixture,
  PickOutcome,
  RoundStage,
  TeamPick,
} from "./types";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export function stageOf(round: number, rules: CompetitionRules): RoundStage {
  return rules.knockoutRounds.includes(round) ? "knockout" : "regular";
}

/**
 * Which "period" a round belongs to. Within a period every pick must be a different team.
 * Regular rounds are grouped in blocks of `teamCount` (URC: 1-16, 17-18); knockouts are one period.
 */
export function periodOf(round: number, rules: CompetitionRules): string {
  if (stageOf(round, rules) === "knockout") return "knockout";
  return `regular-${Math.floor((round - 1) / rules.teamCount)}`;
}

export function fixturesForRound(fixtures: Fixture[], round: number): Fixture[] {
  return fixtures
    .filter((f) => f.round === round)
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));
}

/** Fixtures inside the round's main window (rearranged games weeks later are excluded). */
export function windowFixtures(roundFixtures: Fixture[], rules: CompetitionRules): Fixture[] {
  if (roundFixtures.length === 0) return [];
  const first = Math.min(...roundFixtures.map((f) => Date.parse(f.kickoff)));
  const cutoff = first + rules.roundWindowDays * DAY;
  return roundFixtures.filter((f) => Date.parse(f.kickoff) <= cutoff);
}

export function lockTime(roundFixtures: Fixture[], rules: CompetitionRules): Date | null {
  if (roundFixtures.length === 0) return null;
  const first = Math.min(...roundFixtures.map((f) => Date.parse(f.kickoff)));
  return new Date(first - rules.lockMinutesBeforeFirstKickoff * MINUTE);
}

export function opensAt(
  fixtures: Fixture[],
  round: number,
  rules: CompetitionRules,
  firstRound: number,
): Date | null {
  if (round <= firstRound) return null;
  const previous = windowFixtures(fixturesForRound(fixtures, round - 1), rules);
  if (previous.length === 0) return null;
  const last = Math.max(...previous.map((f) => Date.parse(f.kickoff)));
  return new Date(last + rules.openMinutesAfterPreviousRound * MINUTE);
}

export type RoundState = "upcoming" | "open" | "locked";

export function roundState(
  fixtures: Fixture[],
  round: number,
  rules: CompetitionRules,
  firstRound: number,
  now: Date,
): RoundState {
  const lock = lockTime(fixturesForRound(fixtures, round), rules);
  if (lock && now >= lock) return "locked";
  const open = opensAt(fixtures, round, rules, firstRound);
  if (open && now < open) return "upcoming";
  return "open";
}

/** The round players should be looking at: the earliest round that is not yet locked, else the last round. */
export function currentRound(
  fixtures: Fixture[],
  rules: CompetitionRules,
  firstRound: number,
  now: Date,
): number {
  const rounds = Array.from(new Set(fixtures.map((f) => f.round)))
    .filter((r) => r >= firstRound)
    .sort((a, b) => a - b);
  for (const r of rounds) {
    if (roundState(fixtures, r, rules, firstRound, now) !== "locked") return r;
  }
  return rounds.at(-1) ?? firstRound;
}

export function pickOutcome(pick: TeamPick, fixtures: Fixture[], rules: CompetitionRules, now: Date): PickOutcome {
  const fixture = fixtures.find((f) => f.id === pick.fixtureId);
  if (!fixture) return "void";
  if (fixture.status === "postponed") return "void";
  if (fixture.status !== "completed" || !fixture.result) {
    // Not completed: void once the round window has passed, otherwise still pending.
    const roundFx = fixturesForRound(fixtures, fixture.round);
    const first = Math.min(...roundFx.map((f) => Date.parse(f.kickoff)));
    if (now.getTime() > first + rules.roundWindowDays * DAY) return "void";
    return "pending";
  }
  if (fixture.result === "draw") return "draw";
  const winner = fixture.result === "home" ? fixture.home : fixture.away;
  return winner === pick.team ? "win" : "loss";
}

/** Teams already used by this entry in the same period as `round` (void picks do not count). */
export function usedTeams(
  entryId: string,
  round: number,
  picks: TeamPick[],
  fixtures: Fixture[],
  rules: CompetitionRules,
  now: Date,
): Set<string> {
  const period = periodOf(round, rules);
  const used = new Set<string>();
  for (const p of picks) {
    if (p.entryId !== entryId || p.round >= round) continue;
    if (periodOf(p.round, rules) !== period) continue;
    if (pickOutcome(p, fixtures, rules, now) === "void") continue;
    used.add(p.team);
  }
  return used;
}

export interface TeamOption {
  team: string;
  fixtureId: string;
  opponent: string;
  home: boolean;
  kickoff: string;
  available: boolean;
  reason?: "used" | "outside-window";
}

/**
 * Every team playing in the round, with whether this entry may pick it.
 * Knockout fallback: if every team still playing has already been used, all of them become available.
 */
export function teamOptions(
  entryId: string,
  round: number,
  picks: TeamPick[],
  fixtures: Fixture[],
  rules: CompetitionRules,
  now: Date,
): TeamOption[] {
  const roundFx = fixturesForRound(fixtures, round);
  const inWindow = new Set(windowFixtures(roundFx, rules).map((f) => f.id));
  const used = usedTeams(entryId, round, picks, fixtures, rules, now);
  const options: TeamOption[] = [];
  for (const f of roundFx) {
    for (const home of [true, false]) {
      const team = home ? f.home : f.away;
      const outside = !inWindow.has(f.id) || f.status === "postponed";
      const isUsed = used.has(team);
      options.push({
        team,
        fixtureId: f.id,
        opponent: home ? f.away : f.home,
        home,
        kickoff: f.kickoff,
        available: !outside && !isUsed,
        reason: outside ? "outside-window" : isUsed ? "used" : undefined,
      });
    }
  }
  const knockout = stageOf(round, rules) === "knockout";
  if (knockout && !options.some((o) => o.available)) {
    for (const o of options) {
      if (o.reason === "used") {
        o.available = true;
        o.reason = undefined;
      }
    }
  }
  return options;
}

export type PickCheck = { ok: true } | { ok: false; error: string };

export function validatePick(
  pick: TeamPick,
  picks: TeamPick[],
  fixtures: Fixture[],
  rules: CompetitionRules,
  firstRound: number,
  now: Date,
  standing?: EntryStanding,
): PickCheck {
  if (standing && standing.status === "out") return { ok: false, error: "You're out of this game." };
  if (pick.round < firstRound) return { ok: false, error: "This game hadn't started yet in that round." };
  const state = roundState(fixtures, pick.round, rules, firstRound, now);
  if (state === "locked") return { ok: false, error: "This round is locked." };
  if (state === "upcoming") return { ok: false, error: "This round isn't open yet." };
  const option = teamOptions(pick.entryId, pick.round, picks, fixtures, rules, now).find(
    (o) => o.team === pick.team && o.fixtureId === pick.fixtureId,
  );
  if (!option) return { ok: false, error: "That team isn't playing in this round." };
  if (!option.available) {
    return {
      ok: false,
      error:
        option.reason === "used"
          ? `You've already used ${pick.team} in this period.`
          : "That match is outside this round's window.",
    };
  }
  return { ok: true };
}

/**
 * Works out who is alive. Rules: a missed pick after the lock is out; draw or loss is out; void is through;
 * if every remaining entry goes out in the same round they are all reinstated.
 * Stops at the first round that is not locked or still has pending results.
 */
export function standings(
  entries: Entry[],
  picks: TeamPick[],
  fixtures: Fixture[],
  rules: CompetitionRules,
  firstRound: number,
  now: Date,
): { standings: EntryStanding[]; settledThrough: number | null } {
  const table = new Map<string, EntryStanding>(
    entries.map((e) => [
      e.id,
      { entryId: e.id, name: e.name, status: "alive", eliminatedRound: null, roundsSurvived: 0, reinstatedRounds: [] },
    ]),
  );
  const rounds = Array.from(new Set(fixtures.map((f) => f.round)))
    .filter((r) => r >= firstRound)
    .sort((a, b) => a - b);
  let settledThrough: number | null = null;

  for (const round of rounds) {
    if (roundState(fixtures, round, rules, firstRound, now) !== "locked") break;
    const alive = [...table.values()].filter((s) => s.status === "alive");
    if (alive.length === 0) break;
    const outcomes = new Map<string, PickOutcome | "missed">();
    for (const s of alive) {
      const pick = picks.find((p) => p.entryId === s.entryId && p.round === round);
      outcomes.set(s.entryId, pick ? pickOutcome(pick, fixtures, rules, now) : "missed");
    }
    if ([...outcomes.values()].includes("pending")) break;

    const losers = alive.filter((s) => {
      const o = outcomes.get(s.entryId);
      return o === "loss" || o === "draw" || o === "missed";
    });
    if (losers.length === alive.length) {
      for (const s of alive) {
        s.reinstatedRounds.push(round);
        s.roundsSurvived += 1;
      }
    } else {
      for (const s of alive) {
        if (losers.includes(s)) {
          s.status = "out";
          s.eliminatedRound = round;
        } else {
          s.roundsSurvived += 1;
        }
      }
    }
    settledThrough = round;
  }

  const sorted = [...table.values()].sort(
    (a, b) =>
      (a.status === "alive" ? 0 : 1) - (b.status === "alive" ? 0 : 1) ||
      (b.eliminatedRound ?? 0) - (a.eliminatedRound ?? 0) ||
      b.roundsSurvived - a.roundsSurvived ||
      a.name.localeCompare(b.name),
  );
  return { standings: sorted, settledThrough };
}
