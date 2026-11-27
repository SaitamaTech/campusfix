import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, University, UserRole } from "@/types/database";
import { getDefaultRouteForRole } from "./rbac";

export interface AuthenticatedContext {
  userId: string;
  email: string;
  profile: Profile;
  university: University | null;
}

export async function getAuthenticatedContext(): Promise<AuthenticatedContext | null> {
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

  let university: University | null = null;
  if (profile.university_id) {
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
    profile: profile as Profile,
    university: university as University | null,
  };
}

export async function requireAuthenticatedContext(
  options: { allowUnassignedCampus?: boolean } = {}
): Promise<AuthenticatedContext> {
  const ctx = await getAuthenticatedContext();
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

export async function requireRole(allowedRoles: UserRole[]): Promise<AuthenticatedContext> {
  const ctx = await requireAuthenticatedContext();
  if (!allowedRoles.includes(ctx.profile.role)) {
    redirect(getDefaultRouteForRole(ctx.profile.role));
  }
  return ctx;
}
