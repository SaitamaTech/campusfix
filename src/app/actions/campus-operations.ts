"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { resolveAdminCampusId } from "@/lib/auth/admin-campus";
import { createClient } from "@/lib/supabase/server";

type ResultKey = "notice" | "error" | "warning";

function redirectToCampusPage(
  path: string,
  campusId: string | null,
  key: ResultKey,
  value: string
): never {
  const query = new URLSearchParams({ [key]: value });
  if (campusId) query.set("universityId", campusId);
  redirect(`${path}?${query.toString()}`);
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function verifyCampus(client: NonNullable<Awaited<ReturnType<typeof createClient>>>, campusId: string) {
  const { data, error } = await client
    .from("universities")
    .select("id")
    .eq("id", campusId)
    .maybeSingle();
  return { exists: Boolean(data), error };
}

async function recordCampusAudit(
  client: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  ctx: Awaited<ReturnType<typeof requireRole>>,
  campusId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown>
): Promise<boolean> {
  const { error } = await client.from("audit_logs").insert({
    university_id: campusId,
    actor_id: ctx.userId,
    actor_role: ctx.profile.role,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
  if (error) {
    console.error("Campus operations audit log insert failed:", error);
    return false;
  }
  return true;
}

function revalidateCampusPages(path: string) {
  revalidatePath(path);
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  revalidatePath("/map");
}

export async function saveDepartmentAction(formData: FormData): Promise<void> {
  const ctx = await requireRole(["campus_admin", "super_admin"], { includeUniversity: false });
  const rawCampusId = String(formData.get("universityId") ?? "");
  const campusId = resolveAdminCampusId(ctx.profile.role, ctx.profile.university_id, rawCampusId);
  const parsed = z.object({
    id: z.string().uuid().optional().or(z.literal("")),
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500),
    contactEmail: z.string().trim().email().or(z.literal("")),
  }).safeParse({
    id: formData.get("departmentId"),
    name: formData.get("name"),
    description: formData.get("description"),
    contactEmail: formData.get("contactEmail"),
  });

  if (!parsed.success || !campusId) {
    redirectToCampusPage("/admin/departments", campusId, "error", "invalid_department");
  }
  const departmentId = parsed.data.id || null;
  const departmentSlug = slugify(parsed.data.name);
  if (!departmentSlug) {
    redirectToCampusPage("/admin/departments", campusId, "error", "invalid_department");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirectToCampusPage("/admin/departments", campusId, "error", "service_unavailable");
  }
  const { exists, error: campusError } = await verifyCampus(supabase, campusId);
  if (campusError || !exists) {
    if (campusError) console.error("Department campus lookup failed:", campusError);
    redirectToCampusPage("/admin/departments", campusId, "error", "campus_unavailable");
  }

  const values = {
    name: parsed.data.name,
    slug: departmentSlug,
    description: parsed.data.description || null,
    contact_email: parsed.data.contactEmail || null,
  };
  const result = departmentId
    ? await supabase
        .from("departments")
        .update(values)
        .eq("id", departmentId)
        .eq("university_id", campusId)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("departments")
        .insert({ ...values, university_id: campusId })
        .select("id")
        .maybeSingle();

  if (result.error || !result.data) {
    console.error("Department save failed:", result.error ?? "Department not found.");
    redirectToCampusPage("/admin/departments", campusId, "error", "department_save_failed");
  }

  const auditOk = await recordCampusAudit(
    supabase,
    ctx,
    campusId,
    departmentId ? "department_updated" : "department_created",
    "department",
    result.data.id,
    { name: values.name }
  );
  revalidateCampusPages("/admin/departments");
  redirectToCampusPage(
    "/admin/departments",
    campusId,
    auditOk ? "notice" : "warning",
    auditOk ? (departmentId ? "department_updated" : "department_created") : "audit_failed"
  );
}

export async function setDepartmentActiveAction(formData: FormData): Promise<void> {
  const ctx = await requireRole(["campus_admin", "super_admin"], { includeUniversity: false });
  const rawCampusId = String(formData.get("universityId") ?? "");
  const campusId = resolveAdminCampusId(ctx.profile.role, ctx.profile.university_id, rawCampusId);
  const parsed = z.object({
    id: z.string().uuid(),
    isActive: z.enum(["true", "false"]),
  }).safeParse({
    id: formData.get("departmentId"),
    isActive: formData.get("isActive"),
  });
  if (!parsed.success || !campusId) {
    redirectToCampusPage("/admin/departments", campusId, "error", "invalid_department");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirectToCampusPage("/admin/departments", campusId, "error", "service_unavailable");
  }
  const isActive = parsed.data.isActive === "true";
  const { data, error } = await supabase
    .from("departments")
    .update({ is_active: isActive })
    .eq("id", parsed.data.id)
    .eq("university_id", campusId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("Department status update failed:", error ?? "Department not found.");
    redirectToCampusPage("/admin/departments", campusId, "error", "department_save_failed");
  }

  const auditOk = await recordCampusAudit(
    supabase,
    ctx,
    campusId,
    isActive ? "department_activated" : "department_deactivated",
    "department",
    data.id,
    { is_active: isActive }
  );
  revalidateCampusPages("/admin/departments");
  redirectToCampusPage(
    "/admin/departments",
    campusId,
    auditOk ? "notice" : "warning",
    auditOk ? (isActive ? "department_activated" : "department_deactivated") : "audit_failed"
  );
}

export async function saveLocationAction(formData: FormData): Promise<void> {
  const ctx = await requireRole(["campus_admin", "super_admin"], { includeUniversity: false });
  const rawCampusId = String(formData.get("universityId") ?? "");
  const campusId = resolveAdminCampusId(ctx.profile.role, ctx.profile.university_id, rawCampusId);
  const coordinate = z.union([
    z.literal(""),
    z.coerce.number(),
  ]);
  const parsed = z.object({
    id: z.string().uuid().optional().or(z.literal("")),
    name: z.string().trim().min(2).max(120),
    locationType: z.enum([
      "academic",
      "hostel",
      "administrative",
      "road",
      "utility",
      "recreation",
      "facility",
      "other",
    ]),
    buildingCode: z.string().trim().max(40),
    description: z.string().trim().max(500),
    latitude: coordinate,
    longitude: coordinate,
  }).safeParse({
    id: formData.get("locationId"),
    name: formData.get("name"),
    locationType: formData.get("locationType"),
    buildingCode: formData.get("buildingCode"),
    description: formData.get("description"),
    latitude: formData.get("latitude") ?? "",
    longitude: formData.get("longitude") ?? "",
  });

  if (!parsed.success || !campusId) {
    redirectToCampusPage("/admin/locations", campusId, "error", "invalid_location");
  }
  const locationId = parsed.data.id || null;
  const locationSlug = slugify(parsed.data.name);
  if (!locationSlug) {
    redirectToCampusPage("/admin/locations", campusId, "error", "invalid_location");
  }
  const latitude = parsed.data.latitude === "" ? null : parsed.data.latitude;
  const longitude = parsed.data.longitude === "" ? null : parsed.data.longitude;
  if (
    (latitude === null) !== (longitude === null) ||
    (latitude !== null && (latitude < -90 || latitude > 90)) ||
    (longitude !== null && (longitude < -180 || longitude > 180))
  ) {
    redirectToCampusPage("/admin/locations", campusId, "error", "invalid_coordinates");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirectToCampusPage("/admin/locations", campusId, "error", "service_unavailable");
  }
  const { exists, error: campusError } = await verifyCampus(supabase, campusId);
  if (campusError || !exists) {
    if (campusError) console.error("Location campus lookup failed:", campusError);
    redirectToCampusPage("/admin/locations", campusId, "error", "campus_unavailable");
  }

  const values = {
    name: parsed.data.name,
    slug: locationSlug,
    location_type: parsed.data.locationType,
    building_code: parsed.data.buildingCode || null,
    description: parsed.data.description || null,
    latitude,
    longitude,
  };
  const result = locationId
    ? await supabase
        .from("campus_locations")
        .update(values)
        .eq("id", locationId)
        .eq("university_id", campusId)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("campus_locations")
        .insert({ ...values, university_id: campusId })
        .select("id")
        .maybeSingle();

  if (result.error || !result.data) {
    console.error("Campus location save failed:", result.error ?? "Location not found.");
    redirectToCampusPage("/admin/locations", campusId, "error", "location_save_failed");
  }

  const auditOk = await recordCampusAudit(
    supabase,
    ctx,
    campusId,
    locationId ? "campus_location_updated" : "campus_location_created",
    "campus_location",
    result.data.id,
    { name: values.name, location_type: values.location_type }
  );
  revalidateCampusPages("/admin/locations");
  redirectToCampusPage(
    "/admin/locations",
    campusId,
    auditOk ? "notice" : "warning",
    auditOk ? (locationId ? "location_updated" : "location_created") : "audit_failed"
  );
}

export async function setLocationActiveAction(formData: FormData): Promise<void> {
  const ctx = await requireRole(["campus_admin", "super_admin"], { includeUniversity: false });
  const rawCampusId = String(formData.get("universityId") ?? "");
  const campusId = resolveAdminCampusId(ctx.profile.role, ctx.profile.university_id, rawCampusId);
  const parsed = z.object({
    id: z.string().uuid(),
    isActive: z.enum(["true", "false"]),
  }).safeParse({
    id: formData.get("locationId"),
    isActive: formData.get("isActive"),
  });
  if (!parsed.success || !campusId) {
    redirectToCampusPage("/admin/locations", campusId, "error", "invalid_location");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirectToCampusPage("/admin/locations", campusId, "error", "service_unavailable");
  }
  const isActive = parsed.data.isActive === "true";
  const { data, error } = await supabase
    .from("campus_locations")
    .update({ is_active: isActive })
    .eq("id", parsed.data.id)
    .eq("university_id", campusId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("Campus location status update failed:", error ?? "Location not found.");
    redirectToCampusPage("/admin/locations", campusId, "error", "location_save_failed");
  }

  const auditOk = await recordCampusAudit(
    supabase,
    ctx,
    campusId,
    isActive ? "campus_location_activated" : "campus_location_deactivated",
    "campus_location",
    data.id,
    { is_active: isActive }
  );
  revalidateCampusPages("/admin/locations");
  redirectToCampusPage(
    "/admin/locations",
    campusId,
    auditOk ? "notice" : "warning",
    auditOk ? (isActive ? "location_activated" : "location_deactivated") : "audit_failed"
  );
}

export async function saveCampusSettingsAction(formData: FormData): Promise<void> {
  const ctx = await requireRole(["campus_admin", "super_admin"], { includeUniversity: false });
  const rawCampusId = String(formData.get("universityId") ?? "");
  const campusId = resolveAdminCampusId(ctx.profile.role, ctx.profile.university_id, rawCampusId);
  const parsed = z.object({
    requireMatricNumber: z.enum(["on"]).optional(),
    autoApproveReports: z.enum(["on"]).optional(),
    allowPublicComments: z.enum(["on"]).optional(),
    mapConfigured: z.enum(["on"]).optional(),
    duplicateDistance: z.coerce.number().int().min(1).max(10000),
    duplicateWindow: z.coerce.number().int().min(1).max(8760),
    mapZoom: z.coerce.number().int().min(1).max(22),
    mapLatitude: z.union([z.literal(""), z.coerce.number().min(-90).max(90)]),
    mapLongitude: z.union([z.literal(""), z.coerce.number().min(-180).max(180)]),
  }).safeParse({
    requireMatricNumber: formData.get("requireMatricNumber") ?? undefined,
    autoApproveReports: formData.get("autoApproveReports") ?? undefined,
    allowPublicComments: formData.get("allowPublicComments") ?? undefined,
    mapConfigured: formData.get("mapConfigured") ?? undefined,
    duplicateDistance: formData.get("duplicateDistance"),
    duplicateWindow: formData.get("duplicateWindow"),
    mapZoom: formData.get("mapZoom"),
    mapLatitude: formData.get("mapLatitude") ?? "",
    mapLongitude: formData.get("mapLongitude") ?? "",
  });
  if (!parsed.success || !campusId) {
    redirectToCampusPage("/admin/settings", campusId, "error", "invalid_settings");
  }

  const domainInput = String(formData.get("allowedEmailDomains") ?? "");
  const domains = domainInput
    .split(/[,\s]+/)
    .map((domain) => domain.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean);
  const domainPattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
  if (domains.some((domain) => !domainPattern.test(domain))) {
    redirectToCampusPage("/admin/settings", campusId, "error", "invalid_domains");
  }

  const latitude = parsed.data.mapLatitude === "" ? null : parsed.data.mapLatitude;
  const longitude = parsed.data.mapLongitude === "" ? null : parsed.data.mapLongitude;
  if ((latitude === null) !== (longitude === null)) {
    redirectToCampusPage("/admin/settings", campusId, "error", "incomplete_map_center");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirectToCampusPage("/admin/settings", campusId, "error", "service_unavailable");
  }
  const { exists, error: campusError } = await verifyCampus(supabase, campusId);
  if (campusError || !exists) {
    if (campusError) console.error("Campus settings university lookup failed:", campusError);
    redirectToCampusPage("/admin/settings", campusId, "error", "campus_unavailable");
  }

  const values = {
    university_id: campusId,
    require_matric_number: Boolean(parsed.data.requireMatricNumber),
    allowed_email_domains: [...new Set(domains)],
    auto_approve_reports: Boolean(parsed.data.autoApproveReports),
    allow_public_comments: Boolean(parsed.data.allowPublicComments),
    duplicate_distance_meters: parsed.data.duplicateDistance,
    duplicate_time_window_hours: parsed.data.duplicateWindow,
    map_center_lat: latitude,
    map_center_lng: longitude,
    map_default_zoom: parsed.data.mapZoom,
    map_configured: Boolean(parsed.data.mapConfigured),
  };

  const { data: existing, error: settingsLookupError } = await supabase
    .from("campus_settings")
    .select("id")
    .eq("university_id", campusId)
    .maybeSingle();
  if (settingsLookupError) {
    console.error("Campus settings lookup failed:", settingsLookupError);
    redirectToCampusPage("/admin/settings", campusId, "error", "settings_save_failed");
  }

  const result = existing
    ? await supabase
        .from("campus_settings")
        .update(values)
        .eq("university_id", campusId)
        .select("id")
        .maybeSingle()
    : ctx.profile.role === "super_admin"
      ? await supabase
          .from("campus_settings")
          .insert(values)
          .select("id")
          .maybeSingle()
      : { data: null, error: new Error("Campus settings are not initialized.") };

  if (result.error || !result.data) {
    console.error("Campus settings save failed:", result.error ?? "Settings row not found.");
    redirectToCampusPage(
      "/admin/settings",
      campusId,
      "error",
      ctx.profile.role === "campus_admin" && !existing ? "settings_uninitialized" : "settings_save_failed"
    );
  }

  const auditOk = await recordCampusAudit(
    supabase,
    ctx,
    campusId,
    "campus_settings_updated",
    "campus_settings",
    result.data.id,
    { fields: Object.keys(values).filter((key) => key !== "university_id") }
  );
  revalidateCampusPages("/admin/settings");
  redirectToCampusPage(
    "/admin/settings",
    campusId,
    auditOk ? "notice" : "warning",
    auditOk ? "settings_saved" : "audit_failed"
  );
}
