import Link from "next/link";
import { FileText } from "lucide-react";
import { updateIncidentStatusAction } from "@/app/actions/incidents";
import { CampusSelector } from "@/components/admin/CampusSelector";
import { AppShell } from "@/components/layout/AppShell";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/FormField";
import { selectAdminCampusId } from "@/lib/auth/admin-campus";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { INCIDENT_STATUS_LABELS, INCIDENT_STATUS_TRANSITIONS } from "@/lib/incidents/status";
import type { IncidentStatus } from "@/types/database";

export const metadata = { title: "Manage Campus Reports" };

const statuses: IncidentStatus[] = [
  "submitted",
  "under_review",
  "approved",
  "assigned",
  "in_progress",
  "resolved",
  "rejected",
  "reopened",
];

function isIncidentStatus(value: string | undefined): value is IncidentStatus {
  return Boolean(value && statuses.includes(value as IncidentStatus));
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    universityId?: string;
    updated?: string;
    error?: string;
  }>;
}) {
  const ctx = await requireRole(["campus_admin", "super_admin"], { includeUniversity: false });
  const supabase = await createClient();
  const filters = await searchParams;
  let campuses: Array<{ id: string; name: string; is_active: boolean }> = [];
  let campusError: unknown = null;

  if (supabase && ctx.profile.role === "super_admin") {
    const result = await supabase.from("universities").select("id, name, is_active").order("name");
    campuses = result.data ?? [];
    campusError = result.error;
  } else if (supabase && ctx.profile.university_id) {
    const result = await supabase
      .from("universities")
      .select("id, name, is_active")
      .eq("id", ctx.profile.university_id)
      .maybeSingle();
    campuses = result.data ? [result.data] : [];
    campusError = result.error;
  }

  if (campusError) console.error("Report triage campus query failed:", campusError);
  const campusId = selectAdminCampusId(
    ctx.profile.role,
    ctx.profile.university_id,
    filters.universityId ?? null,
    campuses.map((campus) => campus.id)
  );
  const selectedCampus = campuses.find((campus) => campus.id === campusId);
  const statusFilter = isIncidentStatus(filters.status) ? filters.status : "";

  let reports: Array<{
    id: string;
    reference_code: string;
    title: string;
    status: IncidentStatus;
    severity: string;
    created_at: string;
    university_id: string;
  }> = [];
  let departments: Array<{ id: string; name: string }> = [];
  let activeAssignments: Array<{
    incident_id: string;
    department_id: string;
    assigned_to_name: string | null;
    notes: string | null;
  }> = [];
  let reportsError: unknown = null;

  if (supabase && campusId) {
    const [reportResult, departmentResult] = await Promise.all([
      (() => {
        let query = supabase
          .from("incidents")
          .select("id, reference_code, title, status, severity, created_at, university_id")
          .eq("university_id", campusId)
          .order("created_at", { ascending: false })
          .limit(200);
        if (statusFilter) query = query.eq("status", statusFilter);
        return query;
      })(),
      supabase
        .from("departments")
        .select("id, name")
        .eq("university_id", campusId)
        .eq("is_active", true)
        .order("name"),
    ]);

    reports = reportResult.data ?? [];
    departments = departmentResult.data ?? [];
    reportsError = reportResult.error ?? departmentResult.error;

    if (reports.length > 0) {
      const assignmentResult = await supabase
        .from("incident_assignments")
        .select("incident_id, department_id, assigned_to_name, notes, assigned_at")
        .in("incident_id", reports.map((report) => report.id))
        .eq("status", "active")
        .order("assigned_at", { ascending: false });
      activeAssignments = assignmentResult.data ?? [];
      reportsError = reportsError ?? assignmentResult.error;
    }
  }

  if (reportsError) console.error("Report triage data query failed:", reportsError);
  const assignmentByIncident = new Map<string, (typeof activeAssignments)[number]>();
  for (const assignment of activeAssignments) {
    if (!assignmentByIncident.has(assignment.incident_id)) {
      assignmentByIncident.set(assignment.incident_id, assignment);
    }
  }

  return (
    <AppShell
      profile={ctx.profile}
      institutionName={selectedCampus?.name ?? ctx.institutionName}
      pageTitle="Manage Reports"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {filters.updated && (
          <Alert variant="success" title="Report updated">
            Status, department assignment, and any internal note were saved.
          </Alert>
        )}
        {filters.error && (
          <Alert variant="danger" title="Update failed">
            {filters.error === "workflow_update_failed"
              ? "The change was rejected or could not be saved. Check the transition, assignment, and required reason."
              : "Review the report update fields and try again."}
          </Alert>
        )}
        {Boolean(campusError) && <Alert variant="danger">Campus workspaces could not be loaded.</Alert>}
        {!selectedCampus && !campusError && (
          <Alert variant="warning">Choose a campus workspace to open the report queue.</Alert>
        )}
        {Boolean(reportsError) && <Alert variant="danger">Report triage data could not be loaded.</Alert>}

        <Card highlighted>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <FileText size={20} color="var(--accent-highlight)" />
            <div style={{ flex: "1 1 220px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 800 }}>Incident triage queue</h2>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Review, verify, assign departments, document work, or reopen a report.
              </p>
            </div>
            <CampusSelector
              campuses={campuses}
              selectedCampusId={campusId}
              canSelect={ctx.profile.role === "super_admin"}
            />
          </div>
        </Card>

        <form method="get" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {campusId && <input type="hidden" name="universityId" value={campusId} />}
          <Select name="status" defaultValue={statusFilter} style={{ width: "220px" }}>
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>{INCIDENT_STATUS_LABELS[status]}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary" size="sm">Filter</Button>
        </form>

        {!reports.length ? (
          <Card>
            <p style={{ textAlign: "center", color: "var(--text-secondary)", padding: "30px" }}>
              {reportsError
                ? "Reports are unavailable."
                : campusId
                  ? "No reports match this view."
                  : "Select an available campus to view reports."}
            </p>
          </Card>
        ) : (
          reports.map((report) => {
            const currentStatus = report.status;
            const allowedStatuses = [
              currentStatus,
              ...INCIDENT_STATUS_TRANSITIONS[currentStatus],
            ];
            const assignment = assignmentByIncident.get(report.id);
            return (
              <Card key={report.id}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(280px, 1.3fr)", gap: "16px" }}>
                  <div>
                    <Link href={`/reports/${report.id}`}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px", flexWrap: "wrap" }}>
                        <Badge tone={currentStatus === "resolved" ? "success" : currentStatus === "rejected" ? "red" : "orange"}>
                          {INCIDENT_STATUS_LABELS[currentStatus]}
                        </Badge>
                        <Badge tone={report.severity === "critical" || report.severity === "high" ? "red" : "neutral"}>
                          {report.severity}
                        </Badge>
                      </div>
                      <h3 style={{ fontSize: "16px" }}>{report.title}</h3>
                      <div className="mono" style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                        {report.reference_code} · {new Date(report.created_at).toLocaleDateString()}
                      </div>
                    </Link>
                    {assignment && (
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "8px" }}>
                        Assigned to {departments.find((department) => department.id === assignment.department_id)?.name ?? "department"}
                        {assignment.assigned_to_name ? ` · ${assignment.assigned_to_name}` : ""}
                      </p>
                    )}
                  </div>

                  <form action={updateIncidentStatusAction} style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                    <input type="hidden" name="incidentId" value={report.id} />
                    {campusId && <input type="hidden" name="universityId" value={campusId} />}
                    <Select name="status" defaultValue={currentStatus} aria-label="New status">
                      {allowedStatuses.map((status) => (
                        <option key={status} value={status}>{INCIDENT_STATUS_LABELS[status]}</option>
                      ))}
                    </Select>
                    <Select
                      name="departmentId"
                      defaultValue={assignment?.department_id ?? ""}
                      aria-label="Responsible department"
                    >
                      <option value="">No department selected</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>{department.name}</option>
                      ))}
                    </Select>
                    <Input
                      name="assignedToName"
                      defaultValue={assignment?.assigned_to_name ?? ""}
                      placeholder="Responsible person (optional)"
                      maxLength={120}
                    />
                    <Textarea
                      name="assignmentNotes"
                      defaultValue={assignment?.notes ?? ""}
                      placeholder="Assignment notes (optional)"
                      maxLength={500}
                      style={{ minHeight: "64px" }}
                    />
                    <Textarea
                      name="resolution"
                      placeholder="Resolution, rejection, or reopening reason (required for those statuses)"
                      maxLength={2000}
                      style={{ minHeight: "70px" }}
                    />
                    <Textarea
                      name="internalNote"
                      placeholder="Internal note (visible only to administrators)"
                      maxLength={2000}
                      style={{ minHeight: "64px" }}
                    />
                    <Button type="submit" variant="primary" size="sm">Save report update</Button>
                  </form>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
