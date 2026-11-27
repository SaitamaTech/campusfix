import React from "react";
import { Camera, Users, ClipboardCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { getDefaultRouteForRole } from "@/lib/auth/rbac";

export const metadata = {
  title: "How It Works",
};

const STEPS = [
  {
    step: "Step 01",
    title: "Submit a Structured Report",
    icon: Camera,
    tone: "red" as const,
    description:
      "Select the problem category, severity, and campus location. Attach clear photographs and optionally mark the spot on the campus map (geolocation is never mandatory).",
  },
  {
    step: "Step 02",
    title: "Smart Duplicate Check & Community Verification",
    icon: Users,
    tone: "orange" as const,
    description:
      "CampusFix checks nearby recent reports to warn of potential duplicates. Fellow students can independently confirm the issue exists to boost its transparency confidence score.",
  },
  {
    step: "Step 03",
    title: "Administrative Review & Department Assignment",
    icon: ClipboardCheck,
    tone: "info" as const,
    description:
      "Authorized campus administrators inspect evidence, approve or request details, and assign the incident to Works, Electrical, Water & Sanitation, ICT, Hostel, or Security.",
  },
  {
    step: "Step 04",
    title: "Track Progress & Documented Resolution",
    icon: CheckCircle2,
    tone: "success" as const,
    description:
      "Every status change writes an immutable timeline entry and sends notifications. Administrators attach resolution notes and proof, and students can dispute incomplete fixes.",
  },
];

export default async function HowItWorksPage() {
  const authCtx = await getAuthenticatedContext();
  const dashboardHref = authCtx
    ? getDefaultRouteForRole(authCtx.profile.role)
    : "/dashboard";

  return (
    <div>
      <PublicNavbar isAuthenticated={Boolean(authCtx)} dashboardHref={dashboardHref} />

      <main className="container" style={{ paddingTop: "56px", paddingBottom: "48px" }}>
        <div style={{ maxWidth: "760px", marginBottom: "36px" }}>
          <Badge tone="orange" dot>
            Transparent Incident Lifecycle
          </Badge>
          <h1
            style={{
              fontSize: "clamp(2rem, 3.6vw, 2.8rem)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              marginTop: "14px",
              marginBottom: "14px",
            }}
          >
            How CampusFix Works
          </h1>
          <p style={{ fontSize: "16px", color: "var(--text-secondary)" }}>
            A clear, auditable workflow connecting students and campus maintenance teams.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "20px",
            marginBottom: "36px",
          }}
        >
          {STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.step} interactive>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <Icon size={22} />
                  <Badge tone={item.tone}>{item.step}</Badge>
                </div>
                <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "8px" }}>
                  {item.title}
                </h2>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                  {item.description}
                </p>
              </Card>
            );
          })}
        </div>

        <Card highlighted>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
            <AlertTriangle size={20} color="#fb923c" style={{ flexShrink: 0, marginTop: "3px" }} />
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "6px" }}>
                Confidence Score vs. Severity
              </h3>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                CampusFix separates <strong>Confidence</strong> (how strongly corroborated
                a report is via photos, student confirmations, and admin review) from{" "}
                <strong>Severity</strong> (the safety or operational urgency of the issue).
                Unverified reports are never presented as officially confirmed.
              </p>
            </div>
          </div>
        </Card>

        <div style={{ marginTop: "32px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Button href="/register" variant="primary">
            Get Started Now
          </Button>
          <Button href="/login" variant="secondary">
            Sign In
          </Button>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
