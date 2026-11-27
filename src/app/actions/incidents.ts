"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthenticatedContext, requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { IncidentStatus } from "@/types/database";

export interface IncidentActionState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

const submitSchema = z.object({
  title: z.string().trim().min(8).max(120),
  description: z.string().trim().min(20).max(2000),
  categoryId: z.string().uuid(),
  locationId: z.string().optional(),
  customLocation: z.string().trim().max(160).optional(),
  building: z.string().trim().max(160).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  observedAt: z.string().min(1),
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
  const referenceCode = `CFX-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const latitude = data.latitude ? Number(data.latitude) : null;
  const longitude = data.longitude ? Number(data.longitude) : null;

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

  await supabase.from("incident_updates").insert({
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

  revalidatePath("/dashboard");
  revalidatePath("/explore");
  revalidatePath("/my-reports");
  redirect(`/reports/${incident.id}?submitted=1`);
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
  await requireRole(["campus_admin", "super_admin"]);
  const supabase = await createClient();
  const incidentId = String(formData.get("incidentId") ?? "");
  const status = String(formData.get("status") ?? "") as IncidentStatus;
  const resolution = String(formData.get("resolution") ?? "").trim();
  const allowed: IncidentStatus[] = ["under_review", "approved", "assigned", "in_progress", "resolved", "rejected"];
  if (!supabase || !incidentId || !allowed.includes(status)) redirect("/admin/reports");

  const ctx = await requireAuthenticatedContext();
  const { data: existing } = await supabase
    .from("incidents")
    .select("status, university_id")
    .eq("id", incidentId)
    .single();
  if (!existing) redirect("/admin/reports");

  const update: Record<string, unknown> = { status };
  if (status === "resolved") {
    update.resolution_description = resolution || "Issue resolved and documented.";
    update.resolved_at = new Date().toISOString();
    update.resolved_by = ctx.userId;
  }
  if (status === "rejected") update.rejection_reason = resolution || "Report rejected after review.";

  const { error } = await supabase.from("incidents").update(update).eq("id", incidentId);
  if (!error) {
    await supabase.from("incident_updates").insert({
      incident_id: incidentId,
      university_id: existing.university_id,
      actor_id: ctx.userId,
      actor_role: ctx.profile.role,
      update_type: "status_change",
      previous_status: existing.status,
      new_status: status,
      title: `Status changed to ${status.replace("_", " ")}`,
      message: resolution || `Campus administration moved this report to ${status.replace("_", " ")}.`,
      is_internal: false,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  revalidatePath(`/reports/${incidentId}`);
  redirect(`/admin/reports?${error ? `error=${encodeURIComponent(error.message)}` : "updated=1"}`);
}
