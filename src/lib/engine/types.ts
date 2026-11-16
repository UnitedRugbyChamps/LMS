export type FixtureStatus = "scheduled" | "completed" | "postponed";
export type FixtureResult = "home" | "away" | "draw";

export interface Fixture {
  id: string;
  round: number;
  home: string;
  away: string;
  /** UTC ISO kickoff time */
  kickoff: string;
  status: FixtureStatus;
  result?: FixtureResult;
  homeScore?: number;
  awayScore?: number;
}

export type RoundStage = "regular" | "knockout";

export interface CompetitionRules {
  /** Number of teams in the competition; the used-team list resets every `teamCount` regular rounds. */
  teamCount: number;
  /** Round numbers that are knockout rounds. Knockouts are always their own period. */
  knockoutRounds: number[];
  /** Minutes before the round's first kickoff that all picks lock. */
  lockMinutesBeforeFirstKickoff: number;
  /** Minutes after the previous round's last main-window kickoff that the next round opens. */
  openMinutesAfterPreviousRound: number;
  /** Fixtures more than this many days after the round's first kickoff are outside the round window. */
  roundWindowDays: number;
}

export interface TeamPick {
  entryId: string;
  round: number;
  team: string;
  fixtureId: string;
}

export type PickOutcome = "win" | "loss" | "draw" | "void" | "pending";

export interface Entry {
  id: string;
  name: string;
}

export interface EntryStanding {
  entryId: string;
  name: string;
  status: "alive" | "out";
  eliminatedRound: number | null;
  roundsSurvived: number;
  /** Rounds where everyone went out and this entry was reinstated. */
  reinstatedRounds: number[];
}
