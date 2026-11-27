import React from "react";
import { requireAuthenticatedContext } from "@/lib/auth/session";
import { OnboardingFlow } from "@/components/auth/OnboardingFlow";
import { BrandLogo } from "@/components/layout/BrandLogo";

export const metadata = {
  title: "Student Onboarding",
};

export default async function OnboardingPage() {
  const ctx = await requireAuthenticatedContext();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          padding: "18px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(255, 255, 255, 0.9)",
        }}
      >
        <div className="container">
          <BrandLogo href="/dashboard" />
        </div>
      </header>
      <main
        className="container"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingBlock: "40px",
        }}
      >
        <OnboardingFlow
          studentName={ctx.profile.full_name}
          universityName={ctx.university?.name ?? "CampusFix Institution"}
        />
      </main>
    </div>
  );
}
