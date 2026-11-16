import Link from "next/link";

const games = [
  { name: "URC Last Man Standing", detail: "Team Pick · 2026/27 · from Round 6", status: "live", href: "/play" },
  { name: "Six Nations Last Man Standing", detail: "Team Pick · February 2027", status: "soon" },
  { name: "Premiership Last Man Standing", detail: "Team Pick · 2026/27", status: "soon" },
  { name: "Predictor", detail: "Winner and margin band, banker, upset bonus", status: "soon" },
  { name: "Matchday Five", detail: "Pick 5 real players, score from tries and kicks", status: "soon" },
  { name: "Weekly Challenge", detail: "50/50 player props, priced from the odds", status: "soon" },
  { name: "Rugby World Cup 2027", detail: "Team Pick · Australia, from 1 October 2027", status: "soon" },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-brand p-6 text-brand-ink">
        <p className="text-sm font-semibold uppercase tracking-wider opacity-80">Free to play</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight">Pick a winner. Survive the round. Be the last one standing.</h1>
        <p className="mt-3 max-w-xl opacity-90">
          One pick a round. Win and you&apos;re through, lose or draw and you&apos;re out. You can&apos;t use the same team
          twice until the reset.
        </p>
        <Link
          href="/play"
          className="mt-5 inline-block rounded-full bg-surface px-5 py-2.5 font-semibold text-ink hover:opacity-90"
        >
          Play URC Last Man Standing
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Games</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {games.map((g) => (
            <li key={g.name} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{g.name}</h3>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    g.status === "live" ? "bg-good/15 text-good" : "bg-surface-2 text-muted"
                  }`}
                >
                  {g.status === "live" ? "Live" : "Coming soon"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{g.detail}</p>
              {g.href && (
                <Link href={g.href} className="mt-3 inline-block text-sm font-semibold text-brand">
                  Play now →
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
