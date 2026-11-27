import Link from "next/link";
import { FileText } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { updateIncidentStatusAction } from "@/app/actions/incidents";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Manage Campus Reports" };

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; updated?: string; error?: string }>;
}) {
  const ctx = await requireRole(["campus_admin", "super_admin"]);
  const supabase = await createClient();
  const filters = await searchParams;
  const universityId = ctx.profile.university_id;
  let reports: Array<{
    id: string;
    reference_code: string;
    title: string;
    status: string;
    severity: string;
    created_at: string;
  }> = [];

  if (supabase) {
    let query = supabase
      .from("incidents")
      .select("id, reference_code, title, status, severity, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (ctx.profile.role === "campus_admin" && universityId) {
      query = query.eq("university_id", universityId);
    }
    if (filters.status) query = query.eq("status", filters.status);
    const { data } = await query;
    reports = data ?? [];
  }

  return (
    <AppShell profile={ctx.profile} institutionName={ctx.institutionName} pageTitle="Manage Reports">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {filters.updated && <Alert variant="success" title="Report updated">The incident status and timeline were updated.</Alert>}
        {filters.error && <Alert variant="danger" title="Update failed">{filters.error}</Alert>}
        <Card highlighted>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText size={20} color="var(--accent-highlight)" />
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 800 }}>Incident triage queue</h2>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Review, approve, assign, progress, or resolve reports.</p>
            </div>
          </div>
        </Card>

        <form style={{ display: "flex", gap: "10px" }}>
          <Select name="status" defaultValue={filters.status ?? ""} style={{ width: "220px" }}>
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under review</option>
            <option value="approved">Approved</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </Select>
          <Button type="submit" variant="secondary" size="sm">Filter</Button>
        </form>

        {reports.length === 0 ? (
          <Card><p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "30px" }}>No reports match this view.</p></Card>
        ) : (
          reports.map((report) => (
            <Card key={report.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
                <Link href={`/reports/${report.id}`}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                    <Badge tone={report.status === "resolved" ? "success" : "orange"}>{report.status.replace("_", " ")}</Badge>
                    <Badge tone={report.severity === "critical" || report.severity === "high" ? "red" : "neutral"}>{report.severity}</Badge>
                  </div>
                  <h3 style={{ fontSize: "16px" }}>{report.title}</h3>
                  <div className="mono" style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>{report.reference_code}</div>
                </Link>
                <form action={updateIncidentStatusAction} style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "250px" }}>
                  <input type="hidden" name="incidentId" value={report.id} />
                  <Select name="status" defaultValue={report.status} aria-label="New status">
                    <option value="under_review">Under review</option>
                    <option value="approved">Approved</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </Select>
                  <Textarea name="resolution" placeholder="Resolution or review note (optional)" style={{ minHeight: "70px" }} />
                  <Button type="submit" variant="primary" size="sm">Update report</Button>
                </form>
              </div>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}
