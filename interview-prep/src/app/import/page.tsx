"use client";

import { useState } from "react";
import Link from "next/link";
import { useData } from "@/components/DataProvider";
import { PageHeader } from "@/components/ui";
import type { Difficulty, PreparedStatus } from "@/lib/types";

// Bulk-import questions by pasting a JSON blob. Everything is created through
// the logged-in Supabase session, so RLS applies the same as manual entry.
//
// Accepted shapes (either one):
//   { "category": "Spark & PySpark", "description": "...", "questions": [ ... ] }
//   [ { "category": "...", "questions": [ ... ] }, ... ]
// Each question: { question, answer?, guidance?, difficulty?, keyPoints?, tags?, followUps? }

type RawQuestion = {
  question?: string;
  answer?: string;
  guidance?: string;
  difficulty?: string;
  keyPoints?: string[];
  tags?: string[];
  followUps?: string[];
  status?: string;
};
type Group = { category?: string; description?: string; questions?: RawQuestion[] };

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

function normalize(parsed: unknown): Group[] {
  if (Array.isArray(parsed)) return parsed as Group[];
  if (parsed && typeof parsed === "object") return [parsed as Group];
  throw new Error("Top level must be an object or an array.");
}

const EXAMPLE = `{
  "category": "Spark & PySpark",
  "description": "Core Spark internals & performance tuning",
  "questions": [
    {
      "question": "Explain Spark architecture",
      "answer": "Apache Spark is a distributed engine...\\n\\n\\u0060\\u0060\\u0060\\nApplication -> Driver -> Executors\\n\\u0060\\u0060\\u0060",
      "difficulty": "Medium",
      "tags": ["spark", "architecture"]
    }
  ]
}`;

export default function ImportPage() {
  const { categories, createCategory, createQuestion } = useData();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  // Live preview of what will be imported.
  let preview: { groups: Group[]; total: number } | null = null;
  let parseError: string | null = null;
  if (text.trim()) {
    try {
      const groups = normalize(JSON.parse(text.trim().replace(/^\uFEFF/, "")));
      const total = groups.reduce((n, g) => n + (g.questions?.length ?? 0), 0);
      preview = { groups, total };
    } catch (e) {
      parseError = e instanceof Error ? e.message : "Invalid JSON";
    }
  }

  const run = async () => {
    setBusy(true);
    setError(null);
    setLog([]);
    setDone(false);
    const out: string[] = [];
    const push = (line: string) => {
      out.push(line);
      setLog([...out]);
    };
    try {
      const groups = normalize(JSON.parse(text.trim().replace(/^\uFEFF/, "")));
      // Resolve categories by name, creating any that don't exist yet.
      const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
      let created = 0;
      let failed = 0;

      for (const g of groups) {
        const name = (g.category ?? "").trim();
        let categoryId = "";
        if (name) {
          const existing = byName.get(name.toLowerCase());
          if (existing) {
            categoryId = existing;
          } else {
            categoryId = await createCategory(name, g.description ?? "");
            byName.set(name.toLowerCase(), categoryId);
            push(`✓ Created category "${name}"`);
          }
        }

        const questions = g.questions ?? [];
        for (const q of questions) {
          const qText = (q.question ?? "").trim();
          if (!qText) {
            push(`⚠ Skipped an entry with no question text`);
            continue;
          }
          const difficulty = (DIFFICULTIES.includes(q.difficulty as Difficulty)
            ? q.difficulty
            : "Medium") as Difficulty;
          const status = (q.status === "Prepared" ? "Prepared" : "Not Prepared") as PreparedStatus;
          try {
            await createQuestion({
              categoryId,
              question: qText,
              answer: q.answer ?? "",
              guidance: q.guidance ?? "",
              difficulty,
              status,
              keyPoints: Array.isArray(q.keyPoints) ? q.keyPoints : [],
              followUps: Array.isArray(q.followUps) ? q.followUps : [],
              tags: Array.isArray(q.tags) ? q.tags : [],
            });
            created++;
            push(`✓ (${created}) ${qText.slice(0, 70)}`);
          } catch (e) {
            failed++;
            push(`✗ Failed: ${qText.slice(0, 50)} — ${(e as { message?: string })?.message ?? "error"}`);
          }
        }
      }
      push(`\nDone. Imported ${created} question${created === 1 ? "" : "s"}${failed ? `, ${failed} failed` : ""}.`);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Import questions"
        subtitle="Paste a JSON blob to bulk-add questions under a category."
        action={
          <Link href="/questions" className="btn btn-outline">
            ← Back to questions
          </Link>
        }
      />

      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <label className="btn btn-outline cursor-pointer">
            Choose .json file…
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setText(typeof reader.result === "string" ? reader.result : "");
                  setLog([]);
                  setDone(false);
                  setError(null);
                };
                reader.readAsText(file);
                e.target.value = ""; // allow re-selecting the same file
              }}
            />
          </label>
          <span className="text-xs text-muted">or paste below</span>
        </div>

        <label className="label">JSON</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EXAMPLE}
          rows={14}
          className="input mt-1 resize-y font-mono text-[12px] leading-5"
        />

        {parseError && text.trim() && (
          <p className="mt-2 text-sm text-[var(--danger)]">JSON error: {parseError}</p>
        )}
        {preview && (
          <p className="mt-2 text-sm text-muted">
            Ready to import <span className="font-medium text-fg">{preview.total}</span> question
            {preview.total === 1 ? "" : "s"} across{" "}
            <span className="font-medium text-fg">{preview.groups.length}</span> categor
            {preview.groups.length === 1 ? "y" : "ies"}
            {preview.groups.some((g) => g.category) &&
              `: ${preview.groups.map((g) => g.category || "Uncategorized").join(", ")}`}
            .
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={run}
            disabled={busy || !preview || preview.total === 0}
            className="btn btn-primary"
          >
            {busy ? "Importing…" : `Import${preview ? ` ${preview.total}` : ""}`}
          </button>
          <button onClick={() => { setText(""); setLog([]); setDone(false); setError(null); }} className="btn btn-ghost">
            Clear
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}

        {log.length > 0 && (
          <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border bg-[var(--panel-2)]/50 p-3">
            <pre className="whitespace-pre-wrap font-mono text-[12px] leading-5 text-fgSoft">
              {log.join("\n")}
            </pre>
            {done && (
              <Link href="/questions" className="btn btn-primary mt-3 inline-flex">
                View questions →
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="card mt-4 p-5 text-sm text-muted">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Format</h2>
        <p className="mb-2">
          Top level is either a single <code className="rounded bg-[var(--panel-2)] px-1">{"{ category, description?, questions: [] }"}</code>{" "}
          object or an array of them. Each question supports:
        </p>
        <ul className="list-disc space-y-0.5 pl-5">
          <li><code className="rounded bg-[var(--panel-2)] px-1">question</code> (required) — the title</li>
          <li><code className="rounded bg-[var(--panel-2)] px-1">answer</code> — Markdown (tables, fenced code, lists all render)</li>
          <li><code className="rounded bg-[var(--panel-2)] px-1">guidance</code> — &ldquo;what the interviewer wants&rdquo; brief</li>
          <li><code className="rounded bg-[var(--panel-2)] px-1">difficulty</code> — Easy · Medium · Hard (default Medium)</li>
          <li><code className="rounded bg-[var(--panel-2)] px-1">keyPoints</code>, <code className="rounded bg-[var(--panel-2)] px-1">tags</code>, <code className="rounded bg-[var(--panel-2)] px-1">followUps</code> — arrays of strings</li>
        </ul>
      </div>
    </>
  );
}
