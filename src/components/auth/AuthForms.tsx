"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, KeyRound, Mail, UserPlus } from "lucide-react";
import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  resetPasswordAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { Alert } from "@/components/ui/Alert";
import type { CampusSettings, University } from "@/types/database";
import styles from "./auth.module.css";

const INITIAL_STATE: AuthActionState = { status: "idle" };

const LEVEL_OPTIONS = [
  "100 Level",
  "200 Level",
  "300 Level",
  "400 Level",
  "500 Level",
  "600 Level",
  "Postgraduate",
];

export function LoginForm({
  nextPath,
  initialAlert,
}: {
  nextPath?: string;
  initialAlert?: { variant: "info" | "success" | "warning" | "danger"; message: string };
}) {
  const [state, action, pending] = useActionState(loginAction, INITIAL_STATE);

  return (
    <form action={action} className={styles.formStack} noValidate>
      {initialAlert && <Alert variant={initialAlert.variant}>{initialAlert.message}</Alert>}
      {state.status === "error" && state.message && (
        <Alert variant="danger">{state.message}</Alert>
      )}
      {nextPath && <input type="hidden" name="next" value={nextPath} />}

      <FormField
        label="Email Address"
        htmlFor="login-email"
        error={state.fieldErrors?.email}
      >
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="student@unilesa.edu.ng"
          required
          hasError={Boolean(state.fieldErrors?.email)}
        />
      </FormField>

      <FormField
        label="Password"
        htmlFor="login-password"
        error={state.fieldErrors?.password}
      >
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
          hasError={Boolean(state.fieldErrors?.password)}
        />
      </FormField>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Link href="/forgot-password" className={styles.authLink} style={{ fontSize: "13px" }}>
          Forgot your password?
        </Link>
      </div>

      <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending}>
        {pending ? "Signing in..." : "Sign In"}
        <ArrowRight size={16} />
      </Button>
    </form>
  );
}

export function RegisterForm({
  universities,
  settingsByUniversity,
  supabaseReady,
}: {
  universities: University[];
  settingsByUniversity: Record<string, Pick<CampusSettings, "require_matric_number" | "allowed_email_domains">>;
  supabaseReady: boolean;
}) {
  const [state, action, pending] = useActionState(registerAction, INITIAL_STATE);
  const [selectedUnivId, setSelectedUnivId] = useState(universities[0]?.id ?? "");
  const activeSettings = settingsByUniversity[selectedUnivId];
  const matricRequired = activeSettings?.require_matric_number ?? false;
  const allowedDomains = activeSettings?.allowed_email_domains ?? [];

  return (
    <form action={action} className={styles.formStack} noValidate>
      {!supabaseReady && (
        <Alert variant="warning" title="Database Setup Required">
          Supabase environment variables are not configured yet. Configure{" "}
          <code>.env.local</code> and run the SQL migrations before creating accounts.
        </Alert>
      )}

      {state.status === "error" && state.message && (
        <Alert variant="danger">{state.message}</Alert>
      )}

      {state.status === "success" && state.message && (
        <Alert variant="success" title="Verify Your Email">
          {state.message}
        </Alert>
      )}

      <FormField
        label="University"
        htmlFor="reg-university"
        error={state.fieldErrors?.universityId}
      >
        <Select
          id="reg-university"
          name="universityId"
          value={selectedUnivId}
          onChange={(e) => setSelectedUnivId(e.target.value)}
          required
          hasError={Boolean(state.fieldErrors?.universityId)}
        >
          {universities.length === 0 ? (
            <option value="">No active universities configured</option>
          ) : (
            universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.short_name})
              </option>
            ))
          )}
        </Select>
      </FormField>

      <div className={styles.formRow2}>
        <FormField
          label="Full Name"
          htmlFor="reg-fullname"
          error={state.fieldErrors?.fullName}
        >
          <Input
            id="reg-fullname"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="e.g. Adebayo Oluwaseun"
            required
            hasError={Boolean(state.fieldErrors?.fullName)}
          />
        </FormField>

        <FormField
          label="Matriculation Number"
          htmlFor="reg-matric"
          optional={!matricRequired}
          error={state.fieldErrors?.matricNumber}
        >
          <Input
            id="reg-matric"
            name="matricNumber"
            type="text"
            placeholder="e.g. ULS/2025/0142"
            required={matricRequired}
            hasError={Boolean(state.fieldErrors?.matricNumber)}
          />
        </FormField>
      </div>

      <FormField
        label="Email Address"
        htmlFor="reg-email"
        hint={
          allowedDomains.length > 0
            ? `Approved institutional domains: ${allowedDomains.join(", ")}`
            : "A verification link will be sent to this email address."
        }
        error={state.fieldErrors?.email}
      >
        <Input
          id="reg-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@unilesa.edu.ng"
          required
          hasError={Boolean(state.fieldErrors?.email)}
        />
      </FormField>

      <div className={styles.formRow2}>
        <FormField
          label="Faculty"
          htmlFor="reg-faculty"
          error={state.fieldErrors?.faculty}
        >
          <Input
            id="reg-faculty"
            name="faculty"
            type="text"
            placeholder="e.g. Science & Computing"
            required
            hasError={Boolean(state.fieldErrors?.faculty)}
          />
        </FormField>

        <FormField
          label="Department"
          htmlFor="reg-department"
          error={state.fieldErrors?.department}
        >
          <Input
            id="reg-department"
            name="department"
            type="text"
            placeholder="e.g. Computer Science"
            required
            hasError={Boolean(state.fieldErrors?.department)}
          />
        </FormField>
      </div>

      <div className={styles.formRow2}>
        <FormField
          label="Academic Level"
          htmlFor="reg-level"
          error={state.fieldErrors?.level}
        >
          <Select
            id="reg-level"
            name="level"
            defaultValue="200 Level"
            hasError={Boolean(state.fieldErrors?.level)}
          >
            {LEVEL_OPTIONS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Password"
          htmlFor="reg-password"
          hint="Min. 8 chars with letters & numbers"
          error={state.fieldErrors?.password}
        >
          <Input
            id="reg-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a strong password"
            required
            hasError={Boolean(state.fieldErrors?.password)}
          />
        </FormField>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        disabled={pending || !supabaseReady || universities.length === 0}
      >
        <UserPlus size={17} />
        {pending ? "Creating student account..." : "Create Student Account"}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, INITIAL_STATE);

  return (
    <form action={action} className={styles.formStack} noValidate>
      {state.status === "error" && state.message && (
        <Alert variant="danger">{state.message}</Alert>
      )}
      {state.status === "success" && state.message && (
        <Alert variant="success">{state.message}</Alert>
      )}

      <FormField
        label="Registered Email Address"
        htmlFor="forgot-email"
        error={state.fieldErrors?.email}
      >
        <Input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="student@unilesa.edu.ng"
          required
          hasError={Boolean(state.fieldErrors?.email)}
        />
      </FormField>

      <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending}>
        <Mail size={16} />
        {pending ? "Sending reset link..." : "Send Password Reset Link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, INITIAL_STATE);

  return (
    <form action={action} className={styles.formStack} noValidate>
      {state.status === "error" && state.message && (
        <Alert variant="danger">{state.message}</Alert>
      )}

      <FormField
        label="New Password"
        htmlFor="reset-password"
        hint="Minimum 8 characters with at least one letter and one number."
        error={state.fieldErrors?.password}
      >
        <Input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hasError={Boolean(state.fieldErrors?.password)}
        />
      </FormField>

      <FormField
        label="Confirm New Password"
        htmlFor="reset-confirm"
        error={state.fieldErrors?.confirmPassword}
      >
        <Input
          id="reset-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          hasError={Boolean(state.fieldErrors?.confirmPassword)}
        />
      </FormField>

      <Button type="submit" variant="primary" size="lg" fullWidth disabled={pending}>
        <KeyRound size={16} />
        {pending ? "Updating password..." : "Update Password"}
      </Button>
    </form>
  );
}
