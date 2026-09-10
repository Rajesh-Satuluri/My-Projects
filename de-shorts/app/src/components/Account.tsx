/* Account — optional magic-link sign-in for cross-device progress sync.
   Renders nothing when Supabase isn't configured, so the local-only build is
   visually unchanged. Signing in triggers a full sync; signing out keeps the
   local Dexie data intact (the device still works offline). */
import { useEffect, useState } from "react";
import { supabase, cloudEnabled } from "../lib/supabase";
import { useProgress } from "../state/store";

export function Account() {
  const [email, setEmail] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const syncNow = useProgress((s) => s.syncNow);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null);
      if (session?.user) void syncNow();
    });
    return () => sub.subscription.unsubscribe();
  }, [syncNow]);

  if (!cloudEnabled || !supabase) return null;
  const sb = supabase; // narrowed non-null for the async closures below

  const signIn = async () => {
    setErr(null);
    setBusy(true);
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  };

  const signOut = async () => {
    await sb.auth.signOut();
    setSent(false);
  };

  if (userEmail) {
    return (
      <div className="account">
        <span className="account__who">Synced · {userEmail}</span>
        <button className="account__btn" onClick={signOut}>Sign out</button>
      </div>
    );
  }

  if (sent) {
    return <div className="account"><span className="account__who">Check your email for a sign-in link.</span></div>;
  }

  return (
    <div className="account">
      <input
        className="account__input"
        type="email"
        inputMode="email"
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email for sync sign-in"
      />
      <button className="account__btn" disabled={busy || !email.includes("@")} onClick={signIn}>
        {busy ? "…" : "Sync"}
      </button>
      {err && <span className="account__err">{err}</span>}
    </div>
  );
}
