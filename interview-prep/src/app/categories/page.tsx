"use client";

import Link from "next/link";
import { useData } from "@/components/DataProvider";
import { Card, PageHeader } from "@/components/ui";

export default function CategoriesPage() {
  const { categories, questions, loading } = useData();
  const count = (id: string) => questions.filter((q) => q.categoryId === id).length;

  return (
    <>
      <PageHeader title="Categories" subtitle="Question topics" />
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {categories.map((c) => (
            <Link key={c.id} href={`/questions?category=${c.id}`}>
              <Card className="hover:border-accent">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-sm text-muted">{count(c.id)}</span>
                </div>
                {c.description && <p className="mt-1 text-sm text-muted">{c.description}</p>}
              </Card>
            </Link>
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-muted">No categories yet — load starter data from the Dashboard.</p>
          )}
        </div>
      )}
    </>
  );
}
