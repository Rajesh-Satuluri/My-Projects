"use client";

import { PageHeader } from "@/components/ui";
import QuestionForm from "@/components/QuestionForm";

export default function NewQuestionPage() {
  return (
    <>
      <PageHeader title="Add Question" />
      <QuestionForm />
    </>
  );
}
