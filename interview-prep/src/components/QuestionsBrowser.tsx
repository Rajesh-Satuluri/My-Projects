"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Category, Question } from "@/lib/types";
import QuestionItem from "@/components/QuestionItem";
import { useData } from "@/components/DataProvider";

const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const STATUSES = ["Prepared", "Not Prepared"];
const DIFF_ORDER: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };

type Sort = "newest" | "updated" | "az" | "difficulty" | "status";

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
  const { setAnswerLocked } = useData();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [difficulty, setDifficulty] = useState("");
  const [status, setStatus] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState<Sort>("newest");

  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [highlight, setHighlight] = useState(-1);

  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "";

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const out = questions.filter((q) => {
      if (category && q.categoryId !== category) return false;
      if (difficulty && q.difficulty !== difficulty) return false;
      if (status && q.status !== status) return false;
      if (tag && !q.tags.includes(tag)) return false;
      if (s) {
        const hay = [q.question, q.answer ?? "", q.keyPoints.map((k) => k.point).join(" "), q.tags.join(" ")]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });

    const cmp: Record<Sort, (a: Question, b: Question) => number> = {
      newest: (a, b) => (b.createdAt > a.createdAt ? 1 : -1),
      updated: (a, b) => (b.updatedAt > a.updatedAt ? 1 : -1),
      az: (a, b) => a.question.localeCompare(b.question),
      difficulty: (a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty],
      status: (a, b) => (a.status === b.status ? 0 : a.status === "Not Prepared" ? -1 : 1),
    };

    // Pinned always float to the top, then the chosen sort.
    return out.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return cmp[sort](a, b);
    });
  }, [questions, search, category, difficulty, status, tag, sort]);

  const toggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const expandAll = () => setOpenIds(new Set(filtered.map((q) => q.id)));
  const collapseAll = () => setOpenIds(new Set());

  // Keyboard shortcuts: / focus search, j/k move, Enter/o expand, e edit answer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (typing) return;
      if (e.key === "j") {
        e.preventDefault();
        setHighlight((h) => Math.min((h < 0 ? -1 : h) + 1, filtered.length - 1));
      } else if (e.key === "k") {
        e.preventDefault();
        setHighlight((h) => Math.max((h < 0 ? filtered.length : h) - 1, 0));
      } else if ((e.key === "Enter" || e.key === "o") && highlight >= 0) {
        e.preventDefault();
        toggle(filtered[highlight].id);
      } else if (e.key === "e" && highlight >= 0) {
        e.preventDefault();
        const q = filtered[highlight];
        setOpenIds((prev) => new Set(prev).add(q.id));
        if (q.answerLocked) setAnswerLocked(q.id, false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, highlight, toggle, setAnswerLocked]);

  // Keep the highlighted card in view.
  useEffect(() => {
    if (highlight < 0 || !listRef.current) return;
    const node = listRef.current.children[highlight] as HTMLElement | undefined;
    node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlight]);

  const selectClass = "input w-auto py-1.5 pr-8 text-xs";

  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">⌕</span>
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…  (press / to focus)"
          className="input pl-9"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className={selectClass} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="">Any difficulty</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className={selectClass} value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">Any tag</option>
          {tags.map((t) => (
            <option key={t} value={t}>#{t}</option>
          ))}
        </select>
        <select className={selectClass} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="newest">Sort: Newest</option>
          <option value="updated">Sort: Recently updated</option>
          <option value="az">Sort: A–Z</option>
          <option value="difficulty">Sort: Difficulty</option>
          <option value="status">Sort: To review first</option>
        </select>
      </div>

      <div className="mb-3 mt-4 flex items-center justify-between text-xs text-muted">
        <span>{filtered.length} of {questions.length} questions</span>
        <div className="flex items-center gap-1">
          <button onClick={expandAll} className="btn btn-ghost px-2 py-1 text-xs">Expand all</button>
          <button onClick={collapseAll} className="btn btn-ghost px-2 py-1 text-xs">Collapse all</button>
        </div>
      </div>

      <div ref={listRef} className="space-y-2.5">
        {filtered.map((q, i) => (
          <QuestionItem
            key={q.id}
            question={q}
            categoryName={categoryName(q.categoryId)}
            open={openIds.has(q.id)}
            onToggle={() => toggle(q.id)}
            highlighted={i === highlight}
          />
        ))}
        {filtered.length === 0 && (
          <div className="card p-10 text-center text-sm text-muted">No questions match.</div>
        )}
      </div>

      <p className="kbd-hint mt-6 text-center text-xs text-muted">
        Shortcuts: <kbd>/</kbd> search · <kbd>j</kbd>/<kbd>k</kbd> move · <kbd>Enter</kbd> open · <kbd>e</kbd> edit
      </p>
    </div>
  );
}
