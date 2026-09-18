"use client";

import { useState } from "react";
import { useData } from "./DataProvider";
import type { Question } from "@/lib/types";

// Answer with a device-synced lock. Locked = clean read view; unlock to edit
// inline. The lock lives in Supabase so it syncs across devices.
export default function AnswerPanel({ question }: { question: Question }) {
  const { saveAnswer, setAnswerLocked } = useData();
  const [draft, setDraft] = useState(question.answer ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const locked = question.answerLocked;

  const unlock = () => {
    setDraft(question.answer ?? "");
    setAnswerLocked(question.id, false);
  };

  const save = async (thenLock: boolean) => {
    setStatus("saving");
    try {
      await saveAnswer(question.id, draft, thenLock ? true : undefined);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("error");
    }
  };

  if (locked) {
    return (
      <div className="rounded-xl border bg-[var(--panel-2)]/40 p-4">
        {question.answer ? (
          <p className="whitespace-pre-wrap text-[15px] leading-7 text-fgSoft">
            {question.answer}
          </p>
        ) : (
          <p className="text-sm italic text-muted">No answer written yet — unlock to add one.</p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <button onClick={unlock} className="btn btn-outline">
            ✎ Edit answer
          </button>
          <span className="text-xs text-muted">Locked · saved</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <textarea
        rows={7}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Write your answer…"
        className="input resize-y text-[15px] leading-7"
        autoFocus
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={() => save(true)} className="btn btn-primary">
          Save &amp; lock
        </button>
        <button onClick={() => save(false)} className="btn btn-outline">
          Save draft
        </button>
        <span className="ml-1 text-xs">
          {status === "saving" && <span className="text-muted">Saving…</span>}
          {status === "saved" && <span className="text-[var(--success)]">Saved ✓</span>}
          {status === "error" && <span className="text-[var(--danger)]">Save failed — retry</span>}
        </span>
      </div>
    </div>
  );
}
