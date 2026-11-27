export type UserRole = "student" | "campus_admin" | "super_admin";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type IncidentStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "rejected";

export type VerificationType =
  | "confirm_exists"
  | "experienced_too"
  | "appears_fixed";

export interface University {
  id: string;
  name: string;
  short_name: string;
  slug: string;
  country: string;
  state: string;
  city: string;
  email_domain: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampusSettings {
  id: string;
  university_id: string;
  require_matric_number: boolean;
  allowed_email_domains: string[];
  first_verified_email_admin_claim: boolean;
  auto_approve_reports: boolean;
  allow_public_comments: boolean;
  duplicate_distance_meters: number;
  duplicate_time_window_hours: number;
  map_center_lat: number | null;
  map_center_lng: number | null;
  map_default_zoom: number;
  campus_boundary_geojson: Record<string, unknown> | null;
  map_configured: boolean;
  health_score_weights: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  university_id: string | null;
  full_name: string;
  email: string;
  role: UserRole;
  matric_number: string | null;
  department: string | null;
  faculty: string | null;
  level: string | null;
  avatar_url: string | null;
  is_active: boolean;
  onboarding_completed: boolean;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  university_id: string;
  name: string;
  slug: string;
  description: string | null;
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CampusLocation {
  id: string;
  university_id: string;
  name: string;
  slug: string;
  location_type:
    | "academic"
    | "hostel"
    | "administrative"
    | "road"
    | "utility"
    | "recreation"
    | "facility"
    | "other";
  building_code: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncidentCategory {
  id: string;
  university_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon_name: string;
  default_department_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicCampusStats {
  total_reports: number;
  resolved_reports: number;
  in_progress_reports: number;
  active_universities: number;
}

export interface Incident {
  id: string;
  reference_code: string;
  university_id: string;
  reporter_id: string;
  category_id: string;
  location_id: string | null;
  custom_location_name: string | null;
  building_or_facility: string | null;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  latitude: number | null;
  longitude: number | null;
  observed_at: string;
  additional_info: string | null;
  confidence_score: number;
  verification_count: number;
  flag_count: number;
  fixed_report_count: number;
  is_flagged: boolean;
  rejection_reason: string | null;
  resolution_description: string | null;
  resolution_image_url: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  disputed_at: string | null;
  dispute_reason: string | null;
  created_at: string;
  updated_at: string;
  category?: Pick<IncidentCategory, "name" | "slug" | "icon_name"> | null;
  location?: Pick<CampusLocation, "name" | "building_code"> | null;
}
