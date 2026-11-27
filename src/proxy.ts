import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { getDefaultRouteForRole } from "@/lib/auth/rbac";
import type { UserRole } from "@/types/database";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/report",
  "/reports",
  "/explore",
  "/map",
  "/my-reports",
  "/notifications",
  "/profile",
  "/admin",
  "/super-admin",
];

const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function proxy(request: NextRequest) {
  const env = getSupabasePublicEnv();
  const pathname = request.nextUrl.pathname;

  if (!env) {
    if (matchesPrefix(pathname, PROTECTED_PREFIXES)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("setup", "required");
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = matchesPrefix(pathname, PROTECTED_PREFIXES);
  const isAuthPage = matchesPrefix(pathname, AUTH_ROUTES);

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (isAuthPage || matchesPrefix(pathname, ["/admin", "/super-admin"]))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active, onboarding_completed")
      .eq("id", user.id)
      .single();

    const role = (profile?.role as UserRole | undefined) ?? "student";

    if (isAuthPage) {
      return NextResponse.redirect(new URL(getDefaultRouteForRole(role), request.url));
    }

    if (matchesPrefix(pathname, ["/super-admin"]) && role !== "super_admin") {
      return NextResponse.redirect(new URL(getDefaultRouteForRole(role), request.url));
    }

    if (
      matchesPrefix(pathname, ["/admin"]) &&
      role !== "campus_admin" &&
      role !== "super_admin"
    ) {
      return NextResponse.redirect(new URL(getDefaultRouteForRole(role), request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
