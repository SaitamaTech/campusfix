import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  Flag,
  Globe,
  Users,
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import styles from "./super-admin.module.css";

export const metadata = {
  title: "Super Admin Dashboard",
};

interface RecentIncident {
  id: string;
  reference_code: string;
  title: string;
  status: string;
  severity: string;
  created_at: string;
  university_name: string;
}

interface SuperAdminDashboardData {
  registered_universities: number | string;
  active_universities: number | string;
  platform_accounts: number | string;
  total_incidents: number | string;
  reports_needing_review: number | string;
  resolved_incidents: number | string;
  flagged_incidents: number | string;
  latest_reports: RecentIncident[];
}

function isRecentIncident(value: unknown): value is RecentIncident {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const report = value as Record<string, unknown>;
  return (
    typeof report.id === "string" &&
    typeof report.reference_code === "string" &&
    typeof report.title === "string" &&
    typeof report.status === "string" &&
    typeof report.severity === "string" &&
    typeof report.created_at === "string" &&
    typeof report.university_name === "string"
  );
}

function isDashboardData(value: unknown): value is SuperAdminDashboardData {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const data = value as Record<string, unknown>;
  const counts = [
    data.registered_universities,
    data.active_universities,
    data.platform_accounts,
    data.total_incidents,
    data.reports_needing_review,
    data.resolved_incidents,
    data.flagged_incidents,
  ];

  return (
    counts.every(
      (count) => typeof count === "number" || typeof count === "string"
    ) &&
    Array.isArray(data.latest_reports) &&
    data.latest_reports.every(isRecentIncident)
  );
}

function statusTone(status: string): "success" | "orange" | "info" {
  if (status === "resolved") {
    return "success";
  }
  if (status === "submitted" || status === "under_review") {
    return "orange";
  }
  return "info";
}

export default async function SuperAdminPage() {
  const ctx = await requireRole(["super_admin"], { includeUniversity: false });
  const supabase = await createClient();

  let dashboardData: SuperAdminDashboardData | null = null;
  let dataUnavailable = false;

  if (supabase) {
    const { data, error } = await supabase.rpc("get_super_admin_dashboard_data");
    const dataRow: unknown = data?.[0];
    dashboardData = isDashboardData(dataRow) ? dataRow : null;

    if (error || !dashboardData) {
      dataUnavailable = true;
      console.error(
        "Super-admin dashboard data query failed:",
        error ?? "No dashboard data returned."
      );
    }
  } else {
    dataUnavailable = true;
  }

  const stats = dashboardData
    ? [
        {
          label: "Universities",
          value: Number(dashboardData.registered_universities),
          note: `${Number(dashboardData.active_universities)} active`,
          icon: Building2,
          color: "var(--accent-primary)",
        },
        {
          label: "Platform accounts",
          value: Number(dashboardData.platform_accounts),
          note: "Registered users",
          icon: Users,
          color: "var(--status-info)",
        },
        {
          label: "All reports",
          value: Number(dashboardData.total_incidents),
          note: "Across all campuses",
          icon: Activity,
          color: "var(--accent-highlight)",
        },
        {
          label: "Needs review",
          value: Number(dashboardData.reports_needing_review),
          note: "Submitted or under review",
          icon: Clock3,
          color: "var(--status-warning)",
        },
        {
          label: "Resolved",
          value: Number(dashboardData.resolved_incidents),
          note: "Completed reports",
          icon: CheckCircle2,
          color: "var(--status-success)",
        },
        {
          label: "Flagged",
          value: Number(dashboardData.flagged_incidents),
          note: "Reports needing attention",
          icon: Flag,
          color: "var(--status-danger)",
        },
      ]
    : [];

  return (
    <AppShell
      profile={ctx.profile}
      institutionName={ctx.institutionName}
      pageTitle="Platform Dashboard"
    >
      <div className={styles.dashboard}>
        {dataUnavailable && (
          <Alert variant="warning" title="Platform data could not be loaded">
            The dashboard is available, but its live metrics are temporarily unavailable. Please refresh in a moment.
          </Alert>
        )}

        <Card highlighted>
          <div className={styles.hero}>
            <div className={styles.heroCopy}>
              <Badge tone="red" dot>Super Admin</Badge>
              <h2 className={styles.heroTitle}>CampusFix platform overview</h2>
              <p className={styles.heroText}>
                Monitor activity across universities and jump directly into report triage.
              </p>
            </div>
            <div className={styles.heroActions}>
              <Button href="/admin/reports" variant="primary">
                Review reports
                <ArrowUpRight size={15} />
              </Button>
              <Button href="/admin" variant="secondary">
                Campus operations
              </Button>
            </div>
          </div>
        </Card>

        <section className={styles.statsGrid} aria-label="Platform statistics">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <div className={styles.statTop}>
                  <span className={styles.statLabel}>{stat.label}</span>
                  <Icon size={18} color={stat.color} />
                </div>
                <div className={`mono ${styles.statValue}`}>{stat.value}</div>
                <p className={styles.statNote}>{stat.note}</p>
              </Card>
            );
          })}
        </section>

        <section className={styles.contentGrid}>
          <Card>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>Recent platform reports</h3>
                <p className={styles.sectionNote}>Latest submissions from every campus.</p>
              </div>
              <Button href="/admin/reports" variant="ghost" size="sm">
                Open triage
                <ArrowUpRight size={14} />
              </Button>
            </div>

            {dashboardData?.latest_reports.length ? (
              <div className={styles.reportList}>
                {dashboardData.latest_reports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/reports/${report.id}`}
                    className={styles.reportRow}
                  >
                    <div className={styles.reportCopy}>
                      <div className={styles.reportBadges}>
                        <Badge tone={statusTone(report.status)}>
                          {report.status.replace(/_/g, " ")}
                        </Badge>
                        <Badge
                          tone={
                            report.severity === "critical" || report.severity === "high"
                              ? "red"
                              : "neutral"
                          }
                        >
                          {report.severity}
                        </Badge>
                      </div>
                      <span className={styles.reportTitle}>{report.title}</span>
                      <span className={styles.reportMeta}>
                        {report.reference_code} · {report.university_name} ·{" "}
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <ArrowUpRight
                      size={16}
                      className={styles.reportLinkIcon}
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <FileText size={24} color="var(--text-muted)" />
                <p>{dataUnavailable ? "Reports are unavailable right now." : "No reports have been submitted yet."}</p>
              </div>
            )}
          </Card>

          <div className={styles.sideColumn}>
            <Card>
              <div className={styles.sectionHeader}>
                <div>
                  <h3 className={styles.sectionTitle}>Priority queue</h3>
                  <p className={styles.sectionNote}>Items for platform operators.</p>
                </div>
                <AlertTriangle size={18} color="var(--status-warning)" />
              </div>
              <div className={styles.queueList}>
                <Link href="/admin/reports?status=submitted" className={styles.queueLink}>
                  <span>New submissions</span>
                  <ArrowUpRight size={15} />
                </Link>
                <Link href="/admin/reports?status=under_review" className={styles.queueLink}>
                  <span>Under review</span>
                  <ArrowUpRight size={15} />
                </Link>
                <Link href="/admin/reports" className={styles.queueLink}>
                  <span>All incidents</span>
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </Card>

            <Card>
              <div className={styles.sectionHeader}>
                <div>
                  <h3 className={styles.sectionTitle}>Platform access</h3>
                  <p className={styles.sectionNote}>Signed in as {ctx.profile.full_name}.</p>
                </div>
                <Globe size={18} color="var(--accent-highlight)" />
              </div>
              <p className={styles.accessText}>
                Super Administrator permissions are enforced by the server and Supabase row-level security.
              </p>
              <Button href="/profile" variant="secondary" size="sm">
                Account settings
              </Button>
            </Card>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
