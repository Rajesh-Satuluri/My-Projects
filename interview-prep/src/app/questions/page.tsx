"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useData } from "@/components/DataProvider";
import { PageHeader } from "@/components/ui";
import QuestionsBrowser from "@/components/QuestionsBrowser";

function QuestionsInner() {
  const { questions, categories, loading } = useData();
  const tags = [...new Set(questions.flatMap((q) => q.tags))].sort();

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Questions" subtitle="Browse, search and filter" />
        <Link
          href="/questions/new"
          className="rounded-md bg-accent px-3 py-2 text-sm text-white"
        >
          + Add
        </Link>
      </div>
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <QuestionsBrowser questions={questions} categories={categories} tags={tags} />
      )}
    </>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={null}>
      <QuestionsInner />
    </Suspense>
  );
}
