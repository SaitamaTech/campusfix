import React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Card } from "@/components/ui/Card";
import { RegisterForm } from "@/components/auth/AuthForms";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { DEFAULT_CAMPUS_SLUG } from "@/lib/campus";
import styles from "@/components/auth/auth.module.css";

export const metadata = {
  title: "CampusFix Registration",
};

export default async function RegisterPage() {
  const supabaseReady = isSupabaseConfigured();
  let matricRequired = false;
  let allowedEmailDomains: string[] = [];
  let dataLoadWarning: string | null = null;

  if (supabaseReady) {
    const supabase = await createClient();
    if (supabase) {
      const { data: campus, error: campusError } = await supabase
        .from("universities")
        .select("id")
        .eq("slug", DEFAULT_CAMPUS_SLUG)
        .eq("is_active", true)
        .single();

      if (campusError || !campus) {
        console.error("Failed to load the default workspace:", campusError);
        dataLoadWarning =
          "The registration workspace could not be loaded. Please try again later.";
      } else {
        const { data: settings, error: settingsError } = await supabase
          .from("campus_settings")
          .select("require_matric_number, allowed_email_domains")
          .eq("university_id", campus.id)
          .single();

        if (settingsError || !settings) {
          console.error("Failed to load registration workspace settings:", settingsError);
          dataLoadWarning =
            "Registration requirements could not be loaded. Please try again later.";
        } else {
          matricRequired = settings.require_matric_number;
          allowedEmailDomains = settings.allowed_email_domains ?? [];
        }
      }
    } else {
      dataLoadWarning = "Supabase could not be initialized. Check the project configuration.";
    }
  }

  return (
    <div className={styles.authPage}>
      <PublicNavbar />
      <main className={styles.authMain}>
        <div className={`${styles.authCardWrap} ${styles.authCardWrapWide}`}>
          <Card>
            <div className={styles.authHeader}>
              <h1 className={styles.authTitle}>Create CampusFix Account</h1>
              <p className={styles.authSubtitle}>
                Report local infrastructure issues, verify incidents, and follow them
                through to resolution. Choose the name you want shown on your dashboard.
              </p>
            </div>

            <RegisterForm
              matricRequired={matricRequired}
              allowedEmailDomains={allowedEmailDomains}
              dataLoadWarning={dataLoadWarning}
            />

            <div className={styles.authFooterRow}>
              <span>Already registered?</span>
              <Link href="/login" className={styles.authLink}>
                Sign in instead
              </Link>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
