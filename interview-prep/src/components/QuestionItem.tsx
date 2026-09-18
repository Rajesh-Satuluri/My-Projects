"use client";

import Link from "next/link";
import type { Question } from "@/lib/types";
import { DifficultyBadge, StatusBadge, Tag } from "./ui";
import AnswerPanel from "./AnswerPanel";
import KeyPointChecklist from "./KeyPointChecklist";
import { useData } from "./DataProvider";

export default function QuestionItem({
  question,
  categoryName,
  open,
  onToggle,
  highlighted = false,
}: {
  question: Question;
  categoryName: string;
  open: boolean;
  onToggle: () => void;
  highlighted?: boolean;
}) {
  const { setStatus, setPinned, deleteQuestion } = useData();

  const remove = () => {
    if (confirm(`Delete "${question.question}"? This can't be undone.`)) {
      deleteQuestion(question.id);
    }
  };

  return (
    <div
      className={`card overflow-hidden transition-shadow ${
        highlighted ? "ring-2 ring-[var(--ring)]" : ""
      }`}
    >
      <div
        className={`flex w-full items-center gap-3 px-5 py-4 transition-colors hover:bg-[var(--panel-2)] ${
          open ? "bg-[var(--panel-2)]" : ""
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPinned(question.id, !question.pinned);
          }}
          title={question.pinned ? "Unpin" : "Pin to top"}
          className={`icon-btn shrink-0 text-base transition-colors ${
            question.pinned ? "text-[var(--warning)]" : "text-muted hover:text-fg"
          }`}
        >
          {question.pinned ? "★" : "☆"}
        </button>

        <button
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted transition-transform duration-200 ${
              open ? "rotate-90" : ""
            }`}
          >
            ❯
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-medium">{question.question}</div>
            <div className="mt-0.5 text-xs text-muted">{categoryName}</div>
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <DifficultyBadge difficulty={question.difficulty} />
            <StatusBadge status={question.status} />
          </div>
        </button>
      </div>

      {open && (
        <div className="border-t px-5 py-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:hidden">
              <DifficultyBadge difficulty={question.difficulty} />
              <StatusBadge status={question.status} />
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() =>
                  setStatus(
                    question.id,
                    question.status === "Prepared" ? "Not Prepared" : "Prepared"
                  )
                }
                className="btn btn-ghost px-2.5 py-1.5 text-xs"
              >
                {question.status === "Prepared" ? "Mark to review" : "Mark prepared"}
              </button>
              <Link
                href={`/questions/edit?id=${question.id}`}
                className="btn btn-ghost px-2.5 py-1.5 text-xs"
              >
                Edit details
              </Link>
              <button
                onClick={remove}
                className="btn btn-ghost px-2.5 py-1.5 text-xs text-[var(--danger)]"
              >
                Delete
              </button>
            </div>
          </div>

          <AnswerPanel question={question} />

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {question.keyPoints.length > 0 && (
              <div>
                <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  Key points
                </h3>
                <KeyPointChecklist points={question.keyPoints} />
              </div>
            )}
            {question.followUps.length > 0 && (
              <div>
                <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  Follow-ups
                </h3>
                <ul className="space-y-1.5 text-sm text-fgSoft">
                  {question.followUps.map((f, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-muted">→</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {question.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5 border-t pt-4">
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
