import { Megaphone } from "lucide-react";
import { createAnnouncementAction, toggleAnnouncementAction } from "@/app/actions/super-admin";
import { AppShell } from "@/components/layout/AppShell";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Input, Textarea } from "@/components/ui/FormField";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Platform Announcements" };

type SearchParams = Promise<{ notice?: string; error?: string }>;

const notices: Record<string, string> = {
  announcement_published: "Announcement is now visible to all signed-in users.",
  announcement_unpublished: "Announcement is no longer visible to users.",
};

const errors: Record<string, string> = {
  invalid_announcement: "Enter a title and message within the stated length limits.",
  service_unavailable: "Announcements are temporarily unavailable.",
  announcement_failed: "The announcement could not be saved.",
};

export default async function SuperAdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireRole(["super_admin"], { includeUniversity: false });
  const params = await searchParams;
  const supabase = await createClient();
  const { data, error } = supabase
    ? await supabase
        .from("announcements")
        .select("id, title, body, is_published, created_at")
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: null, error: new Error("Supabase is not configured.") };

  if (error) {
    console.error("Super-admin announcements query failed:", error);
  }

  return (
    <AppShell
      profile={ctx.profile}
      institutionName={ctx.institutionName}
      pageTitle="Platform Announcements"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {params.notice && notices[params.notice] && (
          <Alert variant="success">{notices[params.notice]}</Alert>
        )}
        {params.error && (
          <Alert variant="danger">{errors[params.error] ?? "The request could not be completed."}</Alert>
        )}
        {error && (
          <Alert variant="danger">
            Announcement history could not be loaded. Please refresh or contact support.
          </Alert>
        )}

        <Card>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
            <Megaphone size={20} color="var(--accent-highlight)" />
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 750 }}>Publish a platform announcement</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                Published posts appear in the Announcements page for every signed-in user.
              </p>
            </div>
          </div>
          <form action={createAnnouncementAction} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
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

        <Card>
          <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "14px" }}>Recent announcements</h2>
          {!data?.length ? (
            <p style={{ color: "var(--text-secondary)" }}>
              {error ? "Announcements are unavailable." : "No announcements have been posted yet."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {data.map((announcement) => (
                <article
                  key={announcement.id}
                  style={{ padding: "14px", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: 700 }}>{announcement.title}</h3>
                      <time
                        dateTime={announcement.created_at}
                        style={{ display: "block", marginTop: "4px", color: "var(--text-muted)", fontSize: "12px" }}
                      >
                        {new Date(announcement.created_at).toLocaleString()}
                      </time>
                    </div>
                    <Badge tone={announcement.is_published ? "success" : "neutral"}>
                      {announcement.is_published ? "Published" : "Unpublished"}
                    </Badge>
                  </div>
                  <p style={{ marginTop: "10px", whiteSpace: "pre-wrap", color: "var(--text-secondary)", fontSize: "14px" }}>
                    {announcement.body}
                  </p>
                  <form action={toggleAnnouncementAction} style={{ marginTop: "12px" }}>
                    <input type="hidden" name="announcementId" value={announcement.id} />
                    <input type="hidden" name="isPublished" value={String(!announcement.is_published)} />
                    <Button type="submit" variant="secondary" size="sm">
                      {announcement.is_published ? "Unpublish" : "Publish"}
                    </Button>
                  </form>
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
