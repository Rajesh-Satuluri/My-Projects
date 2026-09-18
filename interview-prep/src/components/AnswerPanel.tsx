"use client";

import { useEffect, useRef, useState } from "react";
import { useData } from "./DataProvider";
import type { Question } from "@/lib/types";

// Answers open in READ mode by default; click Edit to make changes.
// Editing autosaves (debounced) + Cmd/Ctrl+S; "Save & lock" returns to read.
export default function AnswerPanel({ question }: { question: Question }) {
  const { saveAnswer } = useData();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(question.answer ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [copied, setCopied] = useState(false);
  const firstRender = useRef(true);

  // Debounced autosave while editing.
  useEffect(() => {
    if (!editing) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setStatus("saving");
    const t = setTimeout(async () => {
      try {
        await saveAnswer(question.id, draft);
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 1500);
      } catch {
        setStatus("error");
      }
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, editing]);

  const startEdit = () => {
    setDraft(question.answer ?? "");
    firstRender.current = true;
    setEditing(true);
  };

  const done = async (exit: boolean) => {
    setStatus("saving");
    try {
      await saveAnswer(question.id, draft);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
      if (exit) setEditing(false);
    } catch {
      setStatus("error");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(question.answer ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  if (!editing) {
    return (
      <div className="rounded-xl border bg-[var(--panel-2)]/40 p-4">
        {question.answer ? (
          <p className="whitespace-pre-wrap text-[15px] leading-7 text-fgSoft">{question.answer}</p>
        ) : (
          <p className="text-sm italic text-muted">No answer written yet — click Edit to add one.</p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <button onClick={startEdit} className="btn btn-outline">
            ✎ Edit answer
          </button>
          {question.answer && (
            <button onClick={copy} className="btn btn-ghost">
              {copied ? "Copied ✓" : "Copy"}
            </button>
          )}
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
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
            e.preventDefault();
            done(false);
          }
        }}
        placeholder="Write your answer…  (autosaves; ⌘/Ctrl+S to save)"
        className="input resize-y text-[15px] leading-7"
        autoFocus
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={() => done(true)} className="btn btn-primary">
          Done
        </button>
        <button onClick={() => done(false)} className="btn btn-outline">
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
