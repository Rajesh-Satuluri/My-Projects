"use client";

import Link from "next/link";
import { useData } from "@/components/DataProvider";
import { Card, PageHeader, StatTile } from "@/components/ui";
import { loadStarterData } from "@/lib/seedRemote";
import { useState } from "react";

export default function DashboardPage() {
  const { questions, categories, loading, error, reload } = useData();
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  const prepared = questions.filter((q) => q.status === "Prepared").length;
  const perCategory = categories
    .map((category) => ({
      category,
      count: questions.filter((q) => q.categoryId === category.id).length,
    }))
    .filter((c) => c.count > 0);
  const recentlyReviewed = [...questions]
    .filter((q) => q.lastReviewedAt)
    .sort((a, b) => (b.lastReviewedAt! > a.lastReviewedAt! ? 1 : -1))
    .slice(0, 5);

  const seed = async () => {
    setSeeding(true);
    setSeedError(null);
    try {
      await loadStarterData();
      await reload();
    } catch (e) {
      setSeedError(e instanceof Error ? e.message : "Seeding failed");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your interview prep at a glance" />

      {error && (
        <Card className="mb-4 border-rose-300">
          <p className="text-sm text-rose-600">{error}</p>
          <p className="mt-1 text-xs text-muted">
            If tables are missing, run supabase/schema.sql in the Supabase SQL editor.
          </p>
        </Card>
      )}

      {!loading && questions.length === 0 && categories.length === 0 && (
        <Card className="mb-6">
          <h2 className="font-medium">No data yet</h2>
          <p className="mt-1 text-sm text-muted">
            Load the 15 starter categories and sample questions to get going.
          </p>
          <button
            onClick={seed}
            disabled={seeding}
            className="mt-3 rounded-md bg-accent px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            {seeding ? "Loading…" : "Load starter data"}
          </button>
          {seedError && <p className="mt-2 text-sm text-rose-600">{seedError}</p>}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Questions" value={questions.length} />
        <StatTile label="Prepared" value={prepared} />
        <StatTile label="To Review" value={questions.length - prepared} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-muted">Categories</h2>
          <ul className="space-y-1">
            {perCategory.map(({ category, count }) => (
              <li key={category.id}>
                <Link
                  href={`/questions?category=${category.id}`}
                  className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-[var(--bg)]"
                >
                  <span>{category.name}</span>
                  <span className="text-muted">{count}</span>
                </Link>
              </li>
            ))}
            {perCategory.length === 0 && (
              <li className="px-2 text-sm text-muted">No categories yet.</li>
            )}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-muted">Recently Reviewed</h2>
          <ul className="space-y-1">
            {recentlyReviewed.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/question?id=${q.id}`}
                  className="block truncate rounded px-2 py-1.5 text-sm hover:bg-[var(--bg)]"
                >
                  {q.question}
                </Link>
              </li>
            ))}
            {recentlyReviewed.length === 0 && (
              <li className="px-2 text-sm text-muted">Nothing reviewed yet.</li>
            )}
          </ul>
        </Card>
      </div>
    </>
  );
}
