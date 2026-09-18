import { getCategories, getQuestions } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import PracticeDeck from "@/components/PracticeDeck";

export default function PracticePage() {
  return (
    <>
      <PageHeader title="Practice" subtitle="Flip through questions and self-check" />
      <PracticeDeck questions={getQuestions()} categories={getCategories()} />
    </>
  );
}
