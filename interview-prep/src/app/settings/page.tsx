"use client";

import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { PageHeader, Card } from "@/components/ui";
import { loadStarterData } from "@/lib/seedRemote";

export default function SettingsPage() {
  const { session, questions, categories, reload } = useData();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const sync = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await loadStarterData();
      await reload();
      setMsg("Starter data synced — any missing categories/questions were added.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" />
      <Card className="mb-6 max-w-2xl space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Signed in as</span>
          <span>{session?.user?.email ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Categories</span>
          <span>{categories.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Questions</span>
          <span>{questions.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Backend</span>
          <span>Supabase</span>
        </div>
      </Card>

      <Card className="max-w-2xl">
        <h2 className="font-medium">Starter data</h2>
        <p className="mt-1 text-sm text-muted">
          Adds the 15 starter categories and sample questions (including “Tell me
          about yourself” and “Walk me through your project.”). Idempotent — it
          only adds what’s missing, never duplicates.
        </p>
        <button
          onClick={sync}
          disabled={busy}
          className="btn btn-primary mt-3"
        >
          {busy ? "Syncing…" : "Load / sync starter data"}
        </button>
        {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}
      </Card>
    </>
  );
}
