import React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Card } from "@/components/ui/Card";
import { RegisterForm } from "@/components/auth/AuthForms";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import styles from "@/components/auth/auth.module.css";

export const metadata = {
  title: "CampusFix Registration",
};

export default async function RegisterPage() {
  const supabaseReady = isSupabaseConfigured();
  let countries: string[] = [];
  let dataLoadWarning: string | null = null;

  if (supabaseReady) {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase.rpc("get_active_university_countries");
      if (error) {
        console.error("Failed to load active university countries:", error);
        dataLoadWarning =
          "The university directory could not be loaded. Apply the Supabase migrations and refresh this page.";
      } else {
        countries = (data ?? []).map((row: { country: string }) => row.country);
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
                Register to report campus issues, verify existing incidents, and track
                real resolutions. The first account to verify an approved campus email
                may become its campus admin; email verification confirms domain access,
                not staff status.
              </p>
            </div>

            <RegisterForm
              countries={countries}
              supabaseReady={supabaseReady}
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
