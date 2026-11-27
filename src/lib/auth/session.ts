import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, University, UserRole } from "@/types/database";
import { getDefaultRouteForRole } from "./rbac";

export interface AuthenticatedContext {
  userId: string;
  email: string;
  institutionName: string | null;
  profile: Profile;
  university: University | null;
}

export async function getAuthenticatedContext(
  options: { includeUniversity?: boolean } = {}
): Promise<AuthenticatedContext | null> {
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  const metadataName = user.user_metadata?.institution_name;
  const normalizedInstitutionName =
    typeof metadataName === "string" ? metadataName.trim() : "";
  const institutionName =
    normalizedInstitutionName.length > 0 && normalizedInstitutionName.length <= 120
      ? normalizedInstitutionName
      : null;

  let university: University | null = null;
  if (options.includeUniversity !== false && profile.university_id) {
    const { data: univ } = await supabase
      .from("universities")
      .select("*")
      .eq("id", profile.university_id)
      .single();
    university = univ ?? null;
  }

  return {
    userId: user.id,
    email: user.email ?? profile.email,
    institutionName,
    profile: profile as Profile,
    university: university as University | null,
  };
}

export async function requireAuthenticatedContext(
  options: { allowUnassignedCampus?: boolean; includeUniversity?: boolean } = {}
): Promise<AuthenticatedContext> {
  const ctx = await getAuthenticatedContext(options);
  if (!ctx) {
    redirect("/login");
  }
  if (!ctx.profile.is_active) {
    redirect("/login?error=account_suspended");
  }
  if (
    !options.allowUnassignedCampus &&
    ctx.profile.role === "student" &&
    !ctx.profile.university_id
  ) {
    redirect("/onboarding");
  }
  return ctx;
}

export async function requireRole(
  allowedRoles: UserRole[],
  options: { includeUniversity?: boolean } = {}
): Promise<AuthenticatedContext> {
  const ctx = await requireAuthenticatedContext(options);
  if (!allowedRoles.includes(ctx.profile.role)) {
    redirect(getDefaultRouteForRole(ctx.profile.role));
  }
  return ctx;
}
