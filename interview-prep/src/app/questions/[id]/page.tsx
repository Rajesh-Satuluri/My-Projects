import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategory, getQuestion } from "@/lib/data";
import { Card, DifficultyBadge, StatusBadge, Tag } from "@/components/ui";
import KeyPointChecklist from "@/components/KeyPointChecklist";
import AnswerReveal from "@/components/AnswerReveal";

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const q = getQuestion(id);
  if (!q) notFound();

  const category = getCategory(q.categoryId);

  return (
    <>
      <Link href="/questions" className="text-sm text-muted hover:text-fg">
        ← Back to questions
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={q.difficulty} />
        <StatusBadge status={q.status} />
        <span className="text-xs text-muted">
          {category?.name}
          {q.subcategory ? ` · ${q.subcategory}` : ""}
        </span>
      </div>

      <h1 className="mt-3 text-2xl font-semibold">{q.question}</h1>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-muted">Answer</h2>
            <AnswerReveal answer={q.answer} />
          </Card>

          {q.followUps.length > 0 && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-muted">Follow-up Questions</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {q.followUps.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-muted">Key Points</h2>
            <KeyPointChecklist points={q.keyPoints} />
          </Card>

          {q.tags.length > 0 && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-muted">Tags</h2>
              <div className="flex flex-wrap gap-1.5">
                {q.tags.map((t) => (
                  <Tag key={t} label={t} />
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
