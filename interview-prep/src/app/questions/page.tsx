import { Suspense } from "react";
import { getAllTags, getCategories, getQuestions } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import QuestionsBrowser from "@/components/QuestionsBrowser";

export default function QuestionsPage() {
  return (
    <>
      <PageHeader title="Questions" subtitle="Browse, search and filter" />
      <Suspense fallback={null}>
        <QuestionsBrowser
          questions={getQuestions()}
          categories={getCategories()}
          tags={getAllTags()}
        />
      </Suspense>
    </>
  );
}
