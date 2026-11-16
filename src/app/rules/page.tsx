export const metadata = { title: "Rules · Rugby LMS" };

const rules = [
  ["One pick per round", "Pick one team you think will win its match that round."],
  ["Win and you're through", "A draw or a loss knocks you out. In knockout games the result after extra time counts."],
  ["No repeats until the reset", "You can't pick the same team again until you've played as many rounds as there are teams. In the URC that's after Round 16; Rounds 17 and 18 are a fresh period, and the knockouts are another."],
  ["Knockouts: all different", "Every knockout pick must be a different team. If every team left is one you've already used, you can pick any of them."],
  ["Picks lock before the round", "All picks lock 30 minutes before the round's first kickoff. The next round opens 2 hours after the last match of the previous round."],
  ["Missed pick", "If you don't pick before the lock, you're out."],
  ["Postponed matches", "If your match isn't played within the round, you go through and get that team back."],
  ["Everyone out together", "If every remaining player goes out in the same round, everyone survives into the next round."],
  ["Free to play", "No entry fee and no cash prizes."],
];

export default function RulesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Team Pick rules</h1>
      <ol className="space-y-3">
        {rules.map(([title, body], i) => (
          <li key={title} className="rounded-xl border border-line bg-surface p-4">
            <p className="font-semibold">
              {i + 1}. {title}
            </p>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
