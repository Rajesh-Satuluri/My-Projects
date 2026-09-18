import Link from "next/link";
import { getCategories, getQuestions } from "@/lib/data";
import { Card, PageHeader } from "@/components/ui";

export default function CategoriesPage() {
  const categories = getCategories();
  const questions = getQuestions();
  const count = (id: string) => questions.filter((q) => q.categoryId === id).length;

  return (
    <>
      <PageHeader title="Categories" subtitle="Question topics" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {categories.map((c) => (
          <Link key={c.id} href={`/questions?category=${c.id}`}>
            <Card className="hover:border-accent">
              <div className="flex items-center justify-between">
                <span className="font-medium">{c.name}</span>
                <span className="text-sm text-muted">{count(c.id)}</span>
              </div>
              {c.description && (
                <p className="mt-1 text-sm text-muted">{c.description}</p>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
