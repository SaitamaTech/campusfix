import Link from "next/link";
import { Compass, MapPin, ShieldCheck } from "lucide-react";
import { requireAuthenticatedContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Incident } from "@/types/database";

export const metadata = { title: "Explore Campus Reports" };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; severity?: string }>;
}) {
  const ctx = await requireAuthenticatedContext();
  const supabase = await createClient();
  const filters = await searchParams;
  let incidents: Incident[] = [];

  if (supabase && ctx.profile.university_id) {
    let query = supabase
      .from("incidents")
      .select("*, category:incident_categories(name, slug, icon_name), location:campus_locations(name, building_code)")
      .eq("university_id", ctx.profile.university_id)
      .neq("status", "rejected")
      .order("created_at", { ascending: false })
      .limit(100);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.severity) query = query.eq("severity", filters.severity);
    const { data } = await query;
    incidents = (data ?? []) as unknown as Incident[];
  }

  return (
    <AppShell profile={ctx.profile} university={ctx.university} pageTitle="Explore Reports">
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <Card highlighted>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Compass size={22} color="var(--accent-highlight)" />
            <div>
              <h2 style={{ fontSize: "19px", fontWeight: 800 }}>Community report board</h2>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Confirm issues you have seen and help prioritize real campus needs.
              </p>
            </div>
          </div>
        </Card>

        <form style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <select name="status" defaultValue={filters.status ?? ""} style={{ height: "38px", padding: "0 10px", borderRadius: "8px", background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border-default)" }}>
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under review</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <select name="severity" defaultValue={filters.severity ?? ""} style={{ height: "38px", padding: "0 10px", borderRadius: "8px", background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border-default)" }}>
            <option value="">All severity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <button type="submit" style={{ height: "38px", padding: "0 14px", borderRadius: "8px", border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-primary)", cursor: "pointer" }}>Apply filters</button>
        </form>

        {incidents.length === 0 ? (
          <Card>
            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "28px" }}>
              No reports match these filters.
            </p>
          </Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
            {incidents.map((incident) => (
              <Link key={incident.id} href={`/reports/${incident.id}`}>
                <Card interactive>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                    <Badge tone={incident.status === "resolved" ? "success" : "orange"}>{incident.status.replace("_", " ")}</Badge>
                    <span className="mono" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{incident.reference_code}</span>
                  </div>
                  <h3 style={{ fontSize: "16px", marginTop: "12px" }}>{incident.title}</h3>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px", lineHeight: 1.5 }}>
                    {incident.category?.name ?? "Campus issue"} &bull; {incident.severity} severity
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "14px", color: "var(--text-muted)", fontSize: "12px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <MapPin size={13} />{incident.location?.name ?? incident.custom_location_name ?? "Campus"}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <ShieldCheck size={13} />{Number(incident.confidence_score).toFixed(0)}%
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
