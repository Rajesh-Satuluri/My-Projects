"use client";

import { useEffect, useRef, useState } from "react";
import { useData } from "./DataProvider";

export default function NotesWorkspace() {
  const { notes, createNote, updateNote, deleteNote } = useData();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
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
    const id = await createNote();
    setActiveId(id);
    loadedFor.current = null;
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
      </div>
    );
  }

  return (
    <div>
      {/* Tab strip */}
      <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1">
        {notes.map((n) => (
          <button
            key={n.id}
            onClick={() => setActiveId(n.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              n.id === activeId
                ? "bg-[var(--panel-2)] font-medium text-fg"
                : "text-muted hover:bg-[var(--panel-2)] hover:text-fg"
            }`}
          >
            {n.title || "Untitled"}
          </button>
        ))}
        <button
          onClick={addNote}
          className="icon-btn shrink-0 text-muted hover:text-fg"
          title="New note"
        >
          +
        </button>
      </div>

      {active && (
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              className="flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-muted"
            />
            <span className="text-xs text-muted">
              {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : ""}
            </span>
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
            className="input min-h-[60vh] resize-y text-[15px] leading-7"
          />
        </div>
      )}
    </div>
  );
}
