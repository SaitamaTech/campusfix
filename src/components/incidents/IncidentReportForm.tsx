"use client";

import React, { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Send } from "lucide-react";
import { submitIncidentAction, type IncidentActionState } from "@/app/actions/incidents";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { FormField, Input, Select, Textarea } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { validateIncidentImages } from "@/lib/incidents/image-validation";
import { uploadIncidentImages } from "@/lib/incidents/upload-images";
import { LocationPicker } from "./LocationPicker";

interface Props {
  categories: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string; building_code: string | null }>;
  universityId: string;
  userId: string;
}

export function IncidentReportForm({ categories, locations, universityId, userId }: Props) {
  const [state, formAction, pending] = useActionState<IncidentActionState, FormData>(
    submitIncidentAction,
    { status: "idle" }
  );
  const [uploadPending, setUploadPending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingFilesRef = useRef<File[]>([]);
  const handledIncidentIdRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || pending || uploadPending) return;
    submittingRef.current = true;
    const files = Array.from(
      formRef.current?.querySelector<HTMLInputElement>("#evidenceImages")?.files ?? []
    );
    const validationError = await validateIncidentImages(files);
    if (validationError) {
      submittingRef.current = false;
      setLocalError(validationError);
      return;
    }

    pendingFilesRef.current = files;
    setLocalError(null);
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      startTransition(() => formAction(formData));
    } else {
      submittingRef.current = false;
    }
  }

  useEffect(() => {
    if (state.status === "error") {
      submittingRef.current = false;
    }
    const incidentId = state.incidentId;
    if (
      state.status !== "success" ||
      !incidentId ||
      handledIncidentIdRef.current === incidentId
    ) {
      return;
    }

    handledIncidentIdRef.current = incidentId;
    setUploadPending(true);

    const uploadFiles = async () => {
      let mediaError = false;
      const files = pendingFilesRef.current;
      try {
        if (files.length > 0) {
          mediaError = Boolean(await uploadIncidentImages({
            files,
            incidentId,
            universityId,
            userId,
            imageType: "evidence",
          }));
        }
      } catch (uploadError) {
        console.error("Incident evidence upload failed:", uploadError);
        mediaError = true;
      }

      const query = new URLSearchParams({ submitted: "1" });
      if (mediaError) query.set("media_error", "1");
      if (state.timelineError) query.set("timeline_error", "1");
      router.replace(`/reports/${incidentId}?${query.toString()}`);
      router.refresh();
    };

    void uploadFiles();
  }, [router, state, universityId, userId]);

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit}>
      {state.status === "error" && (
        <Alert variant="danger" title="Unable to submit report">{state.message}</Alert>
      )}
      {localError && <Alert variant="danger" title="Photos could not be added">{localError}</Alert>}
      {state.status === "success" && (
        <Alert variant="info">
          {uploadPending ? "Report saved. Uploading photos..." : state.message}
        </Alert>
      )}
      <Card highlighted>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
          <Camera size={20} color="var(--accent-highlight)" />
          <div>
            <h2 style={{ fontSize: "19px", fontWeight: 800 }}>Submit a campus incident</h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Give the maintenance team a clear, factual description.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "16px" }}>
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
          <FormField
            label="Photos"
            htmlFor="evidenceImages"
            optional
            error={state.fieldErrors?.evidenceImages}
            hint="Up to 5 JPEG, PNG, or WebP photos; 5 MB maximum each."
          >
            <Input
              id="evidenceImages"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hasError={Boolean(state.fieldErrors?.evidenceImages)}
            />
          </FormField>
          <LocationPicker />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
            <Button type="submit" variant="primary" disabled={pending || uploadPending}>
              <Send size={16} />
              {pending ? "Submitting..." : uploadPending ? "Uploading photos..." : "Submit report"}
            </Button>
          </div>
        </div>
      </Card>
    </form>
  );
}
