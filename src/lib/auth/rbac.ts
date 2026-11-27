import type { UserRole } from "@/types/database";

export const ROLE_LABELS: Record<UserRole, string> = {
  student: "Student",
  campus_admin: "Campus Administrator",
  super_admin: "Super Administrator",
};

export function getDefaultRouteForRole(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return "/super-admin";
    case "campus_admin":
      return "/admin";
    case "student":
    default:
      return "/dashboard";
  }
}

export function canAccessAdminArea(role: UserRole): boolean {
  return role === "campus_admin" || role === "super_admin";
}

export function canAccessSuperAdminArea(role: UserRole): boolean {
  return role === "super_admin";
}
