import type { Entry, Fixture, FixtureResult, TeamPick } from "../engine/types";
import type { CompetitionRules } from "../engine/types";

export interface Game {
  id: string;
  name: string;
  competition: string;
  seasonName: string;
  firstRound: number;
  rules: CompetitionRules;
}

export interface CurrentUser {
  id: string;
  displayName: string | null;
  email: string | null;
  isAdmin: boolean;
}

export interface GameData {
  game: Game;
  fixtures: Fixture[];
  entries: (Entry & { userId: string })[];
  picks: TeamPick[];
}

export interface Store {
  /** "demo" keeps everything in this browser; "live" uses Supabase. */
  mode: "demo" | "live";
  now(): Date;
  getUser(): Promise<CurrentUser | null>;
  signIn(email: string): Promise<void>;
  signOut(): Promise<void>;
  setDisplayName(name: string): Promise<void>;
  loadGame(gameId: string): Promise<GameData>;
  joinGame(gameId: string, displayName: string): Promise<void>;
  savePick(gameId: string, pick: Omit<TeamPick, "entryId">): Promise<void>;
  setResult(
    fixtureId: string,
    update: { status: Fixture["status"]; result?: FixtureResult; homeScore?: number; awayScore?: number },
  ): Promise<void>;
  /** Demo only: move the clock to test locking and later rounds. */
  setClockOffset?(ms: number): void;
  clockOffset?(): number;
}
