import React from "react";
import { requireAuthenticatedContext } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProfileSettingsForm } from "@/components/auth/ProfileSettingsForm";
import { ROLE_LABELS } from "@/lib/auth/rbac";

export const metadata = {
  title: "Profile & Settings",
};

export default async function ProfilePage() {
  const ctx = await requireAuthenticatedContext();

  return (
    <AppShell
      profile={ctx.profile}
      institutionName={ctx.institutionName}
      pageTitle="Profile & Settings"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "760px" }}>
        <Card>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Account Identity</h2>
              <p style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>
                {ctx.profile.email} &bull; {ctx.institutionName ?? "No institution name provided"}
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Badge tone="orange">{ROLE_LABELS[ctx.profile.role]}</Badge>
              <Badge tone={ctx.profile.email_verified_at ? "success" : "warning"}>
                {ctx.profile.email_verified_at ? "Email Verified" : "Verification Pending"}
              </Badge>
            </div>
          </div>
        </Card>

        <Card>
          <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "6px" }}>
            Academic &amp; Personal Details
          </h2>
          <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", marginBottom: "18px" }}>
            Your institution name is shown in your workspace. Role and access are
            controlled by your account permissions.
          </p>
          <ProfileSettingsForm profile={ctx.profile} />
        </Card>
      </div>
    </AppShell>
  );
}
