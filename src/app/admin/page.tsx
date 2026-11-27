import React from "react";
import { Shield, FileText, Building2, CheckCircle2, Flag } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";

export const metadata = {
  title: "Campus Admin Dashboard",
};

export default async function AdminDashboardPage() {
  const ctx = await requireRole(["campus_admin", "super_admin"]);
  const supabase = await createClient();

  let totalReports = 0;
  let pendingReports = 0;
  let inProgressReports = 0;
  let resolvedReports = 0;
  let flaggedReports = 0;

  if (supabase && ctx.profile.university_id) {
    const univId = ctx.profile.university_id;
    const [totalRes, pendingRes, progressRes, resolvedRes, flaggedRes] =
      await Promise.all([
        supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("university_id", univId),
        supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("university_id", univId)
          .in("status", ["submitted", "under_review"]),
        supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("university_id", univId)
          .in("status", ["assigned", "in_progress"]),
        supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("university_id", univId)
          .eq("status", "resolved"),
        supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("university_id", univId)
          .eq("is_flagged", true),
      ]);

    totalReports = totalRes.count ?? 0;
    pendingReports = pendingRes.count ?? 0;
    inProgressReports = progressRes.count ?? 0;
    resolvedReports = resolvedRes.count ?? 0;
    flaggedReports = flaggedRes.count ?? 0;
  }

  return (
    <AppShell
      profile={ctx.profile}
      institutionName={ctx.institutionName}
      pageTitle="Campus Administrator Console"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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

        <Alert variant="info" title="Phase 1 Administrative Foundation Ready">
          Role-based access control and live university telemetry are enforced. Full
          report triage, department assignment, campus coordinate configuration, and
          analytics charts follow in Phases 3–4.
        </Alert>
      </div>
    </AppShell>
  );
}
