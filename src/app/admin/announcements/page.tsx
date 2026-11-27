import { Megaphone } from "lucide-react";
import { createAnnouncementAction } from "@/app/actions/super-admin";
import { AppShell } from "@/components/layout/AppShell";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Input, Textarea } from "@/components/ui/FormField";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Post Announcements" };

type SearchParams = Promise<{ notice?: string; error?: string }>;

const errors: Record<string, string> = {
  invalid_announcement: "Enter a title and message within the stated length limits.",
  service_unavailable: "Announcements are temporarily unavailable.",
  announcement_failed: "The announcement could not be saved.",
};

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireRole(["campus_admin"], { includeUniversity: false });
  const params = await searchParams;

  return (
    <AppShell
      profile={ctx.profile}
      institutionName={ctx.institutionName}
      pageTitle="Post Announcements"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {params.notice === "announcement_published" && (
          <Alert variant="success">
            Your announcement is now visible to all signed-in users.
          </Alert>
        )}
        {params.error && (
          <Alert variant="danger">
            {errors[params.error] ?? "The request could not be completed."}
          </Alert>
        )}

        <Card>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
            <Megaphone size={20} color="var(--accent-highlight)" />
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 750 }}>Publish an announcement</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                This announcement will be visible to every signed-in CampusFix user.
              </p>
            </div>
          </div>
          <form
            action={createAnnouncementAction}
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <FormField label="Title" htmlFor="title" hint="3 to 140 characters.">
              <Input id="title" name="title" minLength={3} maxLength={140} required />
            </FormField>
            <FormField label="Message" htmlFor="body" hint="10 to 5,000 characters.">
              <Textarea id="body" name="body" minLength={10} maxLength={5000} required />
            </FormField>
            <div>
              <Button type="submit">Publish announcement</Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
