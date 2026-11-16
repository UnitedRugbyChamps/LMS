import { describe, expect, it } from "vitest";
import { URC_FIXTURES } from "@/lib/data/urc-2026-27";
import { URC_RULES } from "./rules";
import {
  currentRound,
  lockTime,
  periodOf,
  pickOutcome,
  roundState,
  standings,
  teamOptions,
  validatePick,
  windowFixtures,
  fixturesForRound,
} from "./teamPick";
import type { CompetitionRules, Fixture, TeamPick } from "./types";

const rules = URC_RULES;

function complete(fixtures: Fixture[], id: string, result: Fixture["result"]): Fixture[] {
  return fixtures.map((f) => (f.id === id ? { ...f, status: "completed", result } : f));
}

describe("periods", () => {
  it("resets after as many rounds as there are teams", () => {
    expect(periodOf(1, rules)).toBe(periodOf(16, rules));
    expect(periodOf(16, rules)).not.toBe(periodOf(17, rules));
    expect(periodOf(17, rules)).toBe(periodOf(18, rules));
    expect(periodOf(19, rules)).toBe("knockout");
    expect(periodOf(21, rules)).toBe("knockout");
  });
  it("works for a 10-team league with 18 rounds", () => {
    const prem: CompetitionRules = { ...rules, teamCount: 10, knockoutRounds: [19, 20] };
    expect(periodOf(10, prem)).toBe(periodOf(1, prem));
    expect(periodOf(11, prem)).toBe(periodOf(18, prem));
    expect(periodOf(11, prem)).not.toBe(periodOf(10, prem));
  });
});

describe("fixture data", () => {
  it("has 18 rounds of 8 matches and converts London time to UTC", () => {
    expect(URC_FIXTURES).toHaveLength(144);
    const r1 = URC_FIXTURES.find((f) => f.id === "urc-2026-27-r1-1")!;
    expect(r1.kickoff).toBe("2026-09-25T18:45:00.000Z"); // 19:45 BST
    const r6 = URC_FIXTURES.find((f) => f.round === 6 && f.home === "Ospreys")!;
    expect(r6.kickoff).toBe("2026-12-04T19:45:00.000Z"); // 19:45 GMT
  });
  it("excludes rearranged round 8 games from the round window", () => {
    const r8 = windowFixtures(fixturesForRound(URC_FIXTURES, 8), rules);
    expect(r8).toHaveLength(6);
  });
});

describe("locking and opening", () => {
  it("locks 30 minutes before the first kickoff", () => {
    const lock = lockTime(fixturesForRound(URC_FIXTURES, 6), rules)!;
    expect(lock.toISOString()).toBe("2026-12-04T19:15:00.000Z");
  });
  it("opens the next round 2 hours after the previous round's last kickoff", () => {
    // Round 6 last kickoff 5 Dec 19:45 GMT; round 7 opens 21:45.
    expect(roundState(URC_FIXTURES, 7, rules, 6, new Date("2026-12-05T21:00:00Z"))).toBe("upcoming");
    expect(roundState(URC_FIXTURES, 7, rules, 6, new Date("2026-12-05T22:00:00Z"))).toBe("open");
  });
  it("finds the current round for a game starting at round 6", () => {
    expect(currentRound(URC_FIXTURES, rules, 6, new Date("2026-11-16T20:00:00Z"))).toBe(6);
    expect(currentRound(URC_FIXTURES, rules, 6, new Date("2026-12-06T10:00:00Z"))).toBe(7);
  });
});

describe("picking", () => {
  const now = new Date("2026-12-10T12:00:00Z"); // round 7 open
  const picks: TeamPick[] = [{ entryId: "a", round: 6, team: "Leinster", fixtureId: "urc-2026-27-r6-1" }];
  let fx = complete(URC_FIXTURES, "urc-2026-27-r6-1", "away"); // Leinster win away

  it("blocks a team already used in the period", () => {
    const check = validatePick(
      { entryId: "a", round: 7, team: "Leinster", fixtureId: "urc-2026-27-r7-7" },
      picks, fx, rules, 6, now,
    );
    expect(check.ok).toBe(false);
  });
  it("allows an unused team", () => {
    const check = validatePick(
      { entryId: "a", round: 7, team: "Glasgow Warriors", fixtureId: "urc-2026-27-r7-7" },
      picks, fx, rules, 6, now,
    );
    expect(check).toEqual({ ok: true });
  });
  it("gives a team back if its match was postponed", () => {
    fx = URC_FIXTURES.map((f) => (f.id === "urc-2026-27-r6-1" ? { ...f, status: "postponed" } : f));
    const opts = teamOptions("a", 7, picks, fx, rules, now);
    expect(opts.find((o) => o.team === "Leinster")!.available).toBe(true);
  });
  it("rejects picks once the round has locked", () => {
    const check = validatePick(
      { entryId: "a", round: 6, team: "Bulls", fixtureId: "urc-2026-27-r6-3" },
      [], URC_FIXTURES, rules, 6, now,
    );
    expect(check.ok).toBe(false);
  });
});

describe("outcomes", () => {
  const pick: TeamPick = { entryId: "a", round: 6, team: "Lions", fixtureId: "urc-2026-27-r6-3" };
  it("draw is out, win is through", () => {
    const now = new Date("2026-12-06T00:00:00Z");
    expect(pickOutcome(pick, complete(URC_FIXTURES, pick.fixtureId, "draw"), rules, now)).toBe("draw");
    expect(pickOutcome(pick, complete(URC_FIXTURES, pick.fixtureId, "home"), rules, now)).toBe("win");
    expect(pickOutcome(pick, URC_FIXTURES, rules, now)).toBe("pending");
  });
  it("an unplayed match becomes void after the round window", () => {
    expect(pickOutcome(pick, URC_FIXTURES, rules, new Date("2026-12-20T00:00:00Z"))).toBe("void");
  });
});

describe("knockouts", () => {
  const ko: Fixture[] = [
    { id: "qf1", round: 19, home: "Leinster", away: "Ospreys", kickoff: "2027-05-28T18:00:00Z", status: "completed", result: "home" },
    { id: "qf2", round: 19, home: "Bulls", away: "Munster", kickoff: "2027-05-29T14:00:00Z", status: "completed", result: "home" },
    { id: "sf1", round: 20, home: "Leinster", away: "Glasgow Warriors", kickoff: "2027-06-04T18:00:00Z", status: "completed", result: "home" },
    { id: "sf2", round: 20, home: "Bulls", away: "Stormers", kickoff: "2027-06-05T14:00:00Z", status: "completed", result: "home" },
    { id: "f", round: 21, home: "Leinster", away: "Bulls", kickoff: "2027-06-12T16:00:00Z", status: "scheduled" },
  ];
  const picks: TeamPick[] = [
    { entryId: "a", round: 19, team: "Leinster", fixtureId: "qf1" },
    { entryId: "a", round: 20, team: "Bulls", fixtureId: "sf2" },
  ];
  it("lets you pick a used team when every finalist is already used", () => {
    const opts = teamOptions("a", 21, picks, ko, rules, new Date("2027-06-08T00:00:00Z"));
    expect(opts.every((o) => o.available)).toBe(true);
  });
  it("still blocks a used team when another option exists", () => {
    const opts = teamOptions("b", 21, [{ entryId: "b", round: 20, team: "Leinster", fixtureId: "sf1" }], ko, rules, new Date("2027-06-08T00:00:00Z"));
    expect(opts.find((o) => o.team === "Leinster")!.available).toBe(false);
    expect(opts.find((o) => o.team === "Bulls")!.available).toBe(true);
  });
});

describe("standings", () => {
  const entries = [{ id: "a", name: "Ann" }, { id: "b", name: "Ben" }, { id: "c", name: "Cal" }];
  const after = new Date("2026-12-06T10:00:00Z");
  it("knocks out losers, draws and missed picks", () => {
    let fx = complete(URC_FIXTURES, "urc-2026-27-r6-3", "home"); // Lions beat Bulls
    fx = complete(fx, "urc-2026-27-r6-4", "draw");
    const picks: TeamPick[] = [
      { entryId: "a", round: 6, team: "Lions", fixtureId: "urc-2026-27-r6-3" },
      { entryId: "b", round: 6, team: "Sharks", fixtureId: "urc-2026-27-r6-4" },
    ];
    const { standings: table, settledThrough } = standings(entries, picks, fx, rules, 6, after);
    expect(settledThrough).toBe(6);
    expect(table[0]).toMatchObject({ entryId: "a", status: "alive", roundsSurvived: 1 });
    expect(table.find((s) => s.entryId === "b")).toMatchObject({ status: "out", eliminatedRound: 6 });
    expect(table.find((s) => s.entryId === "c")).toMatchObject({ status: "out", eliminatedRound: 6 });
  });
  it("reinstates everyone if all remaining players go out together", () => {
    const fx = complete(URC_FIXTURES, "urc-2026-27-r6-3", "away");
    const picks: TeamPick[] = entries.map((e) => ({ entryId: e.id, round: 6, team: "Lions", fixtureId: "urc-2026-27-r6-3" }));
    const { standings: table } = standings(entries, picks, fx, rules, 6, after);
    expect(table.every((s) => s.status === "alive" && s.reinstatedRounds.includes(6))).toBe(true);
  });
  it("waits while results are pending", () => {
    const picks: TeamPick[] = [{ entryId: "a", round: 6, team: "Lions", fixtureId: "urc-2026-27-r6-3" }];
    const { settledThrough } = standings(entries, picks, URC_FIXTURES, rules, 6, after);
    expect(settledThrough).toBeNull();
  });
});
