"use client";

import React, { useActionState } from "react";
import { Camera, Send } from "lucide-react";
import { submitIncidentAction, type IncidentActionState } from "@/app/actions/incidents";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { LocationPicker } from "./LocationPicker";

interface Props {
  categories: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string; building_code: string | null }>;
}

export function IncidentReportForm({ categories, locations }: Props) {
  const [state, formAction, pending] = useActionState<IncidentActionState, FormData>(
    submitIncidentAction,
    { status: "idle" }
  );

  return (
    <form action={formAction}>
      {state.status === "error" && (
        <Alert variant="danger" title="Unable to submit report">{state.message}</Alert>
      )}
      <Card highlighted>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
          <Camera size={20} color="#fb923c" />
          <div>
            <h2 style={{ fontSize: "19px", fontWeight: 800 }}>Submit a campus incident</h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Give the maintenance team a clear, factual description.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <FormField label="Short title" htmlFor="title" error={state.fieldErrors?.title}>
            <Input id="title" name="title" placeholder="e.g. Burst pipe beside the library" required minLength={8} maxLength={120} hasError={Boolean(state.fieldErrors?.title)} />
          </FormField>
          <FormField label="Category" htmlFor="categoryId" error={state.fieldErrors?.categoryId}>
            <Select id="categoryId" name="categoryId" required defaultValue="" hasError={Boolean(state.fieldErrors?.categoryId)}>
              <option value="" disabled>Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Severity" htmlFor="severity" error={state.fieldErrors?.severity}>
            <Select id="severity" name="severity" defaultValue="medium" hasError={Boolean(state.fieldErrors?.severity)}>
              <option value="low">Low - minor inconvenience</option>
              <option value="medium">Medium - needs attention</option>
              <option value="high">High - significant disruption</option>
              <option value="critical">Critical - immediate danger</option>
            </Select>
          </FormField>
          <FormField label="When did you observe it?" htmlFor="observedAt" error={state.fieldErrors?.observedAt}>
            <Input id="observedAt" name="observedAt" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} required hasError={Boolean(state.fieldErrors?.observedAt)} />
          </FormField>
          <FormField label="Campus location" htmlFor="locationId" optional>
            <Select id="locationId" name="locationId" defaultValue="">
              <option value="">Choose a known location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}{location.building_code ? ` (${location.building_code})` : ""}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Building or facility" htmlFor="building" optional>
            <Input id="building" name="building" placeholder="e.g. Main library" />
          </FormField>
        </div>

        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <FormField label="Custom location" htmlFor="customLocation" optional hint="Use this when the problem is not in the campus location list.">
            <Input id="customLocation" name="customLocation" placeholder="e.g. Back walkway near Gate B" />
          </FormField>
          <FormField label="Description" htmlFor="description" error={state.fieldErrors?.description}>
            <Textarea id="description" name="description" placeholder="Describe what is wrong, who it affects, and any immediate risk..." required minLength={20} maxLength={2000} hasError={Boolean(state.fieldErrors?.description)} />
          </FormField>
          <FormField label="Additional information" htmlFor="additionalInfo" optional>
            <Textarea id="additionalInfo" name="additionalInfo" placeholder="Any useful context for maintenance staff..." maxLength={1000} />
          </FormField>
          <LocationPicker />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
            <Button type="submit" variant="primary" disabled={pending}>
              <Send size={16} />
              {pending ? "Submitting..." : "Submit report"}
            </Button>
          </div>
        </div>
      </Card>
    </form>
  );
}
