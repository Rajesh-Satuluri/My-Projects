"use client";

import { useState } from "react";
import { useData } from "./DataProvider";
import type { Question } from "@/lib/types";

// Answer with a device-synced lock. Locked = read-only until unlocked;
// the lock state lives in Supabase (questions.answer_locked) so unlocking on
// one device is reflected everywhere. Unlocked = inline textarea to edit + save.
export default function AnswerPanel({ question }: { question: Question }) {
  const { saveAnswer, setAnswerLocked } = useData();
  const [draft, setDraft] = useState(question.answer ?? "");
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const locked = question.answerLocked;

  const unlock = async () => {
    setBusy(true);
    setDraft(question.answer ?? "");
    await setAnswerLocked(question.id, false);
    setBusy(false);
  };

  const save = async (thenLock: boolean) => {
    setBusy(true);
    await saveAnswer(question.id, draft);
    if (thenLock) await setAnswerLocked(question.id, true);
    setSavedAt(new Date().toLocaleTimeString());
    setBusy(false);
  };

  if (locked) {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted">
            🔒 Locked
          </span>
          <button
            onClick={unlock}
            disabled={busy}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-[var(--bg)] disabled:opacity-60"
          >
            Unlock to edit
          </button>
        </div>
        {question.answer ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{question.answer}</p>
        ) : (
          <p className="text-sm text-muted">No answer written yet.</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 px-2 py-0.5 text-xs text-amber-600">
          ✎ Editing
        </span>
        {savedAt && <span className="text-xs text-muted">Saved {savedAt}</span>}
      </div>
      <textarea
        rows={8}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Write your answer…"
        className="w-full rounded-md border bg-panel px-3 py-2 text-sm leading-relaxed text-fg"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => save(true)}
          disabled={busy}
          className="rounded-md bg-accent px-3 py-1.5 text-sm text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save & lock"}
        </button>
        <button
          onClick={() => save(false)}
          disabled={busy}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-[var(--bg)] disabled:opacity-60"
        >
          Save
        </button>
      </div>
    </div>
  );
}
