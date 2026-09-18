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
  const [status, setStatusText] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const locked = question.answerLocked;

  const unlock = () => {
    setDraft(question.answer ?? "");
    setAnswerLocked(question.id, false); // optimistic in provider; no need to await
  };

  const save = async (thenLock: boolean) => {
    setStatusText("saving");
    try {
      // single combined round-trip (answer + optional lock)
      await saveAnswer(question.id, draft, thenLock ? true : undefined);
      setStatusText("saved");
      setTimeout(() => setStatusText("idle"), 2000);
    } catch {
      setStatusText("error");
    }
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
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-[var(--bg)]"
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
        {status === "saving" && <span className="text-xs text-muted">Saving…</span>}
        {status === "saved" && <span className="text-xs text-emerald-600">Saved ✓</span>}
        {status === "error" && <span className="text-xs text-rose-600">Save failed — retry</span>}
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
          className="rounded-md bg-accent px-3 py-1.5 text-sm text-white"
        >
          Save &amp; lock
        </button>
        <button
          onClick={() => save(false)}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-[var(--bg)]"
        >
          Save
        </button>
      </div>
    </div>
  );
}
