"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/supabase/env";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getDefaultRouteForRole } from "@/lib/auth/rbac";
import { DEFAULT_CAMPUS_SLUG } from "@/lib/campus";
import {
  forgotPasswordSchema,
  institutionNameSchema,
  loginSchema,
  profileUpdateSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import type { UserRole } from "@/types/database";

export interface AuthActionState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
}

async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  const forwarded = hdrs.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return hdrs.get("x-real-ip") ?? "unknown";
}

function mapZodErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const ip = await getClientIp();
  const rate = checkRateLimit(`register:${ip}`, 8, 60_000);
  if (!rate.allowed) {
    return {
      status: "error",
      message: `Too many registration attempts. Please try again in ${rate.retryAfterSeconds}s.`,
    };
  }

  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    institutionName: formData.get("institutionName"),
    email: formData.get("email"),
    password: formData.get("password"),
    matricNumber: formData.get("matricNumber"),
    department: formData.get("department"),
    faculty: formData.get("faculty"),
    level: formData.get("level"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please review the highlighted fields.",
      fieldErrors: mapZodErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      status: "error",
      message: "Registration is unavailable right now. Please try again later.",
    };
  }

  const data = parsed.data;

  // Resolve the default workspace and enforce its registration rules.
  const { data: university, error: univErr } = await supabase
    .from("universities")
    .select("id, name, is_active")
    .eq("slug", DEFAULT_CAMPUS_SLUG)
    .eq("is_active", true)
    .single();

  if (univErr || !university) {
    return {
      status: "error",
      message: "The default campus is unavailable. Please try again later.",
    };
  }

  const { data: settings, error: settingsError } = await supabase
    .from("campus_settings")
    .select("require_matric_number, allowed_email_domains")
    .eq("university_id", university.id)
    .single();

  if (settingsError || !settings) {
    console.error(
      "Could not load registration settings for university:",
      settingsError ?? "No campus settings row exists."
    );
    return {
      status: "error",
      message: "Campus registration requirements could not be loaded. Please try again.",
    };
  }

  if (settings.require_matric_number && !data.matricNumber?.trim()) {
    return {
      status: "error",
      message: "Your university requires a matriculation number to register.",
      fieldErrors: {
        matricNumber: "Matriculation number is required by university policy.",
      },
    };
  }

  const allowedDomains: string[] = settings.allowed_email_domains ?? [];
  if (allowedDomains.length > 0) {
    const emailDomain = data.email.split("@")[1]?.toLowerCase() ?? "";
    const matchesAllowed = allowedDomains.some(
      (domain) => domain.toLowerCase().trim() === emailDomain
    );
    if (!matchesAllowed) {
      return {
        status: "error",
        message: `Registration requires an approved institutional email (${allowedDomains.join(", ")}).`,
        fieldErrors: {
          email: "Use an approved university email domain.",
        },
      };
    }
  }

  const appUrl = getAppUrl();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=/onboarding`,
      // Role metadata is omitted; the database trigger assigns the student role.
      data: {
        full_name: data.fullName,
        institution_name: data.institutionName,
        university_id: university.id,
        matric_number: data.matricNumber || null,
        department: data.department,
        faculty: data.faculty,
        level: data.level,
      },
    },
  });

  if (signUpError) {
    return {
      status: "error",
      message: signUpError.message || "Unable to complete registration.",
    };
  }

  // If Supabase email confirmation is disabled, user receives an active session immediately
  if (signUpData.session && signUpData.user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", signUpData.user.id)
      .single();

    if (profileError || !profile) {
      console.error("Could not load the new account role:", profileError);
      return {
        status: "error",
        message:
          "Your account was created, but CampusFix could not finish loading it. Please sign in to continue.",
      };
    }

    const role = profile.role as UserRole;
    redirect(
      role === "student" ? "/onboarding" : getDefaultRouteForRole(role)
    );
  }

  return {
    status: "success",
    message:
      "Account created! Check your email and click the verification link to activate your CampusFix account.",
  };
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const ip = await getClientIp();
  const rate = checkRateLimit(`login:${ip}`, 12, 60_000);
  if (!rate.allowed) {
    return {
      status: "error",
      message: `Too many login attempts. Please wait ${rate.retryAfterSeconds}s.`,
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Enter a valid email and password.",
      fieldErrors: mapZodErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      status: "error",
      message:
        "Supabase is not configured yet. Add your project keys to .env.local to sign in.",
    };
  }

  const { data: authData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

  if (signInError || !authData.user) {
    return {
      status: "error",
      message: signInError?.message || "Invalid email or password.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active, onboarding_completed")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return {
      status: "error",
      message: "Account profile could not be loaded. Contact support.",
    };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return {
      status: "error",
      message: "This account has been suspended by an administrator.",
    };
  }

  const nextParam = String(formData.get("next") ?? "").trim();
  const role = profile.role as UserRole;

  if (role === "student" && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  if (nextParam.startsWith("/") && !nextParam.startsWith("//")) {
    redirect(nextParam);
  }

  redirect(getDefaultRouteForRole(role));
}

export async function googleSignInAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/login?error=supabase_not_configured");
  }

  const requestedNext = String(formData.get("next") ?? "").trim();
  const safeNext =
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    !requestedNext.includes("\\")
      ? requestedNext
      : "";
  const callbackUrl = new URL("/auth/callback", getAppUrl());
  callbackUrl.searchParams.set("provider", "google");
  if (safeNext) {
    callbackUrl.searchParams.set("next", safeNext);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl.toString() },
  });

  if (error || !data.url) {
    redirect("/login?error=google_signin_failed");
  }

  redirect(data.url);
}

export async function forgotPasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const ip = await getClientIp();
  const rate = checkRateLimit(`forgot:${ip}`, 5, 60_000);
  if (!rate.allowed) {
    return {
      status: "error",
      message: `Please wait ${rate.retryAfterSeconds}s before requesting another reset link.`,
    };
  }

  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please enter a valid email address.",
      fieldErrors: mapZodErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      status: "error",
      message: "Supabase is not configured yet.",
    };
  }

  const appUrl = getAppUrl();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
  });

  // Always return a non-enumerating success message
  return {
    status: "success",
    message:
      "If an account exists for that email address, a password reset link has been sent.",
  };
}

export async function resetPasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the password fields below.",
      fieldErrors: mapZodErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      status: "error",
      message: "Supabase is not configured yet.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Unable to update password. Request a new reset link.",
    };
  }

  redirect("/login?reset=success");
}

export async function completeOnboardingAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("university_id, email, role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("Could not load profile during onboarding:", profileError);
    redirect("/onboarding?error=profile_unavailable");
  }
  if (!profile.is_active) {
    redirect("/login?error=account_suspended");
  }
  if (profile.role !== "student") {
    redirect(getDefaultRouteForRole(profile.role as UserRole));
  }

  const parsedInstitutionName = institutionNameSchema.safeParse(
    formData.get("institutionName")
  );
  if (!parsedInstitutionName.success) {
    redirect("/onboarding?error=institution_name_required");
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: { institution_name: parsedInstitutionName.data },
  });
  if (metadataError) {
    console.error("Could not save institution name during onboarding:", metadataError);
    redirect("/onboarding?error=institution_name_save_failed");
  }

  let universityId = profile.university_id;
  if (!universityId) {
    const { data: university, error: universityError } = await supabase
      .from("universities")
      .select("id")
      .eq("slug", DEFAULT_CAMPUS_SLUG)
      .eq("is_active", true)
      .single();

    if (universityError || !university) {
      console.error("Could not load onboarding university:", universityError);
      redirect("/onboarding?error=university_unavailable");
    }

    const { data: settings, error: settingsError } = await supabase
      .from("campus_settings")
      .select("require_matric_number, allowed_email_domains")
      .eq("university_id", university.id)
      .single();

    if (settingsError || !settings) {
      console.error("Could not load campus requirements during onboarding:", settingsError);
      redirect("/onboarding?error=campus_settings_unavailable");
    }

    if (settings.require_matric_number) {
      redirect("/onboarding?error=campus_requires_registration");
    }

    const allowedDomains: string[] = settings.allowed_email_domains ?? [];
    const emailDomain = profile.email.split("@")[1]?.toLowerCase() ?? "";
    if (
      allowedDomains.length > 0 &&
      !allowedDomains.some((domain) => domain.toLowerCase().trim() === emailDomain)
    ) {
      redirect("/onboarding?error=institution_email_required");
    }

    universityId = university.id;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ university_id: universityId, onboarding_completed: true })
    .eq("id", user.id);

  if (updateError) {
    console.error("Could not complete user onboarding:", updateError);
    redirect("/onboarding?error=profile_update_failed");
  }

  const { data: updatedProfile, error: updatedProfileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (updatedProfileError || !updatedProfile) {
    console.error("Could not load role after onboarding:", updatedProfileError);
    redirect("/onboarding?error=profile_unavailable");
  }

  const role = updatedProfile.role as UserRole;
  redirect(role === "student" ? "/dashboard" : getDefaultRouteForRole(role));
}

export async function updateProfileAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const supabase = await createClient();
  if (!supabase) {
    return { status: "error", message: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Authentication required." };
  }

  const parsed = profileUpdateSchema.safeParse({
    fullName: formData.get("fullName"),
    matricNumber: formData.get("matricNumber"),
    department: formData.get("department"),
    faculty: formData.get("faculty"),
    level: formData.get("level"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check your profile inputs.",
      fieldErrors: mapZodErrors(parsed.error.issues),
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      matric_number: parsed.data.matricNumber || null,
      department: parsed.data.department,
      faculty: parsed.data.faculty,
      level: parsed.data.level,
    })
    .eq("id", user.id);

  if (error) {
    return {
      status: "error",
      message: error.message || "Unable to update profile.",
    };
  }

  return {
    status: "success",
    message: "Your profile details have been updated.",
  };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/login");
}
