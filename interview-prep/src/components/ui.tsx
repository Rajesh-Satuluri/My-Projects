import Link from "next/link";
import type { Difficulty, PreparedStatus } from "@/lib/types";

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </header>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border bg-panel p-4 ${className}`}>{children}</div>
  );
}

export function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <div className="text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </Card>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const tone =
    difficulty === "Easy"
      ? "text-emerald-600 border-emerald-300"
      : difficulty === "Medium"
      ? "text-amber-600 border-amber-300"
      : "text-rose-600 border-rose-300";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${tone}`}>{difficulty}</span>
  );
}

export function StatusBadge({ status }: { status: PreparedStatus }) {
  const prepared = status === "Prepared";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs ${
        prepared ? "text-emerald-600 border-emerald-300" : "text-muted border-border"
      }`}
    >
      {status}
    </span>
  );
}

export function Tag({ label }: { label: string }) {
  return (
    <span className="rounded bg-[var(--bg)] px-2 py-0.5 text-xs text-muted">#{label}</span>
  );
}

export function QuestionRow({
  id,
  question,
  categoryName,
  difficulty,
  status,
}: {
  id: string;
  question: string;
  categoryName: string;
  difficulty: Difficulty;
  status: PreparedStatus;
}) {
  return (
    <Link
      href={`/questions/${id}`}
      className="flex items-center justify-between gap-4 border-b px-1 py-3 last:border-b-0 hover:bg-[var(--bg)]"
    >
      <div className="min-w-0">
        <div className="truncate font-medium">{question}</div>
        <div className="mt-0.5 text-xs text-muted">{categoryName}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <DifficultyBadge difficulty={difficulty} />
        <StatusBadge status={status} />
      </div>
    </Link>
  );
}
