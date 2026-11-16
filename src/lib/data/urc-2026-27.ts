import type { Fixture } from "../engine/types";

/**
 * Official URC 2026/27 regular-season fixtures, copied from the existing Replit app.
 * Times are Europe/London local time; `londonToUtc` converts them.
 */
export const URC_TEAMS = [
  "Benetton", "Bulls", "Cardiff", "Connacht", "Dragons", "Edinburgh", "Glasgow Warriors", "Leinster",
  "Lions", "Munster", "Ospreys", "Scarlets", "Sharks", "Stormers", "Ulster", "Zebre",
] as const;

// [round, home, away, "YYYY-MM-DD HH:MM" London time]
type Row = [number, string, string, string];

const rows: Row[] = [
  [1, "Benetton", "Dragons", "2026-09-25 19:45"], [1, "Connacht", "Stormers", "2026-09-25 19:45"],
  [1, "Ulster", "Edinburgh", "2026-09-25 19:45"], [1, "Lions", "Leinster", "2026-09-26 12:30"],
  [1, "Sharks", "Ospreys", "2026-09-26 15:00"], [1, "Munster", "Glasgow Warriors", "2026-09-26 17:30"],
  [1, "Zebre", "Bulls", "2026-09-26 17:30"], [1, "Scarlets", "Cardiff", "2026-09-26 19:45"],

  [2, "Cardiff", "Zebre", "2026-10-02 19:45"], [2, "Edinburgh", "Stormers", "2026-10-02 19:45"],
  [2, "Benetton", "Connacht", "2026-10-02 19:45"], [2, "Lions", "Ospreys", "2026-10-03 12:45"],
  [2, "Dragons", "Scarlets", "2026-10-03 15:00"], [2, "Sharks", "Leinster", "2026-10-03 17:30"],
  [2, "Munster", "Bulls", "2026-10-03 19:45"], [2, "Glasgow Warriors", "Ulster", "2026-10-03 19:45"],

  [3, "Glasgow Warriors", "Connacht", "2026-10-09 19:45"], [3, "Dragons", "Ospreys", "2026-10-09 19:45"],
  [3, "Bulls", "Lions", "2026-10-10 12:30"], [3, "Zebre", "Edinburgh", "2026-10-10 15:00"],
  [3, "Scarlets", "Benetton", "2026-10-10 17:30"], [3, "Ulster", "Munster", "2026-10-10 17:30"],
  [3, "Leinster", "Cardiff", "2026-10-10 19:45"], [3, "Stormers", "Sharks", "2026-10-10 15:00"],

  [4, "Connacht", "Zebre", "2026-10-23 19:45"], [4, "Edinburgh", "Lions", "2026-10-23 19:45"],
  [4, "Bulls", "Ulster", "2026-10-24 12:45"], [4, "Stormers", "Scarlets", "2026-10-24 15:00"],
  [4, "Benetton", "Glasgow Warriors", "2026-10-24 15:00"], [4, "Leinster", "Munster", "2026-10-24 18:00"],
  [4, "Ospreys", "Dragons", "2026-10-24 19:45"], [4, "Cardiff", "Sharks", "2026-10-23 19:45"],

  [5, "Connacht", "Leinster", "2026-10-30 19:45"], [5, "Glasgow Warriors", "Lions", "2026-10-30 19:45"],
  [5, "Stormers", "Ulster", "2026-10-31 12:45"], [5, "Bulls", "Scarlets", "2026-10-31 15:00"],
  [5, "Benetton", "Edinburgh", "2026-10-31 15:00"], [5, "Dragons", "Zebre", "2026-10-31 17:30"],
  [5, "Ospreys", "Cardiff", "2026-10-31 19:45"], [5, "Munster", "Sharks", "2026-10-31 17:30"],

  [6, "Ospreys", "Leinster", "2026-12-04 19:45"], [6, "Edinburgh", "Dragons", "2026-12-04 19:45"],
  [6, "Lions", "Bulls", "2026-12-05 12:30"], [6, "Sharks", "Stormers", "2026-12-05 15:00"],
  [6, "Cardiff", "Ulster", "2026-12-05 15:00"], [6, "Scarlets", "Connacht", "2026-12-05 17:15"],
  [6, "Glasgow Warriors", "Benetton", "2026-12-05 19:45"], [6, "Zebre", "Munster", "2026-12-05 19:45"],

  [7, "Ulster", "Ospreys", "2026-12-18 19:45"], [7, "Munster", "Scarlets", "2026-12-18 19:45"],
  [7, "Zebre", "Benetton", "2026-12-19 13:30"], [7, "Stormers", "Lions", "2026-12-19 14:00"],
  [7, "Cardiff", "Dragons", "2026-12-19 15:00"], [7, "Sharks", "Bulls", "2026-12-19 16:30"],
  [7, "Leinster", "Glasgow Warriors", "2026-12-19 17:30"], [7, "Connacht", "Edinburgh", "2026-12-19 19:45"],

  [8, "Dragons", "Cardiff", "2026-12-26 15:00"], [8, "Ospreys", "Scarlets", "2026-12-26 17:30"],
  [8, "Benetton", "Zebre", "2026-12-27 13:30"], [8, "Edinburgh", "Glasgow Warriors", "2026-12-27 15:00"],
  [8, "Ulster", "Connacht", "2026-12-27 17:30"], [8, "Munster", "Leinster", "2026-12-27 19:45"],
  [8, "Bulls", "Stormers", "2027-02-21 13:00"], [8, "Lions", "Sharks", "2027-02-20 12:00"],

  [9, "Sharks", "Lions", "2027-01-02 15:00"], [9, "Zebre", "Glasgow Warriors", "2027-01-02 15:00"],
  [9, "Scarlets", "Dragons", "2027-01-02 15:00"], [9, "Connacht", "Munster", "2027-01-02 17:15"],
  [9, "Edinburgh", "Benetton", "2027-01-02 17:30"], [9, "Cardiff", "Ospreys", "2027-01-02 17:30"],
  [9, "Leinster", "Ulster", "2027-01-02 19:45"], [9, "Stormers", "Bulls", "2027-01-03 14:00"],

  [10, "Glasgow Warriors", "Scarlets", "2027-01-22 19:45"], [10, "Lions", "Zebre", "2027-01-23 12:45"],
  [10, "Stormers", "Cardiff", "2027-01-23 15:00"], [10, "Ospreys", "Edinburgh", "2027-01-23 15:00"],
  [10, "Benetton", "Bulls", "2027-01-23 17:30"], [10, "Leinster", "Dragons", "2027-01-23 17:30"],
  [10, "Munster", "Connacht", "2027-01-23 19:45"], [10, "Ulster", "Sharks", "2027-01-22 19:45"],

  [11, "Dragons", "Munster", "2027-01-29 19:45"], [11, "Glasgow Warriors", "Ospreys", "2027-01-29 19:45"],
  [11, "Lions", "Cardiff", "2027-01-30 12:45"], [11, "Stormers", "Zebre", "2027-01-30 15:00"],
  [11, "Scarlets", "Edinburgh", "2027-01-30 15:00"], [11, "Leinster", "Bulls", "2027-01-30 17:30"],
  [11, "Connacht", "Ulster", "2027-01-30 19:45"], [11, "Benetton", "Sharks", "2027-01-30 19:45"],

  [12, "Munster", "Benetton", "2027-02-26 19:45"], [12, "Dragons", "Ulster", "2027-02-26 19:45"],
  [12, "Lions", "Stormers", "2027-02-27 12:30"], [12, "Cardiff", "Glasgow Warriors", "2027-02-27 15:00"],
  [12, "Zebre", "Scarlets", "2027-02-27 17:30"], [12, "Ospreys", "Connacht", "2027-02-27 17:30"],
  [12, "Edinburgh", "Leinster", "2027-02-27 19:45"], [12, "Bulls", "Sharks", "2027-02-27 15:00"],

  [13, "Sharks", "Edinburgh", "2027-03-19 17:00"], [13, "Glasgow Warriors", "Stormers", "2027-03-19 19:45"],
  [13, "Connacht", "Cardiff", "2027-03-19 19:45"], [13, "Ulster", "Zebre", "2027-03-20 15:00"],
  [13, "Bulls", "Dragons", "2027-03-20 15:00"], [13, "Munster", "Ospreys", "2027-03-20 17:30"],
  [13, "Scarlets", "Lions", "2027-03-20 17:30"], [13, "Leinster", "Benetton", "2027-03-20 19:45"],

  [14, "Glasgow Warriors", "Zebre", "2027-03-26 19:45"], [14, "Scarlets", "Leinster", "2027-03-26 19:45"],
  [14, "Bulls", "Edinburgh", "2027-03-27 12:00"], [14, "Connacht", "Lions", "2027-03-27 14:15"],
  [14, "Sharks", "Dragons", "2027-03-27 16:30"], [14, "Cardiff", "Munster", "2027-03-27 17:30"],
  [14, "Benetton", "Ulster", "2027-03-27 19:45"], [14, "Ospreys", "Stormers", "2027-03-27 19:45"],

  [15, "Dragons", "Glasgow Warriors", "2027-04-16 19:45"], [15, "Edinburgh", "Cardiff", "2027-04-16 19:45"],
  [15, "Lions", "Munster", "2027-04-17 12:45"], [15, "Stormers", "Benetton", "2027-04-17 15:00"],
  [15, "Ospreys", "Bulls", "2027-04-17 17:30"], [15, "Leinster", "Connacht", "2027-04-17 17:45"],
  [15, "Ulster", "Scarlets", "2027-04-17 19:45"], [15, "Zebre", "Sharks", "2027-04-17 19:45"],

  [16, "Zebre", "Ospreys", "2027-04-23 18:00"], [16, "Ulster", "Leinster", "2027-04-23 19:45"],
  [16, "Cardiff", "Bulls", "2027-04-23 20:05"], [16, "Lions", "Benetton", "2027-04-24 12:45"],
  [16, "Stormers", "Munster", "2027-04-24 17:05"], [16, "Glasgow Warriors", "Edinburgh", "2027-04-24 17:45"],
  [16, "Connacht", "Dragons", "2027-04-24 19:45"], [16, "Scarlets", "Sharks", "2027-04-24 15:00"],

  [17, "Dragons", "Lions", "2027-05-07 19:45"], [17, "Edinburgh", "Zebre", "2027-05-07 19:45"],
  [17, "Sharks", "Connacht", "2027-05-08 12:30"], [17, "Bulls", "Glasgow Warriors", "2027-05-08 15:00"],
  [17, "Munster", "Ulster", "2027-05-08 17:15"], [17, "Scarlets", "Ospreys", "2027-05-08 17:30"],
  [17, "Leinster", "Stormers", "2027-05-08 19:45"], [17, "Benetton", "Cardiff", "2027-05-08 19:45"],

  [18, "Ospreys", "Benetton", "2027-05-14 19:45"], [18, "Ulster", "Lions", "2027-05-14 19:45"],
  [18, "Edinburgh", "Munster", "2027-05-14 19:45"], [18, "Bulls", "Connacht", "2027-05-15 12:30"],
  [18, "Cardiff", "Scarlets", "2027-05-15 15:00"], [18, "Sharks", "Glasgow Warriors", "2027-05-15 15:00"],
  [18, "Dragons", "Stormers", "2027-05-15 17:30"], [18, "Zebre", "Leinster", "2027-05-15 17:30"],
];

/** Converts a Europe/London wall-clock time in the 2026/27 season to a UTC ISO string. */
export function londonToUtc(local: string): string {
  const [date, time] = local.split(" ");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // UK clocks: BST (UTC+1) until 25 Oct 2026, GMT until 28 Mar 2027, then BST again.
  const bstEnds = Date.UTC(2026, 9, 25, 1);
  const bstStarts = Date.UTC(2027, 2, 28, 1);
  const inBst = asUtc < bstEnds || asUtc >= bstStarts;
  return new Date(asUtc - (inBst ? 3_600_000 : 0)).toISOString();
}

export const URC_FIXTURES: Fixture[] = rows.map(([round, home, away, local], i) => ({
  id: `urc-2026-27-r${round}-${(i % 8) + 1}`,
  round,
  home,
  away,
  kickoff: londonToUtc(local),
  status: "scheduled",
}));
