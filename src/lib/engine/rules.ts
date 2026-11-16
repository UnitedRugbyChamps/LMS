import type { CompetitionRules } from "./types";

export const URC_RULES: CompetitionRules = {
  teamCount: 16,
  knockoutRounds: [19, 20, 21],
  lockMinutesBeforeFirstKickoff: 30,
  openMinutesAfterPreviousRound: 120,
  roundWindowDays: 7,
};
