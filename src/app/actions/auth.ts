"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/supabase/env";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getDefaultRouteForRole } from "@/lib/auth/rbac";
import {
  forgotPasswordSchema,
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
    email: formData.get("email"),
    password: formData.get("password"),
    universityId: formData.get("universityId"),
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
      message:
        "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    };
  }

  const data = parsed.data;

  // Verify university exists & enforce university student verification rules
  const { data: university, error: univErr } = await supabase
    .from("universities")
    .select("id, name, is_active")
    .eq("id", data.universityId)
    .eq("is_active", true)
    .single();

  if (univErr || !university) {
    return {
      status: "error",
      message: "Selected university is unavailable.",
      fieldErrors: { universityId: "Please choose an active university." },
    };
  }

  const { data: settings } = await supabase
    .from("campus_settings")
    .select("require_matric_number, allowed_email_domains")
    .eq("university_id", university.id)
    .single();

  if (settings?.require_matric_number && !data.matricNumber?.trim()) {
    return {
      status: "error",
      message: "Your university requires a matriculation number to register.",
      fieldErrors: {
        matricNumber: "Matriculation number is required by university policy.",
      },
    };
  }

  const allowedDomains: string[] = settings?.allowed_email_domains ?? [];
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
      // Note: role is intentionally omitted and strictly enforced as 'student' in SQL trigger.
      data: {
        full_name: data.fullName,
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
  if (signUpData.session) {
    redirect("/onboarding");
  }

  return {
    status: "success",
    message:
      "Account created! Please check your email inbox and click the verification link to activate your CampusFix student account.",
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

export async function completeOnboardingAction(): Promise<void> {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  redirect("/dashboard");
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
