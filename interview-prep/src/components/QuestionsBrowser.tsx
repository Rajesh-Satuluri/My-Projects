"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Category, Question } from "@/lib/types";
import QuestionItem from "@/components/QuestionItem";

const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const STATUSES = ["Prepared", "Not Prepared"];

export default function QuestionsBrowser({
  questions,
  categories,
  tags,
}: {
  questions: Question[];
  categories: Category[];
  tags: string[];
}) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [difficulty, setDifficulty] = useState("");
  const [status, setStatus] = useState("");
  const [tag, setTag] = useState("");

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "";

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (category && q.categoryId !== category) return false;
      if (difficulty && q.difficulty !== difficulty) return false;
      if (status && q.status !== status) return false;
      if (tag && !q.tags.includes(tag)) return false;
      if (s) {
        const hay = [
          q.question,
          q.answer ?? "",
          q.keyPoints.map((k) => k.point).join(" "),
          q.tags.join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [questions, search, category, difficulty, status, tag]);

  const selectClass = "input w-auto py-1.5 pr-8 text-xs";

  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">⌕</span>
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions, answers, key points, tags…"
          className="input pl-9"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className={selectClass} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="">Any difficulty</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className={selectClass} value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">Any tag</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              #{t}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3 mt-4 text-xs text-muted">
        {filtered.length} of {questions.length} questions
      </div>

      <div className="space-y-2.5">
        {filtered.map((q) => (
          <QuestionItem key={q.id} question={q} categoryName={categoryName(q.categoryId)} />
        ))}
        {filtered.length === 0 && (
          <div className="card p-10 text-center text-sm text-muted">No questions match.</div>
        )}
      </div>
    </div>
  );
}
