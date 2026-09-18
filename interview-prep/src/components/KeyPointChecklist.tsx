"use client";

import { useState } from "react";
import type { KeyPoint } from "@/lib/types";

// Phase 0: checklist toggles are local UI state only (not persisted).
// Phase 1 will persist `completed` per point to Supabase.
export default function KeyPointChecklist({ points }: { points: KeyPoint[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(points.map((p) => [p.id, p.completed]))
  );

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
                checked={!!checked[p.id]}
                onChange={() =>
                  setChecked((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                }
              />
              <span className={checked[p.id] ? "text-muted line-through" : ""}>
                {p.point}
              </span>
            </label>
          </li>
        ))}
    </ul>
  );
}
