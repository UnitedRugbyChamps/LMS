"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/lib/store/StoreProvider";
import type { CurrentUser, GameData } from "@/lib/store/types";
import { currentRound, fixturesForRound, roundState } from "@/lib/engine/teamPick";
import type { Fixture } from "@/lib/engine/types";
import { formatDateTime, formatKickoff } from "@/lib/format";

export function AdminScreen({ gameId }: { gameId: string }) {
  const store = useStore();
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [data, setData] = useState<GameData | null>(null);
  const [round, setRound] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [u, d] = await Promise.all([store.getUser(), store.loadGame(gameId)]);
    setUser(u);
    setData(d);
  }, [store, gameId]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!data || user === undefined) return <p className="text-muted">Loading…</p>;
  if (!user?.isAdmin) {
    return (
      <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">
        Admins only. {store.mode === "live" ? "Ask the app owner to add your account to the admins list." : "Sign in on the Play page first."}
      </p>
    );
  }

  const now = store.now();
  const { game, fixtures } = data;
  // Default to the earliest locked round that still needs results, else the round being picked.
  const needsResults = Array.from(new Set(fixtures.map((f) => f.round)))
    .sort((a, b) => a - b)
    .find((x) => x >= game.firstRound && roundState(fixtures, x, game.rules, game.firstRound, now) === "locked" &&
      fixturesForRound(fixtures, x).some((f) => f.status === "scheduled"));
  const r = round ?? needsResults ?? currentRound(fixtures, game.rules, game.firstRound, now);
  const rounds = Array.from(new Set(fixtures.map((f) => f.round))).sort((a, b) => a - b);

  async function save(f: Fixture, update: Parameters<typeof store.setResult>[1]) {
    try {
      await store.setResult(f.id, update);
      setMessage(`Saved ${f.home} v ${f.away}.`);
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't save.");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>

      {store.mode === "demo" && store.setClockOffset && (
        <section className="rounded-xl border border-line bg-surface p-4 space-y-3">
          <h2 className="font-semibold">Demo clock</h2>
          <p className="text-sm text-muted">App time: {formatDateTime(now)}. Move the clock to test locking and later rounds.</p>
          <div className="flex flex-wrap gap-2 text-sm">
            {[
              ["+1 day", 86_400_000],
              ["+1 week", 7 * 86_400_000],
            ].map(([label, ms]) => (
              <button
                key={label as string}
                onClick={() => {
                  store.setClockOffset!((store.clockOffset?.() ?? 0) + (ms as number));
                  reload();
                }}
                className="rounded-full border border-line px-3 py-1"
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => {
                const first = fixturesForRound(fixtures, r)[0];
                if (first) store.setClockOffset!(Date.parse(first.kickoff) + 3 * 3_600_000 - Date.now());
                setRound(r);
                reload();
              }}
              className="rounded-full border border-line px-3 py-1"
            >
              Jump past Round {r} kickoff
            </button>
            <button
              onClick={() => {
                store.setClockOffset!(0);
                reload();
              }}
              className="rounded-full border border-line px-3 py-1"
            >
              Back to real time
            </button>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Results</h2>
          <select
            value={r}
            onChange={(e) => setRound(Number(e.target.value))}
            className="rounded-lg border border-line bg-surface px-2 py-1 text-sm"
          >
            {rounds.map((x) => (
              <option key={x} value={x}>
                Round {x}
              </option>
            ))}
          </select>
        </div>
        {message && <p className="text-sm text-good">{message}</p>}
        <ul className="space-y-2">
          {fixturesForRound(fixtures, r).map((f) => (
            <ResultRow key={f.id} fixture={f} onSave={(u) => save(f, u)} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function ResultRow({ fixture: f, onSave }: { fixture: Fixture; onSave: (u: Parameters<ReturnType<typeof useStore>["setResult"]>[1]) => void }) {
  const [home, setHome] = useState(f.homeScore?.toString() ?? "");
  const [away, setAway] = useState(f.awayScore?.toString() ?? "");
  const h = Number(home), a = Number(away);
  const valid = home !== "" && away !== "" && Number.isInteger(h) && Number.isInteger(a) && h >= 0 && a >= 0;

  return (
    <li className="rounded-xl border border-line bg-surface p-3 text-sm">
      <div className="mb-2 flex justify-between text-xs text-muted">
        <span>{formatKickoff(f.kickoff)}</span>
        <span>{f.status === "completed" ? "Result saved" : f.status === "postponed" ? "Postponed" : "No result"}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-28 flex-1 font-medium">{f.home}</span>
        <input inputMode="numeric" value={home} onChange={(e) => setHome(e.target.value)} className="w-14 rounded border border-line bg-bg px-2 py-1 text-center" aria-label={`${f.home} score`} />
        <span>–</span>
        <input inputMode="numeric" value={away} onChange={(e) => setAway(e.target.value)} className="w-14 rounded border border-line bg-bg px-2 py-1 text-center" aria-label={`${f.away} score`} />
        <span className="min-w-28 flex-1 text-right font-medium">{f.away}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          disabled={!valid}
          onClick={() => onSave({ status: "completed", result: h > a ? "home" : a > h ? "away" : "draw", homeScore: h, awayScore: a })}
          className="rounded-full bg-brand px-3 py-1 font-semibold text-brand-ink disabled:opacity-40"
        >
          Save result
        </button>
        <button onClick={() => onSave({ status: "postponed" })} className="rounded-full border border-line px-3 py-1">
          Mark postponed
        </button>
        <button onClick={() => { setHome(""); setAway(""); onSave({ status: "scheduled" }); }} className="rounded-full border border-line px-3 py-1">
          Clear
        </button>
      </div>
    </li>
  );
}
