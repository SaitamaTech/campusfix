import { requireAuthenticatedContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const ctx = await requireAuthenticatedContext();
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from("notifications")
        .select("id, title, message, link, is_read, created_at")
        .eq("user_id", ctx.userId)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: null };
  const notifications = data ?? [];

  async function markRead(formData: FormData) {
    "use server";
    const notificationId = String(formData.get("notificationId") ?? "");
    if (!notificationId) return;
    const client = await createClient();
    if (!client) return;
    await client
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", ctx.userId);
    revalidatePath("/notifications");
  }

  return (
    <AppShell profile={ctx.profile} university={ctx.university} pageTitle="Notifications">
      <Card>
        {notifications.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "30px" }}>
            You have no notifications yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {notifications.map((notification) => (
              <div key={notification.id} style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", padding: "13px", borderRadius: "10px", border: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <strong style={{ fontSize: "14px" }}>{notification.title}</strong>
                    {!notification.is_read && <Badge tone="orange">Unread</Badge>}
                  </div>
                  <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>{notification.message}</p>
                  {notification.link && (
                    <a href={notification.link} style={{ color: "#7dd3fc", fontSize: "12px" }}>View report</a>
                  )}
                </div>
                {!notification.is_read && (
                  <form action={markRead}>
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <Button type="submit" variant="ghost" size="sm">Mark read</Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
