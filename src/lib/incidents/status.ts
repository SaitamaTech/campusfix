import type { IncidentStatus } from "@/types/database";

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  submitted: "Pending",
  under_review: "Under review",
  approved: "Verified",
  assigned: "Assigned",
  in_progress: "In progress",
  resolved: "Resolved",
  rejected: "Rejected",
  reopened: "Reopened",
};

export const INCIDENT_STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  submitted: ["under_review", "rejected"],
  under_review: ["approved", "rejected"],
  approved: ["assigned", "rejected"],
  assigned: ["in_progress", "rejected"],
  in_progress: ["resolved", "assigned", "rejected"],
  resolved: ["reopened"],
  rejected: ["reopened"],
  reopened: ["under_review", "approved", "rejected"],
};
