import React from "react";
import { ShieldCheck, Target, Compass, Building2 } from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { getDefaultRouteForRole } from "@/lib/auth/rbac";

export const metadata = {
  title: "About CampusFix",
};

export default async function AboutPage() {
  const authCtx = await getAuthenticatedContext();
  const dashboardHref = authCtx
    ? getDefaultRouteForRole(authCtx.profile.role)
    : "/dashboard";

  return (
    <div>
      <PublicNavbar isAuthenticated={Boolean(authCtx)} dashboardHref={dashboardHref} />

      <main className="container" style={{ paddingTop: "56px", paddingBottom: "48px" }}>
        <div style={{ maxWidth: "760px", marginBottom: "40px" }}>
          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              color: "var(--accent-highlight)",
              marginBottom: "10px",
            }}
          >
            About CampusFix
          </p>
          <h1
            style={{
              fontSize: "clamp(2rem, 3.6vw, 2.9rem)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              marginBottom: "16px",
            }}
          >
            A smarter campus starts with you.
          </h1>
          <p style={{ fontSize: "16px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            CampusFix is a civic-technology and campus infrastructure reporting platform
            designed initially with the University of Ilesa, Nigeria in mind, and
            architected to scale across universities and tertiary institutions.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          <Card>
            <Target size={22} color="#fda4af" style={{ marginBottom: "12px" }} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "8px" }}>
              The Problem We Solve
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              Students face broken classroom desks, blocked drains, faulty lighting, and
              water or sanitation issues daily. Informal group-chat complaints are easy
              to miss and impossible for facilities teams to measure.
            </p>
          </Card>

          <Card>
            <Compass size={22} color="#fdba74" style={{ marginBottom: "12px" }} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "8px" }}>
              Our Solution
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              CampusFix organizes every report with photographic evidence, location
              context, community verification, department routing, and a complete audit
              trail from submission to resolution.
            </p>
          </Card>

          <Card>
            <ShieldCheck size={22} color="#86efac" style={{ marginBottom: "12px" }} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "8px" }}>
              Accountable Governance
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              Role-based access control ensures students, campus administrators, and
              platform super admins each have clear, server-enforced boundaries.
            </p>
          </Card>

          <Card>
            <Building2 size={22} color="#7dd3fc" style={{ marginBottom: "12px" }} />
            <h2 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "8px" }}>
              Built for Multi-Campus Scale
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              Every record is scoped by university with configurable verification rules,
              departments, and administrator-managed campus coordinates.
            </p>
          </Card>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Button href="/register" variant="primary">
            Register as a Student
          </Button>
          <Button href="/how-it-works" variant="secondary">
            Explore How It Works
          </Button>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
