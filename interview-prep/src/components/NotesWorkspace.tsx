"use client";

import { useEffect, useRef, useState } from "react";
import { useData } from "./DataProvider";

export default function NotesWorkspace() {
  const { notes, createNote, updateNote, deleteNote } = useData();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const loadedFor = useRef<string | null>(null);

  // Pick a default active tab.
  useEffect(() => {
    if (!activeId && notes.length) setActiveId(notes[0].id);
    if (activeId && !notes.some((n) => n.id === activeId)) {
      setActiveId(notes[0]?.id ?? null);
    }
  }, [notes, activeId]);

  // Load the active note into the editor when the selection changes.
  const active = notes.find((n) => n.id === activeId) ?? null;
  useEffect(() => {
    if (active && loadedFor.current !== active.id) {
      setTitle(active.title);
      setBody(active.body);
      loadedFor.current = active.id;
    }
  }, [active]);

  // Debounced autosave of title/body.
  useEffect(() => {
    if (!active || loadedFor.current !== active.id) return;
    if (title === active.title && body === active.body) return;
    setStatus("saving");
    const t = setTimeout(async () => {
      await updateNote(active.id, { title, body });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1200);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body]);

  const addNote = async () => {
    setError(null);
    try {
      const id = await createNote();
      setActiveId(id);
      loadedFor.current = null;
    } catch (e) {
      const msg = e && typeof e === "object" ? (e as { message?: string }).message ?? "" : "";
      setError(
        /relation .*notes.* does not exist|could not find the table|schema cache/i.test(msg)
          ? "The 'notes' table isn't set up yet. Run supabase/setup.sql in the Supabase SQL editor."
          : msg || "Couldn't create a note."
      );
    }
  };

  const removeNote = (id: string) => {
    if (confirm("Delete this note? This can't be undone.")) deleteNote(id);
  };

  if (notes.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm text-muted">No notes yet. Create a tab and start writing.</p>
        <button onClick={addNote} className="btn btn-primary mt-4">
          + New note
        </button>
        {error && <p className="mx-auto mt-4 max-w-md text-sm text-[var(--danger)]">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`flex gap-4 ${expanded ? "flex-col" : "flex-col md:flex-row"}`}>
      {/* Left rail: vertical list of note tabs */}
      {!expanded && (
        <aside className="w-full shrink-0 md:w-56">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="label">Notes</span>
            <button
              onClick={addNote}
              className="icon-btn text-muted hover:text-fg"
              title="New note"
            >
              +
            </button>
          </div>
          <div className="flex flex-row gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
            {notes.map((n) => (
              <button
                key={n.id}
                onClick={() => setActiveId(n.id)}
                className={`shrink-0 truncate rounded-lg px-3 py-2 text-left text-sm transition-colors md:w-full ${
                  n.id === activeId
                    ? "bg-[var(--panel-2)] font-medium text-fg"
                    : "text-muted hover:bg-[var(--panel-2)] hover:text-fg"
                }`}
                title={n.title || "Untitled"}
              >
                {n.title || "Untitled"}
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* Editor pane */}
      {active && (
        <div className="card min-w-0 flex-1 p-5">
          <div className="mb-3 flex items-center gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-muted"
            />
            <span className="whitespace-nowrap text-xs text-muted">
              {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : ""}
            </span>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="icon-btn text-muted hover:text-fg"
              title={expanded ? "Show note list" : "Expand editor"}
            >
              {expanded ? "⤡" : "⤢"}
            </button>
            <button
              onClick={() => removeNote(active.id)}
              className="btn btn-ghost px-2.5 py-1.5 text-xs text-[var(--danger)]"
            >
              Delete
            </button>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write freely — your project story, notes, anything…"
            className={`input resize-y text-[15px] leading-7 ${
              expanded ? "min-h-[78vh]" : "min-h-[62vh]"
            }`}
          />
        </div>
      )}
    </div>
  );
}
