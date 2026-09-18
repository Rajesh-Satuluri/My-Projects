"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "./DataProvider";
import { Card } from "./ui";
import type { Difficulty, PreparedStatus, Question } from "@/lib/types";
import type { QuestionInput } from "@/lib/db";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
const STATUSES: PreparedStatus[] = ["Prepared", "Not Prepared"];

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const e = err as { message?: string; details?: string; hint?: string };
    return e.message || e.details || e.hint || JSON.stringify(err);
  }
  return "Save failed";
}

const linesToArray = (s: string) =>
  s.split("\n").map((x) => x.trim()).filter(Boolean);
const csvToArray = (s: string) =>
  s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);

export default function QuestionForm({ existing }: { existing?: Question }) {
  const router = useRouter();
  const { categories, createQuestion, updateQuestion } = useData();

  const [question, setQuestion] = useState(existing?.question ?? "");
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? "");
  const [subcategory, setSubcategory] = useState(existing?.subcategory ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(existing?.difficulty ?? "Medium");
  const [status, setStatus] = useState<PreparedStatus>(existing?.status ?? "Not Prepared");
  const [answer, setAnswer] = useState(existing?.answer ?? "");
  const [keyPoints, setKeyPoints] = useState(
    existing?.keyPoints.map((k) => k.point).join("\n") ?? ""
  );
  const [followUps, setFollowUps] = useState(existing?.followUps.join("\n") ?? "");
  const [tags, setTags] = useState(existing?.tags.join(", ") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const input: QuestionInput = {
      categoryId,
      subcategory: subcategory || undefined,
      question,
      answer: answer || undefined,
      difficulty,
      status,
      keyPoints: linesToArray(keyPoints),
      followUps: linesToArray(followUps),
      tags: csvToArray(tags),
    };
    try {
      if (existing) {
        await updateQuestion(existing.id, input);
        router.push(`/question?id=${existing.id}`);
      } else {
        const id = await createQuestion(input);
        router.push(`/question?id=${id}`);
      }
    } catch (err) {
      setError(errMessage(err));
      setBusy(false);
    }
  };

  const field = "input mt-1.5";
  const label = "label";

  return (
    <Card className="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        <label className={label}>
          Question
          <textarea
            required
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className={field}
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            Category
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={field}
            >
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Sub-category
            <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className={field} />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            Difficulty
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className={field}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PreparedStatus)}
              className={field}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={label}>
          Answer
          <textarea rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} className={field} />
        </label>

        <label className={label}>
          Key Points <span className="text-muted">(one per line)</span>
          <textarea rows={4} value={keyPoints} onChange={(e) => setKeyPoints(e.target.value)} className={field} />
        </label>

        <label className={label}>
          Follow-up Questions <span className="text-muted">(one per line)</span>
          <textarea rows={3} value={followUps} onChange={(e) => setFollowUps(e.target.value)} className={field} />
        </label>

        <label className={label}>
          Tags <span className="text-muted">(comma-separated)</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} className={field} />
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? "Saving…" : existing ? "Save changes" : "Create question"}
          </button>
          <button type="button" onClick={() => router.back()} className="btn btn-outline">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
