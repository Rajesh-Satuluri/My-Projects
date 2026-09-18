"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useData } from "@/components/DataProvider";
import { PageHeader } from "@/components/ui";
import QuestionForm from "@/components/QuestionForm";

function EditInner() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const { questions, loading } = useData();
  const q = questions.find((x) => x.id === id);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (!q) return <p className="text-sm text-muted">Question not found.</p>;

  return (
    <>
      <PageHeader title="Edit Question" />
      <QuestionForm existing={q} />
    </>
  );
}

export default function EditQuestionPage() {
  return (
    <Suspense fallback={null}>
      <EditInner />
    </Suspense>
  );
}
