"use client";

import Link from "next/link";
import { useState } from "react";
import { useData } from "@/components/DataProvider";
import { Card, PageHeader, StatTile } from "@/components/ui";
import { loadStarterData } from "@/lib/seedRemote";
import { isDue } from "@/lib/review";

export default function DashboardPage() {
  const { questions, categories, loading, error, reload } = useData();
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  const prepared = questions.filter((q) => q.status === "Prepared").length;
  const dueCount = questions.filter((q) => isDue(q)).length;
  const pct = questions.length ? Math.round((prepared / questions.length) * 100) : 0;
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
        <div className="card mb-6 border-[var(--danger)] p-4">
          <p className="text-sm text-[var(--danger)]">{error}</p>
          <p className="mt-1 text-xs text-muted">
            If tables are missing, run supabase/schema.sql in the Supabase SQL editor.
          </p>
        </div>
      )}

      {!loading && questions.length === 0 && categories.length === 0 && (
        <Card className="mb-6">
          <h2 className="font-medium">Get started</h2>
          <p className="mt-1 text-sm text-muted">
            Load the 15 starter categories and sample questions to begin.
          </p>
          <button onClick={seed} disabled={seeding} className="btn btn-primary mt-4">
            {seeding ? "Loading…" : "Load starter data"}
          </button>
          {seedError && <p className="mt-2 text-sm text-[var(--danger)]">{seedError}</p>}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Questions" value={questions.length} />
        <StatTile label="Prepared" value={prepared} accent="success" />
        <StatTile label="To review" value={questions.length - prepared} accent="warning" />
      </div>

      {questions.length > 0 && (
        <Card className="mt-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Preparation progress</span>
            <span className="text-muted">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--panel-2)]">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          {dueCount > 0 && (
            <Link
              href="/practice"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
            >
              ● {dueCount} due for review → practice
            </Link>
          )}
        </Card>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Categories
          </h2>
          <ul className="-mx-2 space-y-0.5">
            {perCategory.map(({ category, count }) => (
              <li key={category.id}>
                <Link
                  href={`/questions?category=${category.id}`}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[var(--panel-2)]"
                >
                  <span>{category.name}</span>
                  <span className="text-xs text-muted">{count}</span>
                </Link>
              </li>
            ))}
            {perCategory.length === 0 && (
              <li className="px-2 text-sm text-muted">No categories yet.</li>
            )}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Recently reviewed
          </h2>
          <ul className="-mx-2 space-y-0.5">
            {recentlyReviewed.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/question?id=${q.id}`}
                  className="block truncate rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[var(--panel-2)]"
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
