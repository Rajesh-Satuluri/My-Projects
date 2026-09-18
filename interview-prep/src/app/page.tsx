import Link from "next/link";
import { getDashboardStats } from "@/lib/data";
import { Card, PageHeader, StatTile } from "@/components/ui";

export default function DashboardPage() {
  const stats = getDashboardStats();

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your interview prep at a glance" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Questions" value={stats.total} />
        <StatTile label="Prepared" value={stats.prepared} />
        <StatTile label="To Review" value={stats.toReview} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-muted">Categories</h2>
          <ul className="space-y-1">
            {stats.perCategory
              .filter((c) => c.count > 0)
              .map(({ category, count }) => (
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
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-muted">Recently Reviewed</h2>
          <ul className="space-y-1">
            {stats.recentlyReviewed.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/questions/${q.id}`}
                  className="block truncate rounded px-2 py-1.5 text-sm hover:bg-[var(--bg)]"
                >
                  {q.question}
                </Link>
              </li>
            ))}
            {stats.recentlyReviewed.length === 0 && (
              <li className="px-2 text-sm text-muted">Nothing reviewed yet.</li>
            )}
          </ul>
        </Card>
      </div>
    </>
  );
}
