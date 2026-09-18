import { PageHeader, Card } from "@/components/ui";

// A reusable answering checklist, independent of any single question.
const projectChecklist = [
  "Start with business context",
  "Explain architecture",
  "Explain my role",
  "Mention technologies",
  "Explain one real challenge",
  "Explain solution",
  "Explain outcome",
  "Avoid unnecessary technical details",
  "Be ready for follow-up questions",
];

export default function ChecklistsPage() {
  return (
    <>
      <PageHeader
        title="Checklists"
        subtitle="Things to remember while answering"
      />
      <Card className="max-w-2xl">
        <h2 className="mb-3 font-medium">Project Question Checklist</h2>
        <ul className="space-y-2">
          {projectChecklist.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <input type="checkbox" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">
          Editable, database-backed checklists arrive in Phase 1 (Supabase).
        </p>
      </Card>
    </>
  );
}
