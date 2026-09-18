"use client";

import { useState } from "react";
import { useData } from "./DataProvider";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, authReady, signIn } = useData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        <span className="animate-pulse">Loading…</span>
      </div>
    );
  }

  if (session) return <>{children}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-base font-bold text-[var(--accent-fg)]">
            IP
          </span>
          <span className="text-lg font-semibold tracking-[-0.01em]">Interview Prep</span>
        </div>
        <form onSubmit={submit} className="card p-6">
          <h1 className="text-lg font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Sign in to your workspace</p>

          <label className="label mt-6">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mt-1.5"
            placeholder="you@example.com"
          />

          <label className="label mt-4">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mt-1.5"
            placeholder="••••••••"
          />

          {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}

          <button type="submit" disabled={busy} className="btn btn-primary mt-6 w-full">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
