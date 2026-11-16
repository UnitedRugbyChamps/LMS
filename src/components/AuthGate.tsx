"use client";

import { useState } from "react";
import { useStore } from "@/lib/store/StoreProvider";

export function SignInForm({ onDone }: { onDone: () => void }) {
  const store = useStore();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await store.signIn(email.trim());
      if (store.mode === "demo") onDone();
      else setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="mt-1 text-sm text-muted">We sent a sign-in link to {email}. Open it on this device to carry on.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-line bg-surface p-5 space-y-3">
      <h2 className="text-lg font-semibold">Sign in to play</h2>
      <p className="text-sm text-muted">
        {store.mode === "demo" ? "Demo mode: any email works, nothing is sent." : "We'll email you a sign-in link. No password needed."}
      </p>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-lg border border-line bg-bg px-3 py-2"
      />
      {error && <p className="text-sm text-bad">{error}</p>}
      <button disabled={busy} className="rounded-full bg-brand px-5 py-2 font-semibold text-brand-ink disabled:opacity-60">
        {busy ? "Sending…" : "Continue"}
      </button>
    </form>
  );
}

export function JoinForm({ gameName, defaultName, onJoin }: { gameName: string; defaultName: string; onJoin: (name: string) => Promise<void> }) {
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await onJoin(name.trim());
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't join.");
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-xl border border-line bg-surface p-5 space-y-3"
    >
      <h2 className="text-lg font-semibold">Join {gameName}</h2>
      <p className="text-sm text-muted">Pick the name other players will see on the standings.</p>
      <input
        required
        maxLength={40}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="w-full rounded-lg border border-line bg-bg px-3 py-2"
      />
      {error && <p className="text-sm text-bad">{error}</p>}
      <button disabled={busy} className="rounded-full bg-brand px-5 py-2 font-semibold text-brand-ink disabled:opacity-60">
        Join game
      </button>
    </form>
  );
}
