import React from "react";
import Link from "next/link";
import {
  PlusCircle,
  MapPin,
  FileText,
  Compass,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { requireAuthenticatedContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";

export const metadata = {
  title: "Student Dashboard",
};

export default async function StudentDashboardPage() {
  const ctx = await requireAuthenticatedContext();
  const supabase = await createClient();

  let totalCampusReports = 0;
  let resolvedReports = 0;
  let underReviewReports = 0;
  let awaitingActionReports = 0;
  let highPriorityCount = 0;
  let myReportsCount = 0;
  let recentReports: Array<{
    id: string;
    reference_code: string;
    title: string;
    status: string;
    severity: string;
    created_at: string;
  }> = [];

  if (supabase && ctx.profile.university_id) {
    const univId = ctx.profile.university_id;
    const [
      totalRes,
      resolvedRes,
      reviewRes,
      awaitingRes,
      highRes,
      mineRes,
      recentRes,
    ] = await Promise.all([
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("university_id", univId),
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("university_id", univId)
        .eq("status", "resolved"),
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("university_id", univId)
        .eq("status", "under_review"),
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("university_id", univId)
        .in("status", ["submitted", "approved", "assigned"]),
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("university_id", univId)
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
        .eq("university_id", univId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    totalCampusReports = totalRes.count ?? 0;
    resolvedReports = resolvedRes.count ?? 0;
    underReviewReports = reviewRes.count ?? 0;
    awaitingActionReports = awaitingRes.count ?? 0;
    highPriorityCount = highRes.count ?? 0;
    myReportsCount = mineRes.count ?? 0;
    recentReports = recentRes.data ?? [];
  }

  return (
    <AppShell
      profile={ctx.profile}
      university={ctx.university}
      pageTitle="Student Dashboard"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {!ctx.profile.onboarding_completed && (
          <Alert variant="info" title="Complete your CampusFix orientation">
            Learn how community verification, duplicate detection, and resolution
            tracking work.{" "}
            <Link
              href="/onboarding"
              style={{ fontWeight: 700, textDecoration: "underline" }}
            >
              Start quick walkthrough
            </Link>
          </Alert>
        )}

        {/* Welcome & Quick Actions */}
        <Card highlighted>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div>
              <Badge tone="orange" dot>
                {ctx.university?.name ?? "Campus Workspace"}
              </Badge>
              <h2 style={{ fontSize: "22px", fontWeight: 800, marginTop: "10px" }}>
                Welcome back, {ctx.profile.full_name}
              </h2>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "4px" }}>
                {ctx.profile.department ?? "Student"} &bull;{" "}
                {ctx.profile.faculty ?? "University Member"} &bull;{" "}
                {ctx.profile.level ?? "Active"}
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              <Button href="/report" variant="primary">
                <PlusCircle size={16} />
                Report a Problem
              </Button>
              <Button href="/map" variant="secondary">
                <MapPin size={16} />
                Explore Campus Map
              </Button>
              <Button href="/my-reports" variant="secondary">
                <FileText size={16} />
                View My Reports ({myReportsCount})
              </Button>
              <Button href="/explore" variant="ghost">
                <Compass size={16} />
                Community Reports
              </Button>
            </div>
          </div>
        </Card>

        {/* Live Metrics from Database */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
          }}
        >
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Total Campus Reports
              </span>
              <Activity size={17} color="#fda4af" />
            </div>
            <div className="mono" style={{ fontSize: "28px", fontWeight: 700 }}>
              {totalCampusReports}
            </div>
          </Card>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Resolved Reports
              </span>
              <CheckCircle2 size={17} color="#22c55e" />
            </div>
            <div className="mono" style={{ fontSize: "28px", fontWeight: 700 }}>
              {resolvedReports}
            </div>
          </Card>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Under Review
              </span>
              <Clock size={17} color="#f59e0b" />
            </div>
            <div className="mono" style={{ fontSize: "28px", fontWeight: 700 }}>
              {underReviewReports}
            </div>
          </Card>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Awaiting Action / High Priority
              </span>
              <AlertTriangle size={17} color="#fb923c" />
            </div>
            <div className="mono" style={{ fontSize: "28px", fontWeight: 700 }}>
              {awaitingActionReports}{" "}
              <span style={{ fontSize: "14px", color: "#fb923c" }}>
                ({highPriorityCount} high)
              </span>
            </div>
          </Card>
        </div>

        {/* Recent Campus Reports */}
        <Card>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: 700 }}>
                Recent Campus Activity
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Latest reported incidents in {ctx.university?.short_name ?? "your campus"}.
              </p>
            </div>
            <Button href="/explore" variant="ghost" size="sm">
              Explore All
            </Button>
          </div>

          {recentReports.length === 0 ? (
            <div
              style={{
                padding: "28px",
                textAlign: "center",
                borderRadius: "var(--radius-md)",
                border: "1px dashed var(--border-default)",
                color: "var(--text-secondary)",
              }}
            >
              <p style={{ marginBottom: "12px", fontSize: "14px" }}>
                No campus incidents have been submitted yet. Be the first to report an
                issue that needs attention.
              </p>
              <Button href="/report" variant="primary" size="sm">
                Submit First Report
              </Button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recentReports.map((item) => (
                <Link
                  key={item.id}
                  href={`/reports/${item.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14.5px" }}>{item.title}</div>
                    <div className="mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {item.reference_code} &bull; {item.severity.toUpperCase()}
                    </div>
                  </div>
                  <Badge tone={item.status === "resolved" ? "success" : "orange"}>
                    {item.status.replace("_", " ")}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
