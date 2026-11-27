"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthenticatedContext, requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export interface IncidentActionState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  incidentId?: string;
  timelineError?: boolean;
}

const submitSchema = z.object({
  title: z.string().trim().min(8).max(120),
  description: z.string().trim().min(20).max(2000),
  categoryId: z.string().uuid(),
  locationId: z.string().optional(),
  customLocation: z.string().trim().max(160).optional(),
  building: z.string().trim().max(160).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  observedAt: z.string().min(1).refine((value) => Number.isFinite(Date.parse(value))),
  additionalInfo: z.string().trim().max(1000).optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

function formErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export async function submitIncidentAction(
  _prev: IncidentActionState,
  formData: FormData
): Promise<IncidentActionState> {
  const ctx = await requireAuthenticatedContext();
  const supabase = await createClient();
  if (!supabase || !ctx.profile.university_id) {
    return { status: "error", message: "CampusFix is not connected to Supabase." };
  }

  const parsed = submitSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    locationId: formData.get("locationId") || undefined,
    customLocation: formData.get("customLocation") || undefined,
    building: formData.get("building") || undefined,
    severity: formData.get("severity"),
    observedAt: formData.get("observedAt"),
    additionalInfo: formData.get("additionalInfo") || undefined,
    latitude: formData.get("latitude") || undefined,
    longitude: formData.get("longitude") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the highlighted fields.",
      fieldErrors: formErrors(parsed.error),
    };
  }

  const data = parsed.data;
  const latitude = data.latitude ? Number(data.latitude) : null;
  const longitude = data.longitude ? Number(data.longitude) : null;
  if (
    (latitude === null) !== (longitude === null) ||
    (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
    (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))
  ) {
    return {
      status: "error",
      message: "Please provide a valid latitude and longitude together.",
      fieldErrors: { latitude: "Enter both coordinates within valid ranges." },
    };
  }

  const { data: category, error: categoryError } = await supabase
    .from("incident_categories")
    .select("id")
    .eq("id", data.categoryId)
    .eq("is_active", true)
    .or(`university_id.is.null,university_id.eq.${ctx.profile.university_id}`)
    .maybeSingle();
  if (categoryError || !category) {
    if (categoryError) console.error("Incident category validation failed:", categoryError);
    return { status: "error", message: "Choose an active category for your campus." };
  }

  if (data.locationId) {
    const { data: location, error: locationError } = await supabase
      .from("campus_locations")
      .select("id")
      .eq("id", data.locationId)
      .eq("university_id", ctx.profile.university_id)
      .eq("is_active", true)
      .maybeSingle();
    if (locationError || !location) {
      if (locationError) console.error("Incident location validation failed:", locationError);
      return { status: "error", message: "Choose an active location for your campus." };
    }
  }

  const referenceCode = `CFX-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  const { data: incident, error } = await supabase
    .from("incidents")
    .insert({
      reference_code: referenceCode,
      university_id: ctx.profile.university_id,
      reporter_id: ctx.userId,
      category_id: data.categoryId,
      location_id: data.locationId || null,
      custom_location_name: data.customLocation || null,
      building_or_facility: data.building || null,
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: "submitted",
      latitude,
      longitude,
      observed_at: new Date(data.observedAt).toISOString(),
      additional_info: data.additionalInfo || null,
      confidence_score: 0,
      verification_count: 0,
      flag_count: 0,
      fixed_report_count: 0,
      is_flagged: false,
    })
    .select("id")
    .single();

  if (error || !incident) {
    return { status: "error", message: error?.message || "Could not submit the report." };
  }

  const { error: timelineError } = await supabase.from("incident_updates").insert({
    incident_id: incident.id,
    university_id: ctx.profile.university_id,
    actor_id: ctx.userId,
    actor_role: "student",
    update_type: "submitted",
    previous_status: null,
    new_status: "submitted",
    title: "Report submitted",
    message: "The campus report was submitted for community verification and review.",
    is_internal: false,
  });
  if (timelineError) {
    console.error("Initial incident timeline insert failed:", timelineError);
  }

  revalidatePath("/dashboard");
  revalidatePath("/explore");
  revalidatePath("/my-reports");
  return {
    status: "success",
    message: "Report submitted. Preparing your photos...",
    incidentId: incident.id,
    timelineError: Boolean(timelineError),
  };
}

export async function verifyIncidentAction(formData: FormData): Promise<void> {
  const ctx = await requireAuthenticatedContext();
  const supabase = await createClient();
  const incidentId = String(formData.get("incidentId") ?? "");
  const verificationType = String(formData.get("verificationType") ?? "");
  if (!supabase || !incidentId || !["confirm_exists", "experienced_too", "appears_fixed"].includes(verificationType)) {
    redirect(`/explore?error=invalid-verification`);
  }

  const { error } = await supabase.from("incident_verifications").upsert(
    {
      incident_id: incidentId,
      university_id: ctx.profile.university_id,
      user_id: ctx.userId,
      verification_type: verificationType,
      comment: String(formData.get("comment") ?? "").trim() || null,
    },
    { onConflict: "incident_id,user_id" }
  );

  revalidatePath(`/reports/${incidentId}`);
  revalidatePath("/explore");
  redirect(`/reports/${incidentId}?verified=1${error ? `&error=${encodeURIComponent(error.message)}` : ""}`);
}

export async function updateIncidentStatusAction(formData: FormData): Promise<void> {
  await requireRole(["campus_admin", "super_admin"], { includeUniversity: false });
  const supabase = await createClient();
  const campusId = z.string().uuid().safeParse(formData.get("universityId"));
  const campusQuery = campusId.success ? `&universityId=${campusId.data}` : "";
  const parsed = z.object({
    incidentId: z.string().uuid(),
    status: z.enum([
      "submitted",
      "under_review",
      "approved",
      "assigned",
      "in_progress",
      "resolved",
      "rejected",
      "reopened",
    ]),
    resolution: z.string().trim().max(2000),
    departmentId: z.string().uuid().optional().or(z.literal("")),
    assignedToName: z.string().trim().max(120),
    assignmentNotes: z.string().trim().max(500),
    internalNote: z.string().trim().max(2000),
  }).safeParse({
    incidentId: formData.get("incidentId"),
    status: formData.get("status"),
    resolution: formData.get("resolution") ?? "",
    departmentId: formData.get("departmentId") ?? "",
    assignedToName: formData.get("assignedToName") ?? "",
    assignmentNotes: formData.get("assignmentNotes") ?? "",
    internalNote: formData.get("internalNote") ?? "",
  });

  if (!supabase || !parsed.success) {
    redirect(`/admin/reports?error=invalid_update${campusQuery}`);
  }

  const { error } = await supabase.rpc("admin_update_incident_workflow", {
    target_incident_id: parsed.data.incidentId,
    requested_status: parsed.data.status,
    resolution_text: parsed.data.resolution,
    requested_department_id: parsed.data.departmentId || null,
    requested_assignee_name: parsed.data.assignedToName,
    requested_assignment_notes: parsed.data.assignmentNotes,
    internal_note: parsed.data.internalNote,
  });
  if (error) {
    console.error("Incident workflow update failed:", error);
    redirect(`/admin/reports?error=workflow_update_failed${campusQuery}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  revalidatePath(`/reports/${parsed.data.incidentId}`);
  redirect(`/admin/reports?updated=1${campusQuery}`);
}
