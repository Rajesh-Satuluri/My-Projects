"use client";

import { useData } from "@/components/DataProvider";
import { PageHeader } from "@/components/ui";
import PracticeDeck from "@/components/PracticeDeck";

export default function PracticePage() {
  const { questions, categories, loading } = useData();
  return (
    <>
      <PageHeader title="Practice" subtitle="Flip through questions and self-check" />
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : questions.length === 0 ? (
        <p className="text-sm text-muted">No questions yet.</p>
      ) : (
        <PracticeDeck questions={questions} categories={categories} />
      )}
    </>
  );
}
