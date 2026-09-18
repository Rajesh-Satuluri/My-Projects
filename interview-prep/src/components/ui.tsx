import type { Difficulty, PreparedStatus } from "@/lib/types";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: "default" | "success" | "warning";
}) {
  const color =
    accent === "success"
      ? "text-[var(--success)]"
      : accent === "warning"
      ? "text-[var(--warning)]"
      : "text-fg";
  return (
    <div className="card p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-2 text-3xl font-semibold tracking-[-0.02em] ${color}`}>{value}</div>
    </div>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const map: Record<Difficulty, { dot: string; text: string }> = {
    Easy: { dot: "bg-[var(--success)]", text: "text-[var(--success)]" },
    Medium: { dot: "bg-[var(--warning)]", text: "text-[var(--warning)]" },
    Hard: { dot: "bg-[var(--danger)]", text: "text-[var(--danger)]" },
  };
  const s = map[difficulty];
  return (
    <span className="pill border-[var(--border)]">
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      <span className={s.text}>{difficulty}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: PreparedStatus }) {
  const prepared = status === "Prepared";
  return (
    <span
      className="pill"
      style={{
        borderColor: prepared ? "var(--success)" : "var(--border-strong)",
        color: prepared ? "var(--success)" : "var(--muted)",
        background: prepared ? "var(--success-bg)" : "transparent",
      }}
    >
      {prepared ? "● Prepared" : "○ To review"}
    </span>
  );
}

export function Tag({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-[var(--panel-2)] px-2 py-1 text-xs font-medium text-muted">
      #{label}
    </span>
  );
}
