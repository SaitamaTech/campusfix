"use client";

import React, { useActionState } from "react";
import { Save } from "lucide-react";
import { updateProfileAction, type AuthActionState } from "@/app/actions/auth";
import { FormField, Input } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import type { Profile } from "@/types/database";

const INITIAL_STATE: AuthActionState = { status: "idle" };

export function ProfileSettingsForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(updateProfileAction, INITIAL_STATE);

  return (
    <form
      action={action}
      style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      noValidate
    >
      {state.status === "error" && state.message && (
        <Alert variant="danger">{state.message}</Alert>
      )}
      {state.status === "success" && state.message && (
        <Alert variant="success">{state.message}</Alert>
      )}

      <FormField
        label="Full Name"
        htmlFor="prof-fullname"
        error={state.fieldErrors?.fullName}
      >
        <Input
          id="prof-fullname"
          name="fullName"
          defaultValue={profile.full_name}
          required
          hasError={Boolean(state.fieldErrors?.fullName)}
        />
      </FormField>

      <FormField
        label="Matriculation Number"
        htmlFor="prof-matric"
        optional
        error={state.fieldErrors?.matricNumber}
      >
        <Input
          id="prof-matric"
          name="matricNumber"
          defaultValue={profile.matric_number ?? ""}
          hasError={Boolean(state.fieldErrors?.matricNumber)}
        />
      </FormField>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
        }}
      >
        <FormField
          label="Faculty"
          htmlFor="prof-faculty"
          error={state.fieldErrors?.faculty}
        >
          <Input
            id="prof-faculty"
            name="faculty"
            defaultValue={profile.faculty ?? ""}
            required
            hasError={Boolean(state.fieldErrors?.faculty)}
          />
        </FormField>

        <FormField
          label="Department"
          htmlFor="prof-dept"
          error={state.fieldErrors?.department}
        >
          <Input
            id="prof-dept"
            name="department"
            defaultValue={profile.department ?? ""}
            required
            hasError={Boolean(state.fieldErrors?.department)}
          />
        </FormField>

        <FormField
          label="Academic Level"
          htmlFor="prof-level"
          error={state.fieldErrors?.level}
        >
          <Input
            id="prof-level"
            name="level"
            defaultValue={profile.level ?? ""}
            required
            hasError={Boolean(state.fieldErrors?.level)}
          />
        </FormField>
      </div>

      <div>
        <Button type="submit" variant="primary" disabled={pending}>
          <Save size={16} />
          {pending ? "Saving changes..." : "Save Profile Changes"}
        </Button>
      </div>
    </form>
  );
}
