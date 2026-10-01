"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useData } from "@/components/DataProvider";
import { PageHeader } from "@/components/ui";
import ThreePaneBrowser from "@/components/ThreePaneBrowser";

function QuestionsInner() {
  const { questions, categories, loading } = useData();

  return (
    <>
      <PageHeader
        title="Questions"
        subtitle="Pick a topic, choose a question, read the answer."
        action={
          <Link href="/questions/new" className="btn btn-primary">
            + New question
          </Link>
        }
      />
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <ThreePaneBrowser questions={questions} categories={categories} />
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
