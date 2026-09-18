import { PageHeader, Card } from "@/components/ui";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <Card className="max-w-2xl">
        <p className="text-sm text-muted">
          Phase 0 template. Authentication, data source (Supabase), and preferences
          land in Phase 1.
        </p>
      </Card>
    </>
  );
}
