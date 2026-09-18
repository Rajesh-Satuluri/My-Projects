import { getAllTags, getCategories, getQuestions } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import QuestionsBrowser from "@/components/QuestionsBrowser";

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  return (
    <>
      <PageHeader title="Questions" subtitle="Browse, search and filter" />
      <QuestionsBrowser
        questions={getQuestions()}
        categories={getCategories()}
        tags={getAllTags()}
        initialCategory={category ?? ""}
      />
    </>
  );
}
