"use client";

import { useState } from "react";
import { useData } from "./DataProvider";
import type { Question } from "@/lib/types";

// "What the interviewer is looking for" — read by default, editable inline.
export default function GuidancePanel({ question }: { question: Question }) {
  const { saveGuidance } = useData();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(question.guidance ?? "");
  const [busy, setBusy] = useState(false);

  const start = () => {
    setDraft(question.guidance ?? "");
    setEditing(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      await saveGuidance(question.id, draft);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-l-2 border-l-accent bg-[var(--panel-2)]/40 p-4">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-accent">
          What the interviewer is looking for
        </h3>
        {!editing && (
          <button onClick={start} className="btn btn-ghost px-2 py-1 text-xs">
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="2–3 lines on what a strong answer should demonstrate…"
            className="input resize-y text-sm leading-6"
            autoFocus
          />
          <div className="mt-2 flex gap-2">
            <button onClick={save} disabled={busy} className="btn btn-primary px-3 py-1.5 text-xs">
              {busy ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="btn btn-ghost px-3 py-1.5 text-xs">
              Cancel
            </button>
          </div>
        </div>
      ) : question.guidance ? (
        <p className="whitespace-pre-wrap text-sm leading-6 text-fgSoft">{question.guidance}</p>
      ) : (
        <p className="text-sm italic text-muted">
          No brief yet — click Edit to add what the interviewer expects.
        </p>
      )}
    </div>
  );
}
