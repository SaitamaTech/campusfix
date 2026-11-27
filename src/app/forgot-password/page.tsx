import React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Card } from "@/components/ui/Card";
import { ForgotPasswordForm } from "@/components/auth/AuthForms";
import styles from "@/components/auth/auth.module.css";

export const metadata = {
  title: "Forgot Password",
};

export default function ForgotPasswordPage() {
  return (
    <div className={styles.authPage}>
      <PublicNavbar />
      <main className={styles.authMain}>
        <div className={styles.authCardWrap}>
          <Card>
            <div className={styles.authHeader}>
              <h1 className={styles.authTitle}>Reset your password</h1>
              <p className={styles.authSubtitle}>
                Enter your registered email address and we will send you a secure
                password reset link.
              </p>
            </div>

            <ForgotPasswordForm />

            <div className={styles.authFooterRow}>
              <span>Remembered your password?</span>
              <Link href="/login" className={styles.authLink}>
                Back to Sign In
              </Link>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
