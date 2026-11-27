import React from "react";
import { requireAuthenticatedContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
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
  const needsUniversitySelection = !ctx.profile.university_id;
  let countries: string[] = [];
  let countryLoadWarning: string | null = null;

  if (needsUniversitySelection) {
    const supabase = await createClient();
    if (!supabase) {
      countryLoadWarning = "CampusFix could not connect to the university directory.";
    } else {
      const { data, error } = await supabase.rpc("get_active_university_countries");
      if (error) {
        console.error("Could not load countries during onboarding:", error);
        countryLoadWarning =
          "The university directory could not be loaded. Apply the Supabase migrations and refresh.";
      } else {
        countries = (data ?? []).map((row: { country: string }) => row.country);
      }
    }
  }

  const onboardingErrors: Record<string, string> = {
    choose_university: "Choose your country and university to continue.",
    university_unavailable: "That university is no longer available. Choose another one.",
    campus_settings_unavailable:
      "Campus registration requirements could not be loaded. Please try again.",
    campus_requires_registration:
      "This campus requires a matriculation number. Use the standard registration form for this campus.",
    institution_email_required:
      "Use an email address from one of this campus's approved institutional domains.",
    profile_update_failed: "Your campus could not be saved. Please try again.",
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
          universityName={ctx.university?.name ?? null}
          needsUniversitySelection={needsUniversitySelection}
          countries={countries}
          countryLoadWarning={countryLoadWarning}
          onboardingError={onboardingError}
        />
      </main>
    </div>
  );
}
