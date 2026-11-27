import { Megaphone } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { requireAuthenticatedContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const ctx = await requireAuthenticatedContext({ allowUnassignedCampus: true });
  const supabase = await createClient();
  const { data, error } = supabase
    ? await supabase
        .from("announcements")
        .select("id, title, body, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: null, error: new Error("Supabase is not configured.") };

  if (error) {
    console.error("Announcements feed query failed:", error);
  }

  return (
    <AppShell
      profile={ctx.profile}
      institutionName={ctx.institutionName}
      pageTitle="Announcements"
    >
      {error ? (
        <Alert variant="danger">
          Announcements could not be loaded. Please refresh or contact support.
        </Alert>
      ) : !data?.length ? (
        <Card>
          <div style={{ textAlign: "center", padding: "24px" }}>
            <Megaphone size={24} color="var(--text-muted)" />
            <p style={{ marginTop: "10px", color: "var(--text-secondary)" }}>
              There are no current announcements.
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {data.map((announcement) => (
            <Card key={announcement.id}>
              <article>
                <h2 style={{ fontSize: "18px", fontWeight: 750 }}>{announcement.title}</h2>
                <time
                  dateTime={announcement.created_at}
                  style={{ display: "block", marginTop: "5px", color: "var(--text-muted)", fontSize: "12px" }}
                >
                  {new Date(announcement.created_at).toLocaleString()}
                </time>
                <p style={{ marginTop: "14px", whiteSpace: "pre-wrap", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  {announcement.body}
                </p>
              </article>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
