import React from "react";
import { Shield, FileText, Building2, CheckCircle2, Flag } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { selectAdminCampusId } from "@/lib/auth/admin-campus";
import { createClient } from "@/lib/supabase/server";
import { CampusSelector } from "@/components/admin/CampusSelector";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";

export const metadata = {
  title: "Campus Admin Dashboard",
};

interface AdminDashboardMetrics {
  total_reports: number | string;
  pending_reports: number | string;
  in_progress_reports: number | string;
  resolved_reports: number | string;
  flagged_reports: number | string;
}

function isAdminDashboardMetrics(value: unknown): value is AdminDashboardMetrics {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const metrics = value as Record<string, unknown>;
  return [
    metrics.total_reports,
    metrics.pending_reports,
    metrics.in_progress_reports,
    metrics.resolved_reports,
    metrics.flagged_reports,
  ].every((count) => typeof count === "number" || typeof count === "string");
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ universityId?: string }>;
}) {
  const ctx = await requireRole(["campus_admin", "super_admin"], {
    includeUniversity: false,
  });
  const params = await searchParams;
  const supabase = await createClient();
  let campuses: Array<{ id: string; name: string; is_active: boolean }> = [];
  let campusUnavailable = !supabase;

  if (supabase && ctx.profile.role === "super_admin") {
    const result = await supabase.from("universities").select("id, name, is_active").order("name");
    campuses = result.data ?? [];
    if (result.error) {
      campusUnavailable = true;
      console.error("Campus operations university list query failed:", result.error);
    }
  } else if (supabase && ctx.profile.university_id) {
    const result = await supabase
      .from("universities")
      .select("id, name, is_active")
      .eq("id", ctx.profile.university_id)
      .maybeSingle();
    campuses = result.data ? [result.data] : [];
    if (result.error) {
      campusUnavailable = true;
      console.error("Campus operations university lookup failed:", result.error);
    }
  }

  const campusId = selectAdminCampusId(
    ctx.profile.role,
    ctx.profile.university_id,
    params.universityId ?? null,
    campuses.map((campus) => campus.id)
  );
  const selectedCampus = campuses.find((campus) => campus.id === campusId);

  let totalReports = 0;
  let pendingReports = 0;
  let inProgressReports = 0;
  let resolvedReports = 0;
  let flaggedReports = 0;
  let dataUnavailable = campusUnavailable;

  if (supabase && campusId) {
    const { data, error } = await supabase.rpc("get_campus_operations_metrics", {
      target_university_id: campusId,
    });
    const metricsRow: unknown = data?.[0];
    const metrics = isAdminDashboardMetrics(metricsRow) ? metricsRow : null;

    if (error || !metrics) {
      dataUnavailable = true;
      console.error("Campus admin dashboard metrics query failed:", error ?? "No metrics returned.");
    } else {
      totalReports = Number(metrics.total_reports);
      pendingReports = Number(metrics.pending_reports);
      inProgressReports = Number(metrics.in_progress_reports);
      resolvedReports = Number(metrics.resolved_reports);
      flaggedReports = Number(metrics.flagged_reports);
    }
  } else {
    dataUnavailable = true;
  }

  return (
    <AppShell
      profile={ctx.profile}
      institutionName={selectedCampus?.name ?? ctx.institutionName}
      pageTitle="Campus Administrator Console"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {dataUnavailable && (
          <Alert variant="warning" title="Dashboard metrics could not be loaded">
            The workspace is available, but report counts may be incomplete. Please refresh in a moment.
          </Alert>
        )}

        <Card highlighted>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <Shield size={22} color="var(--accent-highlight)" />
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 800 }}>
                {ctx.institutionName ?? "Operations Workspace"}
              </h2>
              <p style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>
                Server-verified administrative access active for {ctx.profile.full_name}.
              </p>
            </div>
            <CampusSelector
              campuses={campuses}
              selectedCampusId={campusId}
              canSelect={ctx.profile.role === "super_admin"}
            />
            <Badge tone="orange" style={{ marginLeft: "auto" }}>
              Incident Operations Active
            </Badge>
          </div>
        </Card>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "16px",
          }}
        >
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Total Reports</span>
              <FileText size={16} />
            </div>
            <div className="mono" style={{ fontSize: "26px", fontWeight: 700 }}>{totalReports}</div>
          </Card>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Pending Review</span>
              <Building2 size={16} color="var(--status-warning)" />
            </div>
            <div className="mono" style={{ fontSize: "26px", fontWeight: 700 }}>{pendingReports}</div>
          </Card>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Assigned / Active</span>
              <Building2 size={16} color="var(--accent-primary)" />
            </div>
            <div className="mono" style={{ fontSize: "26px", fontWeight: 700 }}>{inProgressReports}</div>
          </Card>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Resolved</span>
              <CheckCircle2 size={16} color="var(--status-success)" />
            </div>
            <div className="mono" style={{ fontSize: "26px", fontWeight: 700 }}>{resolvedReports}</div>
          </Card>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Flagged</span>
              <Flag size={16} color="var(--status-danger)" />
            </div>
            <div className="mono" style={{ fontSize: "26px", fontWeight: 700 }}>{flaggedReports}</div>
          </Card>
        </div>

        {!selectedCampus && (
          <Alert variant="warning" title="No campus workspace selected">
            Select an available campus to view its operational report metrics.
          </Alert>
        )}

        <Alert variant="info" title="Campus operations are available">
          Review and triage reports, maintain departments and campus locations, and
          configure campus reporting and map settings from the navigation.
        </Alert>
      </div>
    </AppShell>
  );
}
