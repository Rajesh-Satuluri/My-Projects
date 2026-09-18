"use client";

import type { KeyPoint } from "@/lib/types";
import { useData } from "./DataProvider";

// Toggles persist to Supabase (question_points.completed) via the provider.
export default function KeyPointChecklist({ points }: { points: KeyPoint[] }) {
  const { setPointCompleted } = useData();

  if (points.length === 0) {
    return <p className="text-sm text-muted">No key points yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {[...points]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((p) => (
          <li key={p.id}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={p.completed}
                onChange={() => setPointCompleted(p.id, !p.completed)}
              />
              <span className={p.completed ? "text-muted line-through" : ""}>{p.point}</span>
            </label>
          </li>
        ))}
    </ul>
  );
}
