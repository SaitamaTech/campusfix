import Link from "next/link";
import { MapPin } from "lucide-react";
import { requireAuthenticatedContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "Campus Map" };

export default async function MapPage() {
  const ctx = await requireAuthenticatedContext();
  const supabase = await createClient();
  const { data } = supabase && ctx.profile.university_id
    ? await supabase
        .from("incidents")
        .select("id, reference_code, title, status, severity, latitude, longitude")
        .eq("university_id", ctx.profile.university_id)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .neq("status", "rejected")
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: null };
  const incidents = data ?? [];

  return (
    <AppShell profile={ctx.profile} university={ctx.university} pageTitle="Campus Map">
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: "16px" }}>
        <Card>
          <iframe
            title="Campus incident map"
            src="https://www.openstreetmap.org/export/embed.html?bbox=4.722%2C7.607%2C4.750%2C7.630&layer=mapnik"
            style={{ width: "100%", height: "560px", border: 0, borderRadius: "10px", background: "var(--bg-surface)" }}
          />
        </Card>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <MapPin size={18} color="#fb923c" />
            <h2 style={{ fontSize: "16px" }}>Mapped reports</h2>
          </div>
          {incidents.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              No reports include exact GPS coordinates yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {incidents.map((incident) => (
                <Link key={incident.id} href={`/reports/${incident.id}`} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                    <strong style={{ fontSize: "13px" }}>{incident.title}</strong>
                    <Badge tone={incident.status === "resolved" ? "success" : "orange"}>{incident.status.replace("_", " ")}</Badge>
                  </div>
                  <span className="mono" style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginTop: "5px" }}>
                    {incident.latitude?.toFixed(5)}, {incident.longitude?.toFixed(5)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
