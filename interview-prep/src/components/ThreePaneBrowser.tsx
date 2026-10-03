"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Category, Question } from "@/lib/types";
import { useData } from "./DataProvider";
import { DifficultyBadge, StatusBadge, Tag } from "./ui";
import AnswerPanel from "./AnswerPanel";
import GuidancePanel from "./GuidancePanel";
import KeyPointChecklist from "./KeyPointChecklist";

// Virtual topics shown above real categories in P1.
type VirtualTopic = "all" | "pinned" | "review";
const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

const TOPIC_KEY = "browse:topic";
const QUESTION_KEY = "browse:question";

type MobileView = "topics" | "questions" | "answer";

export default function ThreePaneBrowser({
  questions,
  categories,
}: {
  questions: Question[];
  categories: Category[];
}) {
  const { setStatus, setPinned, deleteQuestion, markReviewed, createQuestion } = useData();

  // Selection state. topicId is a VirtualTopic or a category id.
  const [topicId, setTopicId] = useState<string>("all");
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [mobileView, setMobileView] = useState<MobileView>("topics");
  const restored = useRef(false);

  // Quick-add a question to the current topic (from P2).
  const [addingQ, setAddingQ] = useState(false);
  const [newQ, setNewQ] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);

  // ---- resizable pane widths (desktop only) ----
  const W1_KEY = "browse:w1";
  const W2_KEY = "browse:w2";
  const W1_MIN = 180;
  const W2_MIN = 240;
  const [w1, setW1] = useState(256); // P1 topics
  const [w2, setW2] = useState(360); // P2 questions
  const [isDesktop, setIsDesktop] = useState(false);
  const [paneHeight, setPaneHeight] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const drag = useRef<null | { pane: 1 | 2; startX: number; startW: number }>(null);

  useEffect(() => {
    try {
      const a = Number(localStorage.getItem(W1_KEY));
      const b = Number(localStorage.getItem(W2_KEY));
      if (a >= W1_MIN) setW1(a);
      if (b >= W2_MIN) setW2(b);
    } catch {}
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);

    // Size the workspace to exactly the space left below it, so the page
    // itself never scrolls and each pane keeps its own scrollbar.
    const measure = () => {
      const top = rootRef.current?.getBoundingClientRect().top ?? 0;
      setPaneHeight(Math.max(360, window.innerHeight - top - 16));
    };
    measure();
    window.addEventListener("resize", measure);
    // Re-measure once after fonts/layout settle.
    const t = setTimeout(measure, 100);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", measure);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const rootW = rootRef.current?.clientWidth ?? 1200;
      if (d.pane === 1) {
        // leave room for P2 + a minimum P3
        const max = rootW - w2 - 320;
        setW1(Math.max(W1_MIN, Math.min(d.startW + dx, Math.max(W1_MIN, max))));
      } else {
        const max = rootW - w1 - 320;
        setW2(Math.max(W2_MIN, Math.min(d.startW + dx, Math.max(W2_MIN, max))));
      }
    };
    const onUp = () => {
      if (!drag.current) return;
      drag.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      try {
        localStorage.setItem(W1_KEY, String(Math.round(w1)));
        localStorage.setItem(W2_KEY, String(Math.round(w2)));
      } catch {}
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [w1, w2]);

  const startDrag = (pane: 1 | 2) => (e: React.PointerEvent) => {
    e.preventDefault();
    drag.current = { pane, startX: e.clientX, startW: pane === 1 ? w1 : w2 };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  // ---- restore saved selection + URL params once on mount ----
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    let t: string | null = null;
    let q: string | null = null;
    try {
      const sp = new URLSearchParams(window.location.search);
      t = sp.get("topic") ?? sp.get("category");
      q = sp.get("q");
    } catch {}
    try {
      if (!t) t = localStorage.getItem(TOPIC_KEY);
      if (!q) q = localStorage.getItem(QUESTION_KEY);
    } catch {}
    if (t) setTopicId(t);
    if (q) {
      setQuestionId(q);
      setMobileView("answer");
    }
  }, []);

  // ---- persist selection to localStorage + URL ----
  useEffect(() => {
    try {
      localStorage.setItem(TOPIC_KEY, topicId);
      if (questionId) localStorage.setItem(QUESTION_KEY, questionId);
      else localStorage.removeItem(QUESTION_KEY);
    } catch {}
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("topic", topicId);
      if (questionId) url.searchParams.set("q", questionId);
      else url.searchParams.delete("q");
      url.searchParams.delete("category"); // normalize legacy param
      window.history.replaceState(null, "", url);
    } catch {}
  }, [topicId, questionId]);

  // ---- P1: topic counts ----
  const counts = useMemo(() => {
    const byCat = new Map<string, number>();
    let pinned = 0;
    let review = 0;
    for (const q of questions) {
      byCat.set(q.categoryId, (byCat.get(q.categoryId) ?? 0) + 1);
      if (q.pinned) pinned++;
      if (q.status === "Not Prepared") review++;
    }
    return { byCat, pinned, review, all: questions.length };
  }, [questions]);

  // ---- P2: questions in the active topic, filtered + sorted ----
  const paneQuestions = useMemo(() => {
    const s = search.trim().toLowerCase();
    const inTopic = (q: Question) => {
      if (topicId === "all") return true;
      if (topicId === "pinned") return q.pinned;
      if (topicId === "review") return q.status === "Not Prepared";
      return q.categoryId === topicId;
    };
    const out = questions.filter((q) => {
      if (!inTopic(q)) return false;
      if (difficulty && q.difficulty !== difficulty) return false;
      if (s) {
        const hay = [q.question, q.answer ?? "", q.tags.join(" ")].join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
    // Pinned float to top, then preserve import order (created_at ascending)
    // with a stable tiebreak on id so the sequence never shuffles.
    return out.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const d = (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
      return d !== 0 ? d : a.id.localeCompare(b.id);
    });
  }, [questions, topicId, difficulty, search]);

  // Keep a valid selection: if the active question falls out of the list, clear it.
  useEffect(() => {
    if (questionId && !questions.some((q) => q.id === questionId)) {
      setQuestionId(null);
    }
  }, [questions, questionId]);

  const active = questions.find((q) => q.id === questionId) ?? null;
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "Uncategorized";

  const pickTopic = (id: string) => {
    setTopicId(id);
    setMobileView("questions");
  };
  const pickQuestion = (id: string) => {
    setQuestionId(id);
    setMobileView("answer");
  };
  const removeActive = () => {
    if (active && confirm(`Delete "${active.question}"? This can't be undone.`)) {
      deleteQuestion(active.id);
      setQuestionId(null);
      setMobileView("questions");
    }
  };

  const isVirtual = (id: string) => id === "all" || id === "pinned" || id === "review";

  const submitAddQ = async () => {
    const text = newQ.trim();
    if (!text) return;
    setAddBusy(true);
    setAddErr(null);
    try {
      const id = await createQuestion({
        categoryId: isVirtual(topicId) ? "" : topicId,
        question: text,
        difficulty: "Medium",
        status: "Not Prepared",
        keyPoints: [],
        followUps: [],
        tags: [],
      });
      setNewQ("");
      setAddingQ(false);
      pickQuestion(id);
    } catch (e) {
      setAddErr((e as { message?: string })?.message ?? "Couldn't add the question.");
    } finally {
      setAddBusy(false);
    }
  };

  const openAdd = () => {
    setAddingQ(true);
    setAddErr(null);
  };

  // Topic rows for P1.
  const virtualTopics: { id: VirtualTopic; label: string; icon: string; count: number }[] = [
    { id: "all", label: "All questions", icon: "▤", count: counts.all },
    { id: "pinned", label: "Pinned", icon: "★", count: counts.pinned },
    { id: "review", label: "Due for review", icon: "◐", count: counts.review },
  ];

  const topicRowClass = (activeRow: boolean) =>
    `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
      activeRow
        ? "bg-[var(--panel-2)] font-medium text-fg"
        : "text-muted hover:bg-[var(--panel-2)] hover:text-fg"
    }`;

  // ---- Panes ----
  const P1 = (
    <aside className="flex min-h-0 w-full flex-col">
      <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">Topics</div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
        {virtualTopics.map((t) => (
          <button key={t.id} onClick={() => pickTopic(t.id)} className={topicRowClass(topicId === t.id)}>
            <span className="w-4 shrink-0 text-center text-[13px] opacity-70">{t.icon}</span>
            <span className="min-w-0 flex-1 truncate">{t.label}</span>
            <span className="shrink-0 text-xs text-muted">{t.count}</span>
          </button>
        ))}
        <div className="my-2 border-t" />
        {categories.map((c) => (
          <button key={c.id} onClick={() => pickTopic(c.id)} className={topicRowClass(topicId === c.id)}>
            <span className="w-4 shrink-0 text-center text-[13px] opacity-70">▦</span>
            <span className="min-w-0 flex-1 truncate" title={c.name}>
              {c.name}
            </span>
            <span className="shrink-0 text-xs text-muted">{counts.byCat.get(c.id) ?? 0}</span>
          </button>
        ))}
        {categories.length === 0 && (
          <p className="px-3 py-2 text-xs text-muted">No categories yet.</p>
        )}
      </div>
    </aside>
  );

  const activeTopicLabel =
    virtualTopics.find((t) => t.id === topicId)?.label ?? categoryName(topicId);

  const P2 = (
    <section className="flex min-h-0 w-full flex-col">
      {/* Mobile: back to topics */}
      <button
        onClick={() => setMobileView("topics")}
        className="mb-2 flex items-center gap-1.5 text-xs text-muted hover:text-fg md:hidden"
      >
        ‹ Topics
      </button>
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-muted">
          {activeTopicLabel}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted">{paneQuestions.length}</span>
          <button
            onClick={openAdd}
            title={isVirtual(topicId) ? "Add question" : `Add question to ${activeTopicLabel}`}
            className="icon-btn text-muted hover:text-fg"
          >
            +
          </button>
        </div>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search in topic…"
            className="input py-1.5 pl-9 text-sm"
          />
        </div>
        <select
          className="input w-auto py-1.5 pr-7 text-xs"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="">Any</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      {addingQ && (
        <div className="mb-2 rounded-lg border border-[var(--accent)] bg-[var(--panel-2)] p-2.5">
          <textarea
            autoFocus
            rows={2}
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitAddQ();
              }
              if (e.key === "Escape") {
                setAddingQ(false);
                setNewQ("");
              }
            }}
            placeholder={
              isVirtual(topicId)
                ? "New question (uncategorized)…"
                : `New question in ${activeTopicLabel}…`
            }
            className="input resize-y text-sm"
          />
          {addErr && <p className="mt-1 text-xs text-[var(--danger)]">{addErr}</p>}
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={submitAddQ}
              disabled={addBusy || !newQ.trim()}
              className="btn btn-primary px-3 py-1.5 text-xs"
            >
              {addBusy ? "Adding…" : "Add"}
            </button>
            <button
              onClick={() => {
                setAddingQ(false);
                setNewQ("");
              }}
              className="btn btn-ghost px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
            <span className="ml-auto text-[11px] text-muted">Enter to add · Esc to cancel</span>
          </div>
        </div>
      )}
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {paneQuestions.map((q) => {
          const activeRow = q.id === questionId;
          return (
            <button
              key={q.id}
              onClick={() => pickQuestion(q.id)}
              className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                activeRow
                  ? "border-[var(--accent)] bg-[var(--panel-2)]"
                  : "border-transparent hover:border-[var(--border)] hover:bg-[var(--panel-2)]"
              }`}
            >
              <div className="flex items-start gap-2">
                {q.pinned && <span className="shrink-0 text-[var(--warning)]">★</span>}
                <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-fg">
                  {q.question}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <DifficultyBadge difficulty={q.difficulty} />
                <StatusBadge status={q.status} />
              </div>
            </button>
          );
        })}
        {paneQuestions.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted">
            No questions here.
          </div>
        )}
      </div>
    </section>
  );

  const P3 = (
    <section className="flex min-h-0 w-full flex-1 flex-col">
      {/* Mobile: back to questions */}
      <button
        onClick={() => setMobileView("questions")}
        className="mb-2 flex items-center gap-1.5 text-xs text-muted hover:text-fg md:hidden"
      >
        ‹ Questions
      </button>
      {active ? (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <div className="min-w-0">
              <div className="mb-1 text-xs text-muted">{categoryName(active.categoryId)}</div>
              <h2 className="text-xl font-semibold leading-snug tracking-[-0.01em]">{active.question}</h2>
            </div>
            {/* All status + actions, top-right */}
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <DifficultyBadge difficulty={active.difficulty} />
              <StatusBadge status={active.status} />
              <button
                onClick={() =>
                  setStatus(active.id, active.status === "Prepared" ? "Not Prepared" : "Prepared")
                }
                className="btn btn-outline px-3 py-1.5 text-xs"
              >
                {active.status === "Prepared" ? "Mark to review" : "Mark prepared"}
              </button>
              <button onClick={() => markReviewed(active.id)} className="btn btn-ghost px-3 py-1.5 text-xs">
                Mark reviewed
              </button>
              <span className="mx-1 h-5 w-px bg-[var(--border)]" />
              <button
                onClick={() => setPinned(active.id, !active.pinned)}
                title={active.pinned ? "Unpin" : "Pin to top"}
                className={`icon-btn text-base ${
                  active.pinned ? "text-[var(--warning)]" : "text-muted hover:text-fg"
                }`}
              >
                {active.pinned ? "★" : "☆"}
              </button>
              <Link href={`/questions/edit?id=${active.id}`} className="btn btn-ghost px-2.5 py-1.5 text-xs">
                Edit
              </Link>
              <button
                onClick={removeActive}
                className="btn btn-ghost px-2.5 py-1.5 text-xs text-[var(--danger)]"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="mb-5">
            <GuidancePanel question={active} />
          </div>

          <AnswerPanel question={active} />

          {active.keyPoints.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
                Key points
              </h3>
              <KeyPointChecklist points={active.keyPoints} questionId={active.id} />
            </div>
          )}

          {active.followUps.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
                Follow-ups
              </h3>
              <ul className="space-y-1.5 text-sm text-fgSoft">
                {active.followUps.map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-muted">→</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {active.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5 border-t pt-4">
              {active.tags.map((t) => (
                <Tag key={t} label={t} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 place-items-center rounded-xl border border-dashed p-10 text-center">
          <p className="text-sm text-muted">Select a question to read its answer.</p>
        </div>
      )}
    </section>
  );

  // ---- Layout ----
  // Desktop: three columns side by side, each scrolls independently and the
  // whole workspace fills the viewport height below the page header.
  // Mobile: one pane at a time (drill-down) controlled by mobileView.
  const show = (v: MobileView) => (mobileView === v ? "flex" : "hidden");

  // A thin draggable grip that only appears on desktop.
  const Resizer = ({ pane }: { pane: 1 | 2 }) => (
    <div
      onPointerDown={startDrag(pane)}
      role="separator"
      aria-orientation="vertical"
      title="Drag to resize"
      className="group hidden shrink-0 cursor-col-resize items-stretch px-1.5 md:flex"
    >
      <div className="w-px bg-[var(--border)] transition-colors group-hover:bg-[var(--accent)]" />
    </div>
  );

  return (
    <div
      ref={rootRef}
      className="flex flex-col overflow-hidden md:flex-row"
      style={{ height: paneHeight ?? "calc(100vh - 12rem)" }}
    >
      {/* P1 */}
      <div
        className={`${show("topics")} w-full min-h-0 shrink-0 max-md:flex-1 md:flex`}
        style={isDesktop ? { width: w1 } : undefined}
      >
        {P1}
      </div>
      <Resizer pane={1} />
      {/* P2 */}
      <div
        className={`${show("questions")} w-full min-h-0 shrink-0 max-md:flex-1 md:flex`}
        style={isDesktop ? { width: w2 } : undefined}
      >
        {P2}
      </div>
      <Resizer pane={2} />
      {/* P3 */}
      <div className={`${show("answer")} card min-h-0 w-full min-w-0 flex-1 p-5 md:flex md:ml-1`}>
        {P3}
      </div>
    </div>
  );
}
