"use client";

import { useState } from "react";
import Link from "next/link";
import type { Category, Question } from "@/lib/types";
import { DifficultyBadge, StatusBadge, Tag } from "./ui";
import AnswerPanel from "./AnswerPanel";
import KeyPointChecklist from "./KeyPointChecklist";
import { useData } from "./DataProvider";

// A question rendered as an expandable row. Clicking the header reveals the
// answer inline for reading (with the lock/unlock inline editor), key points,
// follow-ups and tags — no navigation to a separate editor window.
export default function QuestionItem({
  question,
  categoryName,
}: {
  question: Question;
  categoryName: string;
}) {
  const [open, setOpen] = useState(false);
  const { setStatus } = useData();

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-1 py-3 text-left hover:bg-[var(--bg)]"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className={`text-muted transition-transform ${open ? "rotate-90" : ""}`}>›</span>
          <div className="min-w-0">
            <div className="truncate font-medium">{question.question}</div>
            <div className="mt-0.5 text-xs text-muted">{categoryName}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DifficultyBadge difficulty={question.difficulty} />
          <StatusBadge status={question.status} />
        </div>
      </button>

      {open && (
        <div className="space-y-5 px-1 pb-5 pl-6">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Answer</h3>
              <div className="flex items-center gap-3 text-xs">
                <button
                  onClick={() =>
                    setStatus(
                      question.id,
                      question.status === "Prepared" ? "Not Prepared" : "Prepared"
                    )
                  }
                  className="text-muted hover:text-fg"
                >
                  Mark {question.status === "Prepared" ? "Not Prepared" : "Prepared"}
                </button>
                <Link
                  href={`/questions/edit?id=${question.id}`}
                  className="text-muted hover:text-fg"
                >
                  Edit details
                </Link>
              </div>
            </div>
            <AnswerPanel question={question} />
          </div>

          {question.keyPoints.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Key Points</h3>
              <KeyPointChecklist points={question.keyPoints} />
            </div>
          )}

          {question.followUps.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Follow-ups</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {question.followUps.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {question.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {question.tags.map((t) => (
                <Tag key={t} label={t} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
