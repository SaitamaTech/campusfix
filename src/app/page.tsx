import React from "react";
import {
  Camera,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Users,
  Activity,
  Building2,
  BellRing,
  ArrowRight,
  Layers,
} from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { getDefaultRouteForRole } from "@/lib/auth/rbac";
import type { PublicCampusStats } from "@/types/database";
import styles from "./page.module.css";

async function loadPublicStats(): Promise<{
  stats: PublicCampusStats;
  connected: boolean;
}> {
  const supabase = await createClient();
  if (!supabase) {
    return {
      connected: false,
      stats: {
        total_reports: 0,
        resolved_reports: 0,
        in_progress_reports: 0,
        active_universities: 0,
      },
    };
  }

  const { data, error } = await supabase.rpc("get_public_campus_stats", {
    target_university_slug: null,
  });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return {
      connected: true,
      stats: {
        total_reports: 0,
        resolved_reports: 0,
        in_progress_reports: 0,
        active_universities: 0,
      },
    };
  }

  return {
    connected: true,
    stats: data[0] as PublicCampusStats,
  };
}

export default async function LandingPage() {
  const [authCtx, statsResult] = await Promise.all([
    getAuthenticatedContext(),
    loadPublicStats(),
  ]);

  const dashboardHref = authCtx
    ? getDefaultRouteForRole(authCtx.profile.role)
    : "/dashboard";

  const { stats, connected } = statsResult;

  return (
    <div>
      <PublicNavbar isAuthenticated={Boolean(authCtx)} dashboardHref={dashboardHref} />

      <main>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={`container ${styles.heroGrid}`}>
            <div>
              <div className={styles.eyebrow}>
                <ShieldCheck size={15} />
                Campus infrastructure, made accountable
              </div>

              <h1 className={styles.heroTitle}>
                <span className={styles.heroAccent}>
                  Your Campus. Your Voice. Real Change.
                </span>
              </h1>

              <p className={styles.heroSupport}>
                Report campus problems, track resolutions and help make your university
                a better place for everyone.
              </p>

              <div className={styles.heroCtas}>
                <Button href="/report" variant="primary" size="lg">
                  Report a Problem
                  <ArrowRight size={17} />
                </Button>
                <Button href="/map" variant="secondary" size="lg">
                  Explore Campus
                </Button>
              </div>

              <div className={styles.heroMetaRow}>
                <span className={styles.heroMetaItem}>
                  <CheckCircle2 size={15} color="var(--status-success)" />
                  Photographic evidence &amp; GPS optional
                </span>
                <span className={styles.heroMetaItem}>
                  <Users size={15} color="var(--accent-highlight)" />
                  Community confidence scoring
                </span>
                <span className={styles.heroMetaItem}>
                  <Activity size={15} color="var(--accent-primary)" />
                  Audited status lifecycle
                </span>
              </div>
            </div>

            {/* Interactive Workflow Preview (explicitly labeled as UI preview) */}
            <div className={styles.previewShell} aria-label="CampusFix workflow preview">
              <div className={styles.previewTop}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Badge tone="orange" dot>
                    Sample Workflow Preview
                  </Badge>
                </div>
                <span className="mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  CFX-SAMPLE-REPORT
                </span>
              </div>

              <div className={`${styles.previewCard} ${styles.previewCardActive}`}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                  <strong style={{ fontSize: "15px" }}>
                    Blocked Stormwater Drain Outside Lecture Theatre
                  </strong>
                  <Badge tone="orange">In Progress</Badge>
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  Category: Drainage &amp; Flooding &bull; Assigned: Works &amp; Maintenance
                </p>
                <div className={styles.timelineRow}>
                  <div className={`${styles.timelineStep} ${styles.timelineStepDone}`}>
                    1. Submitted
                  </div>
                  <div className={`${styles.timelineStep} ${styles.timelineStepDone}`}>
                    2. Approved
                  </div>
                  <div className={`${styles.timelineStep} ${styles.timelineStepCurrent}`}>
                    3. In Progress
                  </div>
                  <div className={styles.timelineStep}>4. Resolved</div>
                </div>
              </div>

              <div className={styles.previewCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>
                    Community Verification Signals
                  </span>
                  <Badge tone="info">Evidence + Peer Checks</Badge>
                </div>
                <p style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
                  Students confirm active problems independently without altering
                  official severity or administrative records.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How CampusFix Works */}
        <section className={styles.section}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div className={styles.sectionKicker}>How CampusFix Works</div>
              <h2 className={styles.sectionTitle}>
                From scattered complaints to structured campus resolution
              </h2>
              <p className={styles.sectionSub}>
                Replace lost chat messages with a transparent four-stage workflow backed
                by evidence, verification, and accountability.
              </p>
            </div>

            <div className={styles.grid4}>
              <Card interactive>
                <div className={styles.iconBox}>
                  <Camera size={20} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
                  1. Capture &amp; Locate
                </h3>
                <p style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>
                  Log broken furniture, power outages, leaking pipes, or road hazards
                  with photos and campus location context.
                </p>
              </Card>

              <Card interactive>
                <div className={`${styles.iconBox} ${styles.iconBoxOrange}`}>
                  <Users size={20} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
                  2. Community Verify
                </h3>
                <p style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>
                  Nearby students confirm active incidents and smart duplicate detection
                  prevents fragmented reports.
                </p>
              </Card>

              <Card interactive>
                <div className={styles.iconBox}>
                  <Building2 size={20} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
                  3. Assign &amp; Act
                </h3>
                <p style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>
                  Campus administrators review evidence, approve reports, and dispatch
                  the responsible maintenance unit.
                </p>
              </Card>

              <Card interactive>
                <div className={`${styles.iconBox} ${styles.iconBoxOrange}`}>
                  <CheckCircle2 size={20} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
                  4. Resolve &amp; Document
                </h3>
                <p style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>
                  Completed fixes are documented with resolution notes and photos, while
                  students receive instant updates.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Main Features */}
        <section id="features" className={styles.section}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div className={styles.sectionKicker}>Core Platform Capabilities</div>
              <h2 className={styles.sectionTitle}>
                Engineered for real campus operations
              </h2>
              <p className={styles.sectionSub}>
                Every feature is backed by server-enforced permissions, PostgreSQL
                auditing, and configurable institutional controls.
              </p>
            </div>

            <div className={styles.grid3}>
              <Card interactive>
                <div className={styles.iconBox}>
                  <MapPin size={20} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
                  Interactive Campus Map
                </h3>
                <p style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>
                  OpenStreetMap &amp; Leaflet visualization with status markers,
                  category filtering, and administrator-configured campus boundaries.
                </p>
              </Card>

              <Card interactive>
                <div className={`${styles.iconBox} ${styles.iconBoxOrange}`}>
                  <Layers size={20} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
                  Intelligent Duplicate Checks
                </h3>
                <p style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>
                  Alerts students when a similar issue was recently reported nearby so
                  they can corroborate instead of duplicating effort.
                </p>
              </Card>

              <Card interactive>
                <div className={styles.iconBox}>
                  <ShieldCheck size={20} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
                  Transparent Confidence Score
                </h3>
                <p style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>
                  Server-computed score combining photo evidence, independent peer
                  confirmations, freshness, and admin review.
                </p>
              </Card>

              <Card interactive>
                <div className={`${styles.iconBox} ${styles.iconBoxOrange}`}>
                  <Activity size={20} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
                  Campus Health Score
                </h3>
                <p style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>
                  Prototype maintenance health metric derived directly from unresolved
                  severity, response times, and resolution rates.
                </p>
              </Card>

              <Card interactive>
                <div className={styles.iconBox}>
                  <BellRing size={20} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
                  Real-Time Notifications
                </h3>
                <p style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>
                  Students and administrators stay synchronized across status changes,
                  department assignments, flags, and disputes.
                </p>
              </Card>

              <Card interactive>
                <div className={`${styles.iconBox} ${styles.iconBoxOrange}`}>
                  <Building2 size={20} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
                  Multi-University Ready
                </h3>
                <p style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>
                  Built for independent campuses and ready to scale across universities
                  and countries.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Live Campus Statistics */}
        <section id="stats" className={styles.section}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div className={styles.sectionKicker}>Live Database Telemetry</div>
              <h2 className={styles.sectionTitle}>Real Campus Statistics</h2>
              <p className={styles.sectionSub}>
                {connected
                  ? "Figures below reflect live records currently stored in the CampusFix database."
                  : "Connect Supabase in .env.local and run the SQL migrations to display live database metrics."}
              </p>
            </div>

            <div className={styles.grid4}>
              <Card>
                <div className={styles.statValue}>{stats.total_reports}</div>
                <div className={styles.statLabel}>Total Campus Reports</div>
              </Card>
              <Card>
                <div className={styles.statValue}>{stats.in_progress_reports}</div>
                <div className={styles.statLabel}>Active Under Review / Repair</div>
              </Card>
              <Card>
                <div className={styles.statValue}>{stats.resolved_reports}</div>
                <div className={styles.statLabel}>Documented Resolutions</div>
              </Card>
              <Card>
                <div className={styles.statValue}>{stats.active_universities}</div>
                <div className={styles.statLabel}>Configured Institutions</div>
              </Card>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className={styles.section}>
          <div className="container">
            <div className={styles.ctaBanner}>
              <div>
                <h2 style={{ fontSize: "clamp(1.45rem, 2.5vw, 2rem)", fontWeight: 800, marginBottom: "8px" }}>
                  Ready to improve your campus environment?
                </h2>
                <p style={{ color: "var(--text-secondary)", maxWidth: "560px" }}>
                  Register with your student account to submit verified reports, follow
                  progress timelines, and contribute to a safer, better-maintained campus.
                </p>
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <Button href="/register" variant="primary" size="lg">
                  Create Student Account
                </Button>
                <Button href="/how-it-works" variant="secondary" size="lg">
                  Learn How It Works
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
