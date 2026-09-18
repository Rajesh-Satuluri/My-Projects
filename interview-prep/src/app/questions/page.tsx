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
      <PageHeader
        title="Questions"
        subtitle="Click a question to read the answer. Unlock to edit inline."
        action={
          <Link href="/questions/new" className="btn btn-primary">
            + New question
          </Link>
        }
      />
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
