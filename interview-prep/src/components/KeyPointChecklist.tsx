"use client";

import type { KeyPoint } from "@/lib/types";
import { useData } from "./DataProvider";

export default function KeyPointChecklist({ points }: { points: KeyPoint[] }) {
  const { setPointCompleted } = useData();

  if (points.length === 0) {
    return <p className="text-sm text-muted">No key points yet.</p>;
  }

  return (
    <ul className="space-y-1">
      {[...points]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((p) => (
          <li key={p.id}>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[var(--panel-2)]">
              <input
                type="checkbox"
                checked={p.completed}
                onChange={() => setPointCompleted(p.id, !p.completed)}
                className="h-4 w-4 rounded"
              />
              <span className={p.completed ? "text-muted line-through" : "text-fgSoft"}>
                {p.point}
              </span>
            </label>
          </li>
        ))}
    </ul>
  );
}
