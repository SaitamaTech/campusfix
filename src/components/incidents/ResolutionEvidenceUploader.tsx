"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/FormField";
import { validateIncidentImages } from "@/lib/incidents/image-validation";
import { uploadIncidentImages } from "@/lib/incidents/upload-images";

interface Props {
  incidentId: string;
  universityId: string;
  userId: string;
}

export function ResolutionEvidenceUploader({ incidentId, universityId, userId }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const files = Array.from(
      formRef.current?.querySelector<HTMLInputElement>("#resolutionImages")?.files ?? []
    );
    if (files.length === 0) {
      setError("Choose at least one photo to upload.");
      setSuccess(false);
      return;
    }

    const validationError = await validateIncidentImages(files);
    if (validationError) {
      setError(validationError);
      setSuccess(false);
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(false);
    try {
      const uploadError = await uploadIncidentImages({
        files,
        incidentId,
        universityId,
        userId,
        imageType: "resolution",
      });
      if (uploadError) {
        setError(uploadError);
        return;
      }

      const input = formRef.current?.querySelector<HTMLInputElement>("#resolutionImages");
      if (input) input.value = "";
      setSuccess(true);
      router.refresh();
    } catch (uploadError) {
      console.error("Resolution evidence upload failed:", uploadError);
      setError("The photos could not be attached. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <FormField
        label="Repair completion photos"
        htmlFor="resolutionImages"
        optional
        hint="Up to 5 JPEG, PNG, or WebP photos; 5 MB maximum each."
      >
        <Input
          id="resolutionImages"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={pending}
        />
      </FormField>
      {error && <Alert variant="danger" title="Photos could not be attached">{error}</Alert>}
      {success && <Alert variant="success" title="Repair evidence added">The report now includes your completion photos.</Alert>}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          <Camera size={15} />
          {pending ? "Uploading..." : "Add repair photos"}
        </Button>
      </div>
    </form>
  );
}
