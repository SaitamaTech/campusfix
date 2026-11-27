import type { UserRole } from "@/types/database";

export function resolveAdminCampusId(
  role: UserRole,
  assignedCampusId: string | null,
  requestedCampusId: string | null
): string | null {
  if (role === "campus_admin") {
    return assignedCampusId;
  }
  if (role === "super_admin") {
    return requestedCampusId;
  }
  return null;
}

export function selectAdminCampusId(
  role: UserRole,
  assignedCampusId: string | null,
  requestedCampusId: string | null,
  availableCampusIds: string[]
): string | null {
  if (role === "campus_admin") {
    return assignedCampusId && availableCampusIds.includes(assignedCampusId)
      ? assignedCampusId
      : null;
  }
  if (role === "super_admin") {
    return (
      (requestedCampusId && availableCampusIds.includes(requestedCampusId)
        ? requestedCampusId
        : null) ??
      availableCampusIds[0] ??
      null
    );
  }
  return null;
}
