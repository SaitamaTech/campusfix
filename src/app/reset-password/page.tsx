import React from "react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Card } from "@/components/ui/Card";
import { ResetPasswordForm } from "@/components/auth/AuthForms";
import styles from "@/components/auth/auth.module.css";

export const metadata = {
  title: "Set New Password",
};

export default function ResetPasswordPage() {
  return (
    <div className={styles.authPage}>
      <PublicNavbar />
      <main className={styles.authMain}>
        <div className={styles.authCardWrap}>
          <Card>
            <div className={styles.authHeader}>
              <h1 className={styles.authTitle}>Set a new password</h1>
              <p className={styles.authSubtitle}>
                Choose a strong password to protect your CampusFix account.
              </p>
            </div>

            <ResetPasswordForm />
          </Card>
        </div>
      </main>
    </div>
  );
}
