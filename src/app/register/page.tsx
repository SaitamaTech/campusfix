import React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Card } from "@/components/ui/Card";
import { RegisterForm } from "@/components/auth/AuthForms";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { CampusSettings, University } from "@/types/database";
import styles from "@/components/auth/auth.module.css";

export const metadata = {
  title: "Student Registration",
};

export default async function RegisterPage() {
  const supabaseReady = isSupabaseConfigured();
  let universities: University[] = [];
  let dataLoadWarning: string | null = null;
  const settingsByUniversity: Record<
    string,
    Pick<CampusSettings, "require_matric_number" | "allowed_email_domains">
  > = {};

  if (supabaseReady) {
    const supabase = await createClient();
    if (supabase) {
      const [
        { data: univRows, error: universitiesError },
        { data: settingsRows, error: settingsError },
      ] = await Promise.all([
        supabase
          .from("universities")
          .select("*")
          .eq("is_active", true)
          .order("name", { ascending: true }),
        supabase
          .from("campus_settings")
          .select("university_id, require_matric_number, allowed_email_domains"),
      ]);

      if (universitiesError) {
        console.error("Failed to load active universities for registration:", universitiesError);
        dataLoadWarning =
          "The university list could not be loaded. Check that the Supabase migrations are applied and active universities are readable.";
      } else {
        universities = (univRows ?? []) as University[];
      }

      if (settingsError) {
        console.error("Failed to load campus registration settings:", settingsError);
        dataLoadWarning ??=
          "Some campus-specific registration requirements could not be loaded. Please contact support before creating an account.";
      }

      for (const s of settingsRows ?? []) {
        settingsByUniversity[s.university_id] = {
          require_matric_number: s.require_matric_number,
          allowed_email_domains: s.allowed_email_domains ?? [],
        };
      }
    }
  }

  return (
    <div className={styles.authPage}>
      <PublicNavbar />
      <main className={styles.authMain}>
        <div className={`${styles.authCardWrap} ${styles.authCardWrapWide}`}>
          <Card>
            <div className={styles.authHeader}>
              <h1 className={styles.authTitle}>Create Student Account</h1>
              <p className={styles.authSubtitle}>
                Register to report campus issues, verify existing incidents, and track
                real resolutions. Administrative roles are provisioned separately.
              </p>
            </div>

            <RegisterForm
              universities={universities}
              settingsByUniversity={settingsByUniversity}
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
