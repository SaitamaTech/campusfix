import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedContext } from "@/lib/auth/session";
import { getDefaultRouteForRole } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const safeNext =
    next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
      ? next
      : null;

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const isGoogleSignIn = searchParams.get("provider") === "google";
        if (safeNext && !isGoogleSignIn) {
          return NextResponse.redirect(new URL(safeNext, origin));
        }

        const ctx = await getAuthenticatedContext();
        if (ctx?.profile.is_active) {
          if (ctx.profile.role === "student" && !ctx.profile.onboarding_completed) {
            return NextResponse.redirect(new URL("/onboarding", origin));
          }
          if (safeNext) {
            return NextResponse.redirect(new URL(safeNext, origin));
          }
          return NextResponse.redirect(
            new URL(getDefaultRouteForRole(ctx.profile.role), origin)
          );
        }

        if (ctx && !ctx.profile.is_active) {
          return NextResponse.redirect(
            new URL("/login?error=account_suspended", origin)
          );
        }

        if (isGoogleSignIn) {
          return NextResponse.redirect(
            new URL("/login?error=profile_unavailable", origin)
          );
        }
      }
    }
  }

  if (
    searchParams.get("provider") === "google" &&
    (searchParams.has("error") || searchParams.has("error_description"))
  ) {
    return NextResponse.redirect(
      new URL("/login?error=google_signin_failed", origin)
    );
  }

  return NextResponse.redirect(`${origin}/login?error=verification_failed`);
}
