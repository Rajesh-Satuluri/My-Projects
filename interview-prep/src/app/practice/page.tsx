"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { PageHeader } from "@/components/ui";
import PracticeDeck from "@/components/PracticeDeck";
import { isDue } from "@/lib/review";

type Filter = "all" | "notprepared" | "due";

export default function PracticePage() {
  const { questions, categories, loading } = useData();
  const [filter, setFilter] = useState<Filter>("all");
  const [seed, setSeed] = useState(0); // bump to reshuffle
  const [shuffleOn, setShuffleOn] = useState(false);

  const dueCount = useMemo(() => questions.filter((q) => isDue(q)).length, [questions]);
  const notPreparedCount = questions.filter((q) => q.status === "Not Prepared").length;

  const deck = useMemo(() => {
    let list = questions.filter((q) => {
      if (filter === "notprepared") return q.status === "Not Prepared";
      if (filter === "due") return isDue(q);
      return true;
    });
    if (shuffleOn) {
      list = [...list];
      // mulberry32 seeded PRNG → deterministic per seed, new order each shuffle
      let a = seed * 2654435761 + 1;
      const rand = () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, filter, shuffleOn, seed]);

  const chip = (val: Filter, label: string, count?: number) => (
    <button
      onClick={() => setFilter(val)}
      className={`pill ${
        filter === val ? "border-accent text-accent" : "border-[var(--border-strong)] text-muted"
      }`}
    >
      {label}
      {count !== undefined && <span className="opacity-70">· {count}</span>}
    </button>
  );

  return (
    <>
      <PageHeader title="Practice" subtitle="Self-test: think first, then reveal the answer" />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {chip("all", "All", questions.length)}
        {chip("notprepared", "Not prepared", notPreparedCount)}
        {chip("due", "Due for review", dueCount)}
        <button
          onClick={() => {
            setShuffleOn(true);
            setSeed((s) => s + 1);
          }}
          className="btn btn-outline ml-auto"
        >
          ⇄ Shuffle
        </button>
        {shuffleOn && (
          <button onClick={() => setShuffleOn(false)} className="btn btn-ghost">
            Reset order
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : deck.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">
          Nothing to practice here. {filter !== "all" && "Try a different filter."}
        </div>
      ) : (
        <PracticeDeck key={`${filter}-${seed}-${shuffleOn}`} questions={deck} categories={categories} />
      )}
    </>
  );
}
