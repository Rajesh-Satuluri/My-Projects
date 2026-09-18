"use client";

import { useData } from "@/components/DataProvider";
import { PageHeader, Card } from "@/components/ui";

export default function SettingsPage() {
  const { session, questions, categories } = useData();
  return (
    <>
      <PageHeader title="Settings" />
      <Card className="max-w-2xl space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Signed in as</span>
          <span>{session?.user?.email ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Categories</span>
          <span>{categories.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Questions</span>
          <span>{questions.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Backend</span>
          <span>Supabase</span>
        </div>
      </Card>
    </>
  );
}
