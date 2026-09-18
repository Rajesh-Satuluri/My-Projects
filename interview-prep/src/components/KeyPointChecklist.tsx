"use client";

import { useState } from "react";
import type { KeyPoint } from "@/lib/types";
import { useData } from "./DataProvider";

export default function KeyPointChecklist({
  points,
  questionId,
}: {
  points: KeyPoint[];
  questionId?: string;
}) {
  const { setPointCompleted, saveKeyPoints } = useData();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const sorted = [...points].sort((a, b) => a.sortOrder - b.sortOrder);

  const start = () => {
    setDraft(sorted.map((p) => p.point).join("\n"));
    setEditing(true);
  };

  const save = async () => {
    if (!questionId) return;
    setBusy(true);
    try {
      const lines = draft.split("\n").map((x) => x.trim()).filter(Boolean);
      await saveKeyPoints(questionId, lines);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div>
        <textarea
          rows={5}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="One key point per line…"
          className="input resize-y text-sm"
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
    );
  }

  return (
    <div>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted">No key points yet.</p>
      ) : (
        <ul className="space-y-1">
          {sorted.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[var(--panel-2)]">
                <input
                  type="checkbox"
                  checked={p.completed}
                  onChange={() => setPointCompleted(p.id, !p.completed)}
                  className="h-4 w-4 rounded"
                />
                <span className={p.completed ? "text-muted line-through" : "text-fgSoft"}>
                  {p.point}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {questionId && (
        <button onClick={start} className="btn btn-ghost mt-1 px-2 py-1 text-xs">
          {sorted.length ? "Edit key points" : "+ Add key points"}
        </button>
      )}
    </div>
  );
}
