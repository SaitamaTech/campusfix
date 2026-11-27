import React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "@/components/auth/AuthForms";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import styles from "@/components/auth/auth.module.css";

export const metadata = {
  title: "Sign In",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; reset?: string; setup?: string }>;
}) {
  const params = await searchParams;
  const supabaseReady = isSupabaseConfigured();

  let initialAlert:
    | { variant: "info" | "success" | "warning" | "danger"; message: string }
    | undefined;

  if (!supabaseReady || params.setup === "required") {
    initialAlert = {
      variant: "warning",
      message:
        "Supabase credentials are not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    };
  } else if (params.reset === "success") {
    initialAlert = {
      variant: "success",
      message: "Your password has been updated. Sign in with your new password.",
    };
  } else if (params.error === "verification_failed") {
    initialAlert = {
      variant: "danger",
      message: "Email verification or reset link is invalid or expired. Please request a new one.",
    };
  } else if (params.error === "account_suspended") {
    initialAlert = {
      variant: "danger",
      message: "Your account is currently suspended. Contact your campus administrator.",
    };
  }

  return (
    <div className={styles.authPage}>
      <PublicNavbar />
      <main className={styles.authMain}>
        <div className={styles.authCardWrap}>
          <Card>
            <div className={styles.authHeader}>
              <h1 className={styles.authTitle}>Sign in to CampusFix</h1>
              <p className={styles.authSubtitle}>
                Access your campus dashboard, report issues, or manage resolutions.
              </p>
            </div>

            <LoginForm nextPath={params.next} initialAlert={initialAlert} />

            <div className={styles.authFooterRow}>
              <span>New student on campus?</span>
              <Link href="/register" className={styles.authLink}>
                Create a student account
              </Link>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
