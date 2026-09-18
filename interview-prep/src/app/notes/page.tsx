"use client";

import { useData } from "@/components/DataProvider";
import { PageHeader } from "@/components/ui";
import NotesWorkspace from "@/components/NotesWorkspace";

export default function NotesPage() {
  const { loading } = useData();
  return (
    <>
      <PageHeader title="Notes" subtitle="Free-form tabs for your project story and anything else" />
      {loading ? <p className="text-sm text-muted">Loading…</p> : <NotesWorkspace />}
    </>
  );
}
