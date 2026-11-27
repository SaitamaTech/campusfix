import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Compass,
  FileText,
  MapPin,
  Plus,
} from "lucide-react";
import { requireAuthenticatedContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import styles from "./dashboard.module.css";

export const metadata = {
  title: "Student Dashboard",
};

interface RecentReport {
  id: string;
  reference_code: string;
  title: string;
  status: string;
  severity: string;
  created_at: string;
}

export default async function StudentDashboardPage() {
  const ctx = await requireAuthenticatedContext();
  const supabase = await createClient();

  let totalCampusReports = 0;
  let resolvedReports = 0;
  let underReviewReports = 0;
  let awaitingActionReports = 0;
  let highPriorityCount = 0;
  let myReportsCount = 0;
  let recentReports: RecentReport[] = [];
  let dataUnavailable = false;

  if (supabase && ctx.profile.university_id) {
    const universityId = ctx.profile.university_id;
    const results = await Promise.all([
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("university_id", universityId),
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("university_id", universityId)
        .eq("status", "resolved"),
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("university_id", universityId)
        .eq("status", "under_review"),
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("university_id", universityId)
        .in("status", ["submitted", "approved", "assigned"]),
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("university_id", universityId)
        .in("severity", ["high", "critical"])
        .neq("status", "resolved")
        .neq("status", "rejected"),
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("reporter_id", ctx.userId),
      supabase
        .from("incidents")
        .select("id, reference_code, title, status, severity, created_at")
        .eq("university_id", universityId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const [
      totalResult,
      resolvedResult,
      reviewResult,
      awaitingResult,
      highPriorityResult,
      myReportsResult,
      recentResult,
    ] = results;
    const queryErrors = results.flatMap((result) => result.error ? [result.error] : []);
    dataUnavailable = queryErrors.length > 0;
    if (dataUnavailable) {
      console.error("Campus dashboard data query failed:", queryErrors);
    }

    totalCampusReports = totalResult.count ?? 0;
    resolvedReports = resolvedResult.count ?? 0;
    underReviewReports = reviewResult.count ?? 0;
    awaitingActionReports = awaitingResult.count ?? 0;
    highPriorityCount = highPriorityResult.count ?? 0;
    myReportsCount = myReportsResult.count ?? 0;
    recentReports = recentResult.data ?? [];
  }

  const firstName = ctx.profile.full_name.trim().split(/\s+/)[0] || "there";

  return (
    <AppShell
      profile={ctx.profile}
      institutionName={ctx.institutionName}
      pageTitle="Dashboard"
    >
      <div className={styles.dashboard}>
        {!ctx.profile.onboarding_completed && (
          <Alert variant="info" title="Finish setting up your account">
            Get oriented with CampusFix so you can report issues and track what happens next.{" "}
            <Link href="/onboarding" style={{ fontWeight: 650, textDecoration: "underline" }}>
              Continue setup
            </Link>
          </Alert>
        )}

        {!ctx.profile.university_id && (
          <Alert variant="warning" title="Campus not linked to your account">
            Your account needs to be connected to a campus before its reports and activity can appear. Contact your campus administrator.
          </Alert>
        )}

        {dataUnavailable && (
          <Alert variant="warning" title="Some campus data could not be loaded">
            You can still browse the workspace, but a few live metrics may be incomplete. Please refresh in a moment.
          </Alert>
        )}

        <section className={styles.welcome}>
          <div className={styles.welcomeCopy}>
            <p className={styles.eyebrow}>Campus overview</p>
            <h2 className={styles.welcomeTitle}>Welcome back, {firstName}.</h2>
            <p className={styles.welcomeText}>
              {`Here is what is happening at ${ctx.institutionName ?? "your community"}. Spot an issue, share it with your community, and follow it through to resolution.`}
            </p>
          </div>
          <div className={styles.welcomeActions}>
            <Button href="/report" variant="primary">
              <Plus size={16} />
              Report an issue
            </Button>
            <Button href="/explore" variant="secondary">
              Explore campus
              <ArrowUpRight size={15} />
            </Button>
          </div>
        </section>

        <section className={styles.metricGrid} aria-label="Campus report statistics">
          <article className={styles.metricCard}>
            <div className={styles.metricLabel}>
              Campus reports <Activity size={17} color="var(--accent-primary)" />
            </div>
            <div className={styles.metricValue}>{totalCampusReports}</div>
            <p className={styles.metricNote}>Shared with your university</p>
          </article>
          <article className={styles.metricCard}>
            <div className={styles.metricLabel}>
              Resolved <CheckCircle2 size={17} color="var(--status-success)" />
            </div>
            <div className={styles.metricValue}>{resolvedReports}</div>
            <p className={styles.metricNote}>Documented campus fixes</p>
          </article>
          <article className={styles.metricCard}>
            <div className={styles.metricLabel}>
              Under review <Clock3 size={17} color="var(--status-warning)" />
            </div>
            <div className={styles.metricValue}>{underReviewReports}</div>
            <p className={styles.metricNote}>Being assessed by the team</p>
          </article>
          <article className={styles.metricCard}>
            <div className={styles.metricLabel}>
              Needs attention <AlertTriangle size={17} color="var(--status-danger)" />
            </div>
            <div className={styles.metricValue}>{awaitingActionReports}</div>
            <p className={styles.metricNote}>
              {highPriorityCount} high-priority {highPriorityCount === 1 ? "issue" : "issues"}
            </p>
          </article>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h3 className={styles.sectionTitle}>Get things moving</h3>
              <p className={styles.sectionSubtitle}>Everything you need to make an impact on campus.</p>
            </div>
          </div>
          <div className={styles.actionGrid}>
            <Link href="/report" className={styles.actionCard}>
              <span className={styles.actionIcon}><Plus size={18} /></span>
              <span>
                <span className={styles.actionTitle}>Report an issue</span>
                <span className={styles.actionDescription}>Share a problem with location and useful details.</span>
              </span>
            </Link>
            <Link href="/explore" className={styles.actionCard}>
              <span className={styles.actionIcon}><Compass size={18} /></span>
              <span>
                <span className={styles.actionTitle}>Explore reports</span>
                <span className={styles.actionDescription}>See what your campus community is reporting.</span>
              </span>
            </Link>
            <Link href="/map" className={styles.actionCard}>
              <span className={styles.actionIcon}><MapPin size={18} /></span>
              <span>
                <span className={styles.actionTitle}>Open campus map</span>
                <span className={styles.actionDescription}>Find reports with shared location details.</span>
              </span>
            </Link>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h3 className={styles.sectionTitle}>Recent campus activity</h3>
              <p className={styles.sectionSubtitle}>
                Latest reports from {ctx.institutionName ?? "your community"}.
              </p>
            </div>
            <Button href="/explore" variant="ghost" size="sm">
              View all
              <ArrowUpRight size={14} />
            </Button>
          </div>

          {recentReports.length === 0 ? (
            <div className={styles.emptyState}>
              <FileText size={23} color="var(--text-muted)" style={{ margin: "0 auto 9px" }} />
              <h4 className={styles.emptyTitle}>Your campus story starts here</h4>
              <p className={styles.emptyText}>
                No reports have been shared yet. Be the first to flag an issue and help your campus team act on it.
              </p>
              <Button href="/report" variant="primary" size="sm">
                <Plus size={15} />
                Create the first report
              </Button>
            </div>
          ) : (
            <div className={styles.reportList}>
              {recentReports.map((report) => (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className={styles.reportRow}
                >
                  <div>
                    <p className={styles.reportTitle}>{report.title}</p>
                    <p className={styles.reportMeta}>
                      {report.reference_code} · {report.severity.toUpperCase()} ·{" "}
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge tone={report.status === "resolved" ? "success" : "info"}>
                    {report.status.replace("_", " ")}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className={styles.metricNote}>
          You have submitted {myReportsCount} {myReportsCount === 1 ? "report" : "reports"}.
        </div>
      </div>
    </AppShell>
  );
}
