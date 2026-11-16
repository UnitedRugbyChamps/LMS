# Rugby LMS

Free-to-play rugby games: Last Man Standing across the URC, Premiership, Six Nations, tests and the 2027 Rugby World Cup,
with Predictor, Matchday Five and Weekly Challenge to follow.

This first version ships **Team Pick LMS for the URC 2026/27 season** (game starts from Round 6).

## Run it

```bash
npm install
cp .env.example .env.local   # or leave it out to run in demo mode
npm run dev                  # http://localhost:3000
npm test                     # rules engine tests
```

**Demo mode** (no Supabase settings): everything is saved in your browser, five pretend rivals play alongside you,
and the Admin page has a demo clock so you can jump past kickoffs and enter results.

**Live mode** (Supabase settings present): sign in by email link, picks and results are stored in the
`URC 26/27 LMS` Supabase project.

## How it's built

| Part | Where |
| --- | --- |
| Rules engine (periods, locks, picks, standings) | `src/lib/engine/teamPick.ts`, tests beside it |
| URC 2026/27 fixtures (copied from the Replit app) | `src/lib/data/urc-2026-27.ts` |
| Data access: demo (browser) or Supabase | `src/lib/store/` |
| Screens | `src/app/` (home, play, rules, admin) and `src/components/` |
| Database schema, security rules, seed | `supabase/migrations/`, `supabase/seed.sql` |

The database re-checks the key rules on every pick (round lock, team in the match, no reuse within a period), so
nobody can get around them by calling the API directly.

## Team Pick rules (summary)

- One pick per round. Win = through; draw or loss = out.
- No reusing a team until you've played as many rounds as there are teams (URC: Rounds 1 to 16, then 17 to 18).
- Knockouts are their own period and every knockout pick must be different; if every team left is already used, any can be picked.
- All picks lock 30 minutes before the round's first kickoff; the next round opens 2 hours after the previous round's last kickoff.
- Missed pick = out. Postponed match = through, team returned. If everyone goes out together, everyone survives.

## Making someone an admin

After they've signed in once, run in the Supabase SQL editor:

```sql
insert into public.admins (user_id) select id from auth.users where email = 'their@email';
```
