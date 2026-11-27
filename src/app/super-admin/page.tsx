import React from "react";
import { Globe, Building2, Users, FileText } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";

export const metadata = {
  title: "Super Admin Platform Console",
};

export default async function SuperAdminPage() {
  const ctx = await requireRole(["super_admin"]);
  const supabase = await createClient();

  let universitiesCount = 0;
  let profilesCount = 0;
  let incidentsCount = 0;

  if (supabase) {
    const [uRes, pRes, iRes] = await Promise.all([
      supabase.from("universities").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("incidents").select("id", { count: "exact", head: true }),
    ]);

    universitiesCount = uRes.count ?? 0;
    profilesCount = pRes.count ?? 0;
    incidentsCount = iRes.count ?? 0;
  }

  return (
    <AppShell
      profile={ctx.profile}
      institutionName={ctx.institutionName}
      pageTitle="Super Admin Platform Console"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <Card highlighted>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <Globe size={22} color="var(--accent-highlight)" />
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 800 }}>
                Multi-University Platform Governance
              </h2>
              <p style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>
                Signed in with Super Administrator privileges ({ctx.profile.email}).
              </p>
            </div>
            <Badge tone="red" style={{ marginLeft: "auto" }}>
              Platform Scope
            </Badge>
          </div>
        </Card>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Registered Universities
              </span>
              <Building2 size={17} color="var(--accent-primary)" />
            </div>
            <div className="mono" style={{ fontSize: "28px", fontWeight: 700 }}>
              {universitiesCount}
            </div>
          </Card>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Platform Accounts
              </span>
              <Users size={17} color="var(--status-info)" />
            </div>
            <div className="mono" style={{ fontSize: "28px", fontWeight: 700 }}>
              {profilesCount}
            </div>
          </Card>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Platform-Wide Incidents
              </span>
              <FileText size={17} color="var(--accent-highlight)" />
            </div>
            <div className="mono" style={{ fontSize: "28px", fontWeight: 700 }}>
              {incidentsCount}
            </div>
          </Card>
        </div>

        <Alert variant="info" title="Super Admin Controls Ready">
          Super-admin role verification is enforced at both Next.js proxy/server layers
          and Supabase RLS policies. University management, admin provisioning, and
          global analytics expand in Phases 4–5.
        </Alert>
      </div>
    </AppShell>
  );
}
