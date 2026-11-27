-- =============================================================================
-- CAMPUSFIX: Initial Relational Database Schema
-- Migration: 0001_initial_schema.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Shared updated_at trigger function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 1. universities
-- -----------------------------------------------------------------------------
CREATE TABLE public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL DEFAULT 'Nigeria',
  state TEXT NOT NULL DEFAULT 'Osun',
  city TEXT NOT NULL DEFAULT 'Ilesa',
  email_domain TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_universities_updated_at
  BEFORE UPDATE ON public.universities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. campus_settings (one row per university)
-- -----------------------------------------------------------------------------
CREATE TABLE public.campus_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL UNIQUE REFERENCES public.universities(id) ON DELETE CASCADE,
  require_matric_number BOOLEAN NOT NULL DEFAULT FALSE,
  allowed_email_domains TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  auto_approve_reports BOOLEAN NOT NULL DEFAULT FALSE,
  allow_public_comments BOOLEAN NOT NULL DEFAULT TRUE,
  duplicate_distance_meters INTEGER NOT NULL DEFAULT 75 CHECK (duplicate_distance_meters > 0),
  duplicate_time_window_hours INTEGER NOT NULL DEFAULT 72 CHECK (duplicate_time_window_hours > 0),
  map_center_lat DOUBLE PRECISION,
  map_center_lng DOUBLE PRECISION,
  map_default_zoom INTEGER NOT NULL DEFAULT 16 CHECK (map_default_zoom BETWEEN 1 AND 22),
  campus_boundary_geojson JSONB,
  map_configured BOOLEAN NOT NULL DEFAULT FALSE,
  health_score_weights JSONB NOT NULL DEFAULT '{
    "unresolved_penalty": 2.5,
    "high_severity_penalty": 4.0,
    "resolution_rate_weight": 0.4,
    "response_speed_weight": 0.25,
    "recurring_penalty": 3.0
  }'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_campus_settings_updated_at
  BEFORE UPDATE ON public.campus_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. profiles (linked 1:1 with auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id UUID REFERENCES public.universities(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'campus_admin', 'super_admin')),
  matric_number TEXT,
  department TEXT,
  faculty TEXT,
  level TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_university_role ON public.profiles(university_id, role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. departments
-- -----------------------------------------------------------------------------
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  contact_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (university_id, slug)
);

CREATE INDEX idx_departments_university ON public.departments(university_id, is_active);

CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. campus_locations
-- Coordinates remain NULL until verified and configured by campus admins.
-- -----------------------------------------------------------------------------
CREATE TABLE public.campus_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'facility' CHECK (
    location_type IN ('academic', 'hostel', 'administrative', 'road', 'utility', 'recreation', 'facility', 'other')
  ),
  building_code TEXT,
  description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (university_id, slug)
);

CREATE INDEX idx_campus_locations_university ON public.campus_locations(university_id, is_active);

CREATE TRIGGER trg_campus_locations_updated_at
  BEFORE UPDATE ON public.campus_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. incident_categories
-- -----------------------------------------------------------------------------
CREATE TABLE public.incident_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID REFERENCES public.universities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon_name TEXT NOT NULL DEFAULT 'alert-circle',
  default_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_incident_categories_univ_slug
  ON public.incident_categories (COALESCE(university_id, '00000000-0000-0000-0000-000000000000'::UUID), slug);

CREATE TRIGGER trg_incident_categories_updated_at
  BEFORE UPDATE ON public.incident_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. incidents
-- -----------------------------------------------------------------------------
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL UNIQUE,
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES public.incident_categories(id) ON DELETE RESTRICT,
  location_id UUID REFERENCES public.campus_locations(id) ON DELETE SET NULL,
  custom_location_name TEXT,
  building_or_facility TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'under_review', 'approved', 'assigned', 'in_progress', 'resolved', 'rejected')
  ),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  additional_info TEXT,
  confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  verification_count INTEGER NOT NULL DEFAULT 0 CHECK (verification_count >= 0),
  flag_count INTEGER NOT NULL DEFAULT 0 CHECK (flag_count >= 0),
  fixed_report_count INTEGER NOT NULL DEFAULT 0 CHECK (fixed_report_count >= 0),
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  rejection_reason TEXT,
  resolution_description TEXT,
  resolution_image_url TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  disputed_at TIMESTAMPTZ,
  dispute_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_university_status ON public.incidents(university_id, status);
CREATE INDEX idx_incidents_university_category ON public.incidents(university_id, category_id);
CREATE INDEX idx_incidents_reporter ON public.incidents(reporter_id, created_at DESC);
CREATE INDEX idx_incidents_created_at ON public.incidents(created_at DESC);
CREATE INDEX idx_incidents_geo ON public.incidents(university_id, latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE TRIGGER trg_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 8. incident_images
-- -----------------------------------------------------------------------------
CREATE TABLE public.incident_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  image_type TEXT NOT NULL DEFAULT 'evidence' CHECK (image_type IN ('evidence', 'resolution')),
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_images_incident ON public.incident_images(incident_id);

-- -----------------------------------------------------------------------------
-- 9. incident_verifications
-- Enforces one active verification per user per report.
-- -----------------------------------------------------------------------------
CREATE TABLE public.incident_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL CHECK (
    verification_type IN ('confirm_exists', 'experienced_too', 'appears_fixed')
  ),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (incident_id, user_id)
);

CREATE INDEX idx_incident_verifications_incident ON public.incident_verifications(incident_id);
CREATE INDEX idx_incident_verifications_user ON public.incident_verifications(user_id);

CREATE TRIGGER trg_incident_verifications_updated_at
  BEFORE UPDATE ON public.incident_verifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 10. incident_updates (append-only lifecycle audit timeline)
-- -----------------------------------------------------------------------------
CREATE TABLE public.incident_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('student', 'campus_admin', 'super_admin', 'system')),
  update_type TEXT NOT NULL CHECK (
    update_type IN ('submitted', 'status_change', 'note', 'assignment', 'resolution', 'dispute', 'verification_milestone', 'system')
  ),
  previous_status TEXT,
  new_status TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_updates_incident ON public.incident_updates(incident_id, created_at ASC);

-- -----------------------------------------------------------------------------
-- 11. incident_assignments
-- -----------------------------------------------------------------------------
CREATE TABLE public.incident_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_to_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reassigned', 'completed')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_assignments_incident ON public.incident_assignments(incident_id, status);
CREATE INDEX idx_incident_assignments_department ON public.incident_assignments(department_id, status);

CREATE TRIGGER trg_incident_assignments_updated_at
  BEFORE UPDATE ON public.incident_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 12. incident_flags
-- -----------------------------------------------------------------------------
CREATE TABLE public.incident_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  flagged_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (
    reason IN ('inaccurate', 'duplicate', 'spam', 'inappropriate', 'resolved_already', 'other')
  ),
  details TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed', 'dismissed')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (incident_id, flagged_by)
);

CREATE INDEX idx_incident_flags_university_status ON public.incident_flags(university_id, review_status);

CREATE TRIGGER trg_incident_flags_updated_at
  BEFORE UPDATE ON public.incident_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 13. notifications
-- -----------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  university_id UUID REFERENCES public.universities(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, is_read, created_at DESC);

-- -----------------------------------------------------------------------------
-- 14. audit_logs (administrative and security audit trail)
-- -----------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_university_created ON public.audit_logs(university_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id, created_at DESC);
