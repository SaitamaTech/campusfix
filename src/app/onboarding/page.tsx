import React from "react";
import { requireAuthenticatedContext } from "@/lib/auth/session";
import { OnboardingFlow } from "@/components/auth/OnboardingFlow";
import { BrandLogo } from "@/components/layout/BrandLogo";

export const metadata = {
  title: "Student Onboarding",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const ctx = await requireAuthenticatedContext({ allowUnassignedCampus: true });
  const params = await searchParams;

  const onboardingErrors: Record<string, string> = {
    university_unavailable: "The default workspace is unavailable. Please try again later.",
    campus_settings_unavailable:
      "Workspace requirements could not be loaded. Please try again later.",
    campus_requires_registration:
      "A student ID is required for this workspace. Complete registration with your student ID before continuing.",
    institution_email_required:
      "Use an email address from one of this workspace's approved institutional domains.",
    institution_name_required: "Enter a university or community name before continuing.",
    institution_name_save_failed: "Your institution name could not be saved. Please try again.",
    profile_update_failed: "Your profile could not be saved. Please try again.",
    profile_unavailable: "Your account profile could not be loaded. Please sign in again.",
  };
  const onboardingError = params.error
    ? onboardingErrors[params.error] ?? null
    : null;

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
          institutionName={ctx.institutionName}
          onboardingError={onboardingError}
        />
      </main>
    </div>
  );
}
