"use client";

import { useState } from "react";
import type { Category, Question } from "@/lib/types";
import { Card } from "@/components/ui";
import KeyPointChecklist from "@/components/KeyPointChecklist";
import AnswerReveal from "@/components/AnswerReveal";

export default function PracticeDeck({
  questions,
  categories,
}: {
  questions: Question[];
  categories: Category[];
}) {
  const [i, setI] = useState(0);
  if (questions.length === 0) return <p className="text-sm text-muted">No questions.</p>;

  const q = questions[i];
  const categoryName = categories.find((c) => c.id === q.categoryId)?.name ?? "";

  const go = (delta: number) =>
    setI((prev) => (prev + delta + questions.length) % questions.length);

  return (
    <Card className="mx-auto max-w-2xl">
      <div className="text-xs text-muted">{categoryName}</div>
      <h2 className="mt-2 text-xl font-semibold">{q.question}</h2>

      <div className="my-4 border-t" />

      <h3 className="mb-2 text-sm font-semibold text-muted">Key Points</h3>
      {/* key prop forces a fresh checklist per card */}
      <KeyPointChecklist key={q.id} points={q.keyPoints} />

      <div className="mt-4">
        <AnswerReveal key={`ans-${q.id}`} answer={q.answer} />
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <button onClick={() => go(-1)} className="rounded-md border px-3 py-1.5 hover:bg-[var(--bg)]">
          ← Previous
        </button>
        <span className="text-muted">
          Question {i + 1} / {questions.length}
        </span>
        <button onClick={() => go(1)} className="rounded-md border px-3 py-1.5 hover:bg-[var(--bg)]">
          Next →
        </button>
      </div>
    </Card>
  );
}
