"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useData } from "@/components/DataProvider";
import { Card, DifficultyBadge, StatusBadge, Tag } from "@/components/ui";
import KeyPointChecklist from "@/components/KeyPointChecklist";
import AnswerPanel from "@/components/AnswerPanel";

function QuestionInner() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id") ?? "";
  const { questions, categories, loading, setStatus, deleteQuestion } = useData();

  const q = questions.find((x) => x.id === id);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (!q) {
    return (
      <div>
        <Link href="/questions" className="text-sm text-muted hover:text-fg">
          ← Back to questions
        </Link>
        <p className="mt-4 text-sm text-muted">Question not found.</p>
      </div>
    );
  }

  const category = categories.find((c) => c.id === q.categoryId);
  const togglePrepared = () =>
    setStatus(q.id, q.status === "Prepared" ? "Not Prepared" : "Prepared");

  const remove = async () => {
    if (confirm("Delete this question?")) {
      await deleteQuestion(q.id);
      router.push("/questions");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Link href="/questions" className="text-sm text-muted hover:text-fg">
          ← Back to questions
        </Link>
        <div className="flex gap-2">
          <Link
            href={`/questions/edit?id=${q.id}`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-[var(--bg)]"
          >
            Edit
          </Link>
          <button
            onClick={remove}
            className="rounded-md border border-rose-300 px-3 py-1.5 text-sm text-rose-600 hover:bg-[var(--bg)]"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={q.difficulty} />
        <button onClick={togglePrepared} title="Toggle prepared status">
          <StatusBadge status={q.status} />
        </button>
        <span className="text-xs text-muted">
          {category?.name}
          {q.subcategory ? ` · ${q.subcategory}` : ""}
        </span>
      </div>

      <h1 className="mt-3 text-2xl font-semibold">{q.question}</h1>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-muted">Answer</h2>
            <AnswerPanel question={q} />
          </Card>

          {q.followUps.length > 0 && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-muted">Follow-up Questions</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {q.followUps.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-muted">Key Points</h2>
            <KeyPointChecklist points={q.keyPoints} />
          </Card>

          {q.tags.length > 0 && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-muted">Tags</h2>
              <div className="flex flex-wrap gap-1.5">
                {q.tags.map((t) => (
                  <Tag key={t} label={t} />
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

export default function QuestionDetailPage() {
  return (
    <Suspense fallback={null}>
      <QuestionInner />
    </Suspense>
  );
}
