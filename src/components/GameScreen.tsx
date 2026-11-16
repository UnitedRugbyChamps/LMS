"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store/StoreProvider";
import type { CurrentUser, GameData } from "@/lib/store/types";
import {
  currentRound,
  fixturesForRound,
  lockTime,
  opensAt,
  pickOutcome,
  roundState,
  standings,
  teamOptions,
  validatePick,
} from "@/lib/engine/teamPick";
import type { TeamOption } from "@/lib/engine/teamPick";
import type { PickOutcome } from "@/lib/engine/types";
import { formatDateTime, formatKickoff, timeUntil } from "@/lib/format";
import { JoinForm, SignInForm } from "./AuthGate";

type Tab = "pick" | "standings" | "history";

export function GameScreen({ gameId }: { gameId: string }) {
  const store = useStore();
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [data, setData] = useState<GameData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pick");
  const [viewRound, setViewRound] = useState<number | null>(null);
  const [, setTick] = useState(0);

  const reload = useCallback(async () => {
    try {
      const [u, d] = await Promise.all([store.getUser(), store.loadGame(gameId)]);
      setUser(u);
      setData(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load the game.");
    }
  }, [store, gameId]);

  useEffect(() => {
    reload();
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [reload]);

  const now = store.now();
  const myEntry = useMemo(
    () => (data && user ? data.entries.find((e) => e.userId === user.id) : undefined),
    [data, user],
  );

  if (error) return <p className="rounded-xl border border-bad/40 bg-bad/10 p-4 text-bad">{error}</p>;
  if (!data || user === undefined) return <p className="text-muted">Loading…</p>;

  const { game, fixtures, entries, picks } = data;
  const rules = game.rules;
  const live = currentRound(fixtures, rules, game.firstRound, now);
  const round = viewRound ?? live;
  const rounds = Array.from(new Set(fixtures.map((f) => f.round))).filter((r) => r >= game.firstRound).sort((a, b) => a - b);
  const table = standings(entries, picks, fixtures, rules, game.firstRound, now);
  const me = myEntry ? table.standings.find((s) => s.entryId === myEntry.id) : undefined;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-muted">{game.competition} · {game.seasonName}</p>
        <h1 className="text-2xl font-bold">{game.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {table.standings.filter((s) => s.status === "alive").length} of {entries.length} players still standing
        </p>
      </div>

      {!user && <SignInForm onDone={reload} />}
      {user && !myEntry && (
        <JoinForm
          gameName={game.name}
          defaultName={user.displayName ?? ""}
          onJoin={async (name) => {
            await store.joinGame(game.id, name);
            await reload();
          }}
        />
      )}

      {me && <StatusCard status={me.status} eliminatedRound={me.eliminatedRound} survived={me.roundsSurvived} />}

      <div className="flex gap-1 rounded-full bg-surface-2 p-1 text-sm font-medium">
        {(["pick", "standings", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full px-3 py-1.5 ${tab === t ? "bg-surface shadow-sm" : "text-muted"}`}
          >
            {t === "pick" ? "Make a pick" : t === "standings" ? "Standings" : "My picks"}
          </button>
        ))}
      </div>

      {tab === "pick" && (
        <RoundPanel
          data={data}
          round={round}
          rounds={rounds}
          onRound={setViewRound}
          entryId={myEntry?.id}
          canPick={!!myEntry && me?.status !== "out"}
          now={now}
          onSaved={reload}
        />
      )}
      {tab === "standings" && <StandingsPanel table={table.standings} settledThrough={table.settledThrough} myEntryId={myEntry?.id} />}
      {tab === "history" && myEntry && <HistoryPanel data={data} entryId={myEntry.id} now={now} />}
      {tab === "history" && !myEntry && <p className="text-sm text-muted">Join the game to see your picks.</p>}

      <PeriodNote round={live} rules={rules} lastRegular={Math.max(...rounds.filter((r) => !rules.knockoutRounds.includes(r)))} />
    </div>
  );
}

function PeriodNote({ round, rules, lastRegular }: { round: number; rules: GameData["game"]["rules"]; lastRegular: number }) {
  if (rules.knockoutRounds.includes(round)) {
    return <p className="text-xs text-muted">Knockouts are their own period: every knockout pick must be a different team.</p>;
  }
  const start = Math.floor((round - 1) / rules.teamCount) * rules.teamCount + 1;
  const end = Math.min(start + rules.teamCount - 1, lastRegular);
  return (
    <p className="text-xs text-muted">
      This period runs Rounds {start} to {end}. You can use each team once in it; your used teams reset after Round {end}.
    </p>
  );
}

function StatusCard({ status, eliminatedRound, survived }: { status: "alive" | "out"; eliminatedRound: number | null; survived: number }) {
  return status === "alive" ? (
    <div className="rounded-xl border border-good/40 bg-good/10 p-4">
      <p className="font-semibold text-good">You&apos;re still standing</p>
      <p className="text-sm text-muted">Rounds survived: {survived}</p>
    </div>
  ) : (
    <div className="rounded-xl border border-bad/40 bg-bad/10 p-4">
      <p className="font-semibold text-bad">You&apos;re out</p>
      <p className="text-sm text-muted">Knocked out in Round {eliminatedRound} after surviving {survived} round{survived === 1 ? "" : "s"}.</p>
    </div>
  );
}

function RoundPanel({
  data, round, rounds, onRound, entryId, canPick, now, onSaved,
}: {
  data: GameData; round: number; rounds: number[]; onRound: (r: number) => void;
  entryId?: string; canPick: boolean; now: Date; onSaved: () => Promise<void>;
}) {
  const store = useStore();
  const { game, fixtures, picks } = data;
  const rules = game.rules;
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const roundFx = fixturesForRound(fixtures, round);
  const state = roundState(fixtures, round, rules, game.firstRound, now);
  const lock = lockTime(roundFx, rules);
  const open = opensAt(fixtures, round, rules, game.firstRound);
  const myPick = entryId ? picks.find((p) => p.entryId === entryId && p.round === round) : undefined;
  const options = entryId ? teamOptions(entryId, round, picks, fixtures, rules, now) : [];
  const optionFor = (team: string, fixtureId: string) => options.find((o) => o.team === team && o.fixtureId === fixtureId);
  const idx = rounds.indexOf(round);
  const tally = state === "locked" ? countPicks(picks.filter((p) => p.round === round).map((p) => p.team)) : null;

  async function choose(o: TeamOption) {
    if (!entryId) return;
    const check = validatePick({ entryId, round, team: o.team, fixtureId: o.fixtureId }, picks, fixtures, rules, game.firstRound, now);
    if (!check.ok) {
      setMessage({ kind: "error", text: check.error });
      return;
    }
    setSaving(o.team);
    setMessage(null);
    try {
      await store.savePick(game.id, { round, team: o.team, fixtureId: o.fixtureId });
      await onSaved();
      setMessage({ kind: "ok", text: `Saved: ${o.team} to beat ${o.opponent}. You can change it until the lock.` });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Couldn't save your pick." });
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          disabled={idx <= 0}
          onClick={() => onRound(rounds[idx - 1])}
          className="rounded-full border border-line px-3 py-1 text-sm disabled:opacity-30"
          aria-label="Previous round"
        >
          ←
        </button>
        <div className="text-center">
          <h2 className="text-lg font-semibold">
            Round {round}
            {rules.knockoutRounds.includes(round) ? " · Knockout" : ""}
          </h2>
          <p className="text-xs text-muted">
            {state === "open" && lock && <>Locks {formatDateTime(lock)} · in {timeUntil(lock, now)}</>}
            {state === "upcoming" && open && <>Opens {formatDateTime(open)}</>}
            {state === "locked" && <>Locked</>}
          </p>
        </div>
        <button
          disabled={idx >= rounds.length - 1}
          onClick={() => onRound(rounds[idx + 1])}
          className="rounded-full border border-line px-3 py-1 text-sm disabled:opacity-30"
          aria-label="Next round"
        >
          →
        </button>
      </div>

      {myPick && (
        <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm">
          Your pick: <strong>{myPick.team}</strong>
          {state === "locked" && <OutcomeBadge outcome={pickOutcome(myPick, fixtures, rules, now)} />}
        </p>
      )}
      {message && (
        <p className={`rounded-lg px-3 py-2 text-sm ${message.kind === "ok" ? "bg-good/10 text-good" : "bg-bad/10 text-bad"}`}>{message.text}</p>
      )}

      <ul className="space-y-2">
        {roundFx.map((f) => (
          <li key={f.id} className="rounded-xl border border-line bg-surface p-3">
            <div className="mb-2 flex justify-between text-xs text-muted">
              <span>{formatKickoff(f.kickoff)}</span>
              <span>
                {f.status === "completed" && f.result
                  ? f.homeScore !== undefined && f.awayScore !== undefined
                    ? `FT ${f.homeScore}–${f.awayScore}`
                    : "Full time"
                  : f.status === "postponed"
                    ? "Postponed"
                    : ""}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[f.home, f.away].map((team) => {
                const o = optionFor(team, f.id);
                const picked = myPick?.team === team && myPick.fixtureId === f.id;
                const won = f.status === "completed" && f.result && (f.result === "home" ? f.home : f.result === "away" ? f.away : null) === team;
                const disabled = !canPick || state !== "open" || !o?.available || saving !== null;
                return (
                  <button
                    key={team}
                    disabled={disabled}
                    onClick={() => o && choose(o)}
                    className={`rounded-lg border px-3 py-3 text-left text-sm font-semibold transition ${
                      picked
                        ? "border-brand bg-brand text-brand-ink"
                        : o && !o.available
                          ? "border-line bg-surface-2 text-muted line-through"
                          : "border-line hover:border-brand"
                    } disabled:cursor-not-allowed`}
                  >
                    <span className="block">{team}{won ? " ✓" : ""}</span>
                    <span className={`block text-xs font-normal ${picked ? "opacity-80" : "text-muted"}`}>
                      {team === f.home ? "Home" : "Away"}
                      {o?.reason === "used" ? " · used" : o?.reason === "outside-window" ? " · rearranged" : ""}
                      {tally?.[team] ? ` · ${tally[team]} pick${tally[team] === 1 ? "" : "s"}` : ""}
                      {saving === team ? " · saving…" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      {state !== "locked" && <p className="text-xs text-muted">Other players&apos; picks appear once the round locks.</p>}
    </section>
  );
}

function countPicks(teams: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of teams) out[t] = (out[t] ?? 0) + 1;
  return out;
}

function OutcomeBadge({ outcome }: { outcome: PickOutcome }) {
  const map: Record<PickOutcome, [string, string]> = {
    win: ["Won", "bg-good/15 text-good"],
    loss: ["Lost", "bg-bad/15 text-bad"],
    draw: ["Draw", "bg-bad/15 text-bad"],
    void: ["Void, through", "bg-warn/15 text-warn"],
    pending: ["Awaiting result", "bg-surface-2 text-muted"],
  };
  const [label, cls] = map[outcome];
  return <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

function StandingsPanel({
  table, settledThrough, myEntryId,
}: {
  table: ReturnType<typeof standings>["standings"]; settledThrough: number | null; myEntryId?: string;
}) {
  return (
    <section className="space-y-2">
      <p className="text-xs text-muted">{settledThrough ? `Settled through Round ${settledThrough}.` : "No rounds settled yet."}</p>
      <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {table.map((s, i) => (
          <li key={s.entryId} className={`flex items-center justify-between px-4 py-3 ${s.entryId === myEntryId ? "bg-brand/5" : ""}`}>
            <span className="flex items-center gap-3">
              <span className="w-5 text-right text-sm text-muted">{i + 1}</span>
              <span className="font-medium">
                {s.name}
                {s.entryId === myEntryId ? " (you)" : ""}
              </span>
            </span>
            <span className="text-sm">
              {s.status === "alive" ? (
                <span className="font-semibold text-good">Alive · {s.roundsSurvived}</span>
              ) : (
                <span className="text-muted">Out in R{s.eliminatedRound}</span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function HistoryPanel({ data, entryId, now }: { data: GameData; entryId: string; now: Date }) {
  const { picks, fixtures, game } = data;
  const mine = picks.filter((p) => p.entryId === entryId).sort((a, b) => a.round - b.round);
  if (!mine.length) return <p className="text-sm text-muted">No picks yet.</p>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
      {mine.map((p) => {
        const f = fixtures.find((x) => x.id === p.fixtureId);
        const opp = f ? (f.home === p.team ? f.away : f.home) : "";
        return (
          <li key={p.round} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>
              <span className="text-muted">R{p.round}</span> <strong>{p.team}</strong> <span className="text-muted">v {opp}</span>
            </span>
            {roundState(fixtures, p.round, game.rules, game.firstRound, now) === "locked" ? (
              <OutcomeBadge outcome={pickOutcome(p, fixtures, game.rules, now)} />
            ) : (
              <span className="text-xs text-muted">Can change</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
