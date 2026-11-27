"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function redirectWithResult(path: string, key: "notice" | "error", value: string): never {
  const query = new URLSearchParams({ [key]: value });
  redirect(`${path}?${query.toString()}`);
}

export async function updateAccountRoleAction(formData: FormData): Promise<void> {
  const ctx = await requireRole(["super_admin"], { includeUniversity: false });
  const parsed = z.object({
    profileId: z.string().uuid(),
    role: z.enum(["student", "campus_admin"]),
    universityId: z.string().uuid().optional().or(z.literal("")),
  }).safeParse({
    profileId: formData.get("profileId"),
    role: formData.get("role"),
    universityId: formData.get("universityId"),
  });

  if (!parsed.success) {
    redirectWithResult("/super-admin/accounts", "error", "invalid_account");
  }
  if (parsed.data.profileId === ctx.userId) {
    redirectWithResult("/super-admin/accounts", "error", "protected_account");
  }
  if (parsed.data.role === "campus_admin" && !parsed.data.universityId) {
    redirectWithResult("/super-admin/accounts", "error", "campus_required");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirectWithResult("/super-admin/accounts", "error", "service_unavailable");
  }

  const { error } = await supabase.rpc("manage_profile_role", {
    target_profile_id: parsed.data.profileId,
    requested_role: parsed.data.role,
    requested_university_id: parsed.data.universityId || null,
  });

  if (error) {
    console.error("Super-admin account role update failed:", error);
    redirectWithResult("/super-admin/accounts", "error", "account_update_failed");
  }

  revalidatePath("/super-admin/accounts");
  revalidatePath("/super-admin");
  redirectWithResult("/super-admin/accounts", "notice", "role_saved");
}

export async function updateAccountStatusAction(formData: FormData): Promise<void> {
  const ctx = await requireRole(["super_admin"], { includeUniversity: false });
  const parsed = z.object({
    profileId: z.string().uuid(),
    isActive: z.enum(["true", "false"]),
  }).safeParse({
    profileId: formData.get("profileId"),
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) {
    redirectWithResult("/super-admin/accounts", "error", "invalid_account");
  }
  if (parsed.data.profileId === ctx.userId) {
    redirectWithResult("/super-admin/accounts", "error", "protected_account");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirectWithResult("/super-admin/accounts", "error", "service_unavailable");
  }

  const isActive = parsed.data.isActive === "true";
  const { error } = await supabase.rpc("set_profile_active", {
    target_profile_id: parsed.data.profileId,
    requested_is_active: isActive,
  });

  if (error) {
    console.error("Super-admin account status update failed:", error);
    redirectWithResult("/super-admin/accounts", "error", "account_update_failed");
  }

  revalidatePath("/super-admin/accounts");
  revalidatePath("/super-admin");
  redirectWithResult(
    "/super-admin/accounts",
    "notice",
    isActive ? "account_reactivated" : "account_suspended"
  );
}

export async function createAnnouncementAction(formData: FormData): Promise<void> {
  const ctx = await requireRole(["campus_admin", "super_admin"], { includeUniversity: false });
  const announcementsPath =
    ctx.profile.role === "campus_admin"
      ? "/admin/announcements"
      : "/super-admin/announcements";
  const parsed = z.object({
    title: z.string().trim().min(3).max(140),
    body: z.string().trim().min(10).max(5000),
  }).safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    redirectWithResult(announcementsPath, "error", "invalid_announcement");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirectWithResult(announcementsPath, "error", "service_unavailable");
  }

  const { error } = await supabase.from("announcements").insert({
    title: parsed.data.title,
    body: parsed.data.body,
    created_by: ctx.userId,
  });

  if (error) {
    console.error("Announcement publishing failed:", error);
    redirectWithResult(announcementsPath, "error", "announcement_failed");
  }

  revalidatePath("/super-admin/announcements");
  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
  redirectWithResult(announcementsPath, "notice", "announcement_published");
}

export async function toggleAnnouncementAction(formData: FormData): Promise<void> {
  await requireRole(["super_admin"], { includeUniversity: false });
  const parsed = z.object({
    announcementId: z.string().uuid(),
    isPublished: z.enum(["true", "false"]),
  }).safeParse({
    announcementId: formData.get("announcementId"),
    isPublished: formData.get("isPublished"),
  });

  if (!parsed.success) {
    redirectWithResult("/super-admin/announcements", "error", "invalid_announcement");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirectWithResult("/super-admin/announcements", "error", "service_unavailable");
  }

  const isPublished = parsed.data.isPublished === "true";
  const { data, error } = await supabase
    .from("announcements")
    .update({ is_published: isPublished })
    .eq("id", parsed.data.announcementId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Announcement publication status update failed:", error ?? "Announcement not found.");
    redirectWithResult("/super-admin/announcements", "error", "announcement_failed");
  }

  revalidatePath("/super-admin/announcements");
  revalidatePath("/announcements");
  redirectWithResult(
    "/super-admin/announcements",
    "notice",
    isPublished ? "announcement_published" : "announcement_unpublished"
  );
}
