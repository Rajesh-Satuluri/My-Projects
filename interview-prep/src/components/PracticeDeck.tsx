"use client";

import { useState } from "react";
import type { Category, Question } from "@/lib/types";
import { Card, DifficultyBadge, StatusBadge } from "@/components/ui";
import { useData } from "@/components/DataProvider";
import { daysAgoLabel } from "@/lib/review";

export default function PracticeDeck({
  questions,
  categories,
}: {
  questions: Question[];
  categories: Category[];
}) {
  const { markReviewed, setStatus } = useData();
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const q = questions[i];
  const categoryName = categories.find((c) => c.id === q.categoryId)?.name ?? "";

  const go = (delta: number) => {
    setI((prev) => (prev + delta + questions.length) % questions.length);
    setRevealed(false);
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-muted">{categoryName}</span>
        <div className="flex items-center gap-2">
          <DifficultyBadge difficulty={q.difficulty} />
          <StatusBadge status={q.status} />
        </div>
      </div>

      <h2 className="text-xl font-semibold tracking-[-0.01em]">{q.question}</h2>
      <p className="mt-1 text-xs text-muted">Last reviewed: {daysAgoLabel(q.lastReviewedAt)}</p>

      {q.guidance && (
        <div className="mt-5 rounded-xl border border-l-2 border-l-accent bg-[var(--panel-2)]/40 p-4">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
            What the interviewer is looking for
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-6 text-fgSoft">{q.guidance}</p>
        </div>
      )}

      <div className="mt-5 border-t pt-5">
        {revealed ? (
          q.answer ? (
            <p className="whitespace-pre-wrap text-[15px] leading-7 text-fgSoft">{q.answer}</p>
          ) : (
            <p className="text-sm italic text-muted">No answer written yet.</p>
          )
        ) : (
          <button onClick={() => setRevealed(true)} className="btn btn-outline">
            Show answer
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t pt-5">
        <button
          onClick={() => {
            markReviewed(q.id);
            go(1);
          }}
          className="btn btn-primary"
        >
          ✓ Reviewed · next
        </button>
        <button
          onClick={() => setStatus(q.id, q.status === "Prepared" ? "Not Prepared" : "Prepared")}
          className="btn btn-outline"
        >
          {q.status === "Prepared" ? "Mark to review" : "Mark prepared"}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => go(-1)} className="btn btn-ghost">
            ← Prev
          </button>
          <span className="text-sm text-muted">
            {i + 1} / {questions.length}
          </span>
          <button onClick={() => go(1)} className="btn btn-ghost">
            Next →
          </button>
        </div>
      </div>
    </Card>
  );
}
