"use client";

import Link from "next/link";
import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { PageHeader } from "@/components/ui";

export default function CategoriesPage() {
  const { categories, questions, loading, createCategory, updateCategory, deleteCategory } = useData();
  const count = (id: string) => questions.filter((q) => q.categoryId === id).length;

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline edit state (one category at a time).
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const resetAdd = () => {
    setAdding(false);
    setNewName("");
    setNewDesc("");
    setError(null);
  };

  const submitAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      await createCategory(name, newDesc.trim());
      resetAdd();
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Couldn't create category.");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (id: string, name: string, desc: string) => {
    setEditId(id);
    setEditName(name);
    setEditDesc(desc);
  };

  const submitEdit = async () => {
    if (!editId) return;
    const name = editName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await updateCategory(editId, { name, description: editDesc.trim() });
      setEditId(null);
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: string, name: string) => {
    const n = count(id);
    const warn =
      n > 0
        ? `Delete "${name}"? Its ${n} question${n === 1 ? "" : "s"} will become uncategorized (not deleted).`
        : `Delete "${name}"?`;
    if (confirm(warn)) deleteCategory(id);
  };

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Question topics"
        action={
          !adding && (
            <button onClick={() => setAdding(true)} className="btn btn-primary">
              + New category
            </button>
          )
        }
      />

      {adding && (
        <div className="card mb-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAdd()}
              placeholder="Category name"
              className="input"
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAdd()}
              placeholder="Short description (optional)"
              className="input"
            />
          </div>
          {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={submitAdd} disabled={busy || !newName.trim()} className="btn btn-primary">
              {busy ? "Saving…" : "Add category"}
            </button>
            <button onClick={resetAdd} className="btn btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {categories.map((c) =>
            editId === c.id ? (
              <div key={c.id} className="card p-5">
                <div className="grid gap-3">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitEdit()}
                    placeholder="Category name"
                    className="input"
                  />
                  <input
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitEdit()}
                    placeholder="Short description (optional)"
                    className="input"
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={submitEdit} disabled={busy || !editName.trim()} className="btn btn-primary px-3 py-1.5 text-sm">
                    Save
                  </button>
                  <button onClick={() => setEditId(null)} className="btn btn-ghost px-3 py-1.5 text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={c.id} className="card group p-5 transition-colors hover:border-accent">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/questions?topic=${c.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-sm text-muted">· {count(c.id)}</span>
                    </div>
                    {c.description && <p className="mt-1 text-sm text-muted">{c.description}</p>}
                  </Link>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => startEdit(c.id, c.name, c.description ?? "")}
                      className="btn btn-ghost px-2 py-1 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(c.id, c.name)}
                      className="btn btn-ghost px-2 py-1 text-xs text-[var(--danger)]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
          {categories.length === 0 && !adding && (
            <p className="text-sm text-muted">
              No categories yet — click “+ New category”, or load starter data from the Dashboard.
            </p>
          )}
        </div>
      )}
    </>
  );
}
