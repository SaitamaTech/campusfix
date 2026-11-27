-- =============================================================================
-- CAMPUSFIX: Row Level Security Policies, Role Helpers & Auth Triggers
-- Migration: 0002_rls_policies.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid recursive RLS lookups)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_university_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT university_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT role = 'super_admin' FROM public.profiles WHERE id = auth.uid()), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.is_campus_admin_for(target_university_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT role = 'campus_admin' AND university_id = target_university_id AND is_active = TRUE
    FROM public.profiles
    WHERE id = auth.uid()
  ), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.is_admin_for(target_university_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR public.is_campus_admin_for(target_university_id);
$$;

-- -----------------------------------------------------------------------------
-- Auth Trigger: automatically create a student profile when auth.users is created.
-- NEVER trusts client-supplied role metadata; always forces 'student'.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::JSONB);
  req_univ_id UUID;
  resolved_univ_id UUID;
BEGIN
  BEGIN
    req_univ_id := NULLIF(meta->>'university_id', '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    req_univ_id := NULL;
  END;

  IF req_univ_id IS NOT NULL THEN
    SELECT id INTO resolved_univ_id
    FROM public.universities
    WHERE id = req_univ_id AND is_active = TRUE
    LIMIT 1;
  END IF;

  IF resolved_univ_id IS NULL THEN
    SELECT id INTO resolved_univ_id
    FROM public.universities
    WHERE slug = 'unilesa' AND is_active = TRUE
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (
    id,
    university_id,
    full_name,
    email,
    role,
    matric_number,
    department,
    faculty,
    level,
    email_verified_at
  ) VALUES (
    NEW.id,
    resolved_univ_id,
    COALESCE(NULLIF(TRIM(meta->>'full_name'), ''), split_part(COALESCE(NEW.email, 'Student'), '@', 1)),
    LOWER(NEW.email),
    'student',
    NULLIF(TRIM(meta->>'matric_number'), ''),
    NULLIF(TRIM(meta->>'department'), ''),
    NULLIF(TRIM(meta->>'faculty'), ''),
    NULLIF(TRIM(meta->>'level'), ''),
    NEW.email_confirmed_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_verified_at = COALESCE(public.profiles.email_verified_at, EXCLUDED.email_verified_at);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sync email verification timestamp when user confirms email
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.profiles
    SET email_verified_at = NEW.email_confirmed_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_confirmed();

-- -----------------------------------------------------------------------------
-- Guard trigger: prevent non-super-admins from escalating roles or changing university
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service role / internal postgres sessions (auth.uid() IS NULL)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_super_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Only super administrators may modify user roles.';
    END IF;
    IF NEW.university_id IS DISTINCT FROM OLD.university_id THEN
      RAISE EXCEPTION 'Only super administrators may reassign user universities.';
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active
       AND NOT public.is_campus_admin_for(OLD.university_id) THEN
      RAISE EXCEPTION 'Unauthorized account status change.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_sensitive_columns ON public.profiles;
CREATE TRIGGER trg_guard_profile_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_sensitive_columns();

-- -----------------------------------------------------------------------------
-- Public aggregate statistics function (safe for landing page without exposing PII)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_campus_stats(target_university_slug TEXT DEFAULT NULL)
RETURNS TABLE (
  total_reports BIGINT,
  resolved_reports BIGINT,
  in_progress_reports BIGINT,
  active_universities BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(i.id)::BIGINT AS total_reports,
    COUNT(i.id) FILTER (WHERE i.status = 'resolved')::BIGINT AS resolved_reports,
    COUNT(i.id) FILTER (WHERE i.status IN ('under_review', 'approved', 'assigned', 'in_progress'))::BIGINT AS in_progress_reports,
    (SELECT COUNT(*)::BIGINT FROM public.universities WHERE is_active = TRUE) AS active_universities
  FROM public.incidents i
  JOIN public.universities u ON u.id = i.university_id
  WHERE u.is_active = TRUE
    AND i.status <> 'rejected'
    AND (target_university_slug IS NULL OR u.slug = target_university_slug);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_campus_stats(TEXT) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Enable RLS on all tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Policies: universities
-- -----------------------------------------------------------------------------
CREATE POLICY "universities_public_read_active"
  ON public.universities FOR SELECT
  USING (is_active = TRUE OR public.is_super_admin());

CREATE POLICY "universities_super_admin_write"
  ON public.universities FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- Policies: campus_settings
-- -----------------------------------------------------------------------------
CREATE POLICY "campus_settings_read"
  ON public.campus_settings FOR SELECT
  USING (TRUE);

CREATE POLICY "campus_settings_admin_update"
  ON public.campus_settings FOR UPDATE
  USING (public.is_admin_for(university_id))
  WITH CHECK (public.is_admin_for(university_id));

CREATE POLICY "campus_settings_super_admin_insert_delete"
  ON public.campus_settings FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "campus_settings_super_admin_delete"
  ON public.campus_settings FOR DELETE
  USING (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- Policies: profiles
-- -----------------------------------------------------------------------------
CREATE POLICY "profiles_read_own_or_admin"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.is_super_admin()
    OR public.is_campus_admin_for(university_id)
  );

CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  USING (
    id = auth.uid()
    OR public.is_super_admin()
    OR public.is_campus_admin_for(university_id)
  )
  WITH CHECK (
    id = auth.uid()
    OR public.is_super_admin()
    OR public.is_campus_admin_for(university_id)
  );

-- -----------------------------------------------------------------------------
-- Policies: departments
-- -----------------------------------------------------------------------------
CREATE POLICY "departments_read_authenticated"
  ON public.departments FOR SELECT
  TO authenticated
  USING (
    university_id = public.current_user_university_id()
    OR public.is_super_admin()
  );

CREATE POLICY "departments_admin_write"
  ON public.departments FOR ALL
  USING (public.is_admin_for(university_id))
  WITH CHECK (public.is_admin_for(university_id));

-- -----------------------------------------------------------------------------
-- Policies: campus_locations
-- -----------------------------------------------------------------------------
CREATE POLICY "campus_locations_read_authenticated"
  ON public.campus_locations FOR SELECT
  TO authenticated
  USING (
    university_id = public.current_user_university_id()
    OR public.is_super_admin()
  );

CREATE POLICY "campus_locations_admin_write"
  ON public.campus_locations FOR ALL
  USING (public.is_admin_for(university_id))
  WITH CHECK (public.is_admin_for(university_id));

-- -----------------------------------------------------------------------------
-- Policies: incident_categories
-- -----------------------------------------------------------------------------
CREATE POLICY "incident_categories_read"
  ON public.incident_categories FOR SELECT
  USING (
    university_id IS NULL
    OR university_id = public.current_user_university_id()
    OR public.is_super_admin()
  );

CREATE POLICY "incident_categories_admin_write"
  ON public.incident_categories FOR ALL
  USING (
    public.is_super_admin()
    OR (university_id IS NOT NULL AND public.is_campus_admin_for(university_id))
  )
  WITH CHECK (
    public.is_super_admin()
    OR (university_id IS NOT NULL AND public.is_campus_admin_for(university_id))
  );

-- -----------------------------------------------------------------------------
-- Policies: incidents
-- -----------------------------------------------------------------------------
CREATE POLICY "incidents_read_university_members"
  ON public.incidents FOR SELECT
  TO authenticated
  USING (
    university_id = public.current_user_university_id()
    OR public.is_super_admin()
  );

CREATE POLICY "incidents_student_insert"
  ON public.incidents FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND university_id = public.current_user_university_id()
    AND status = 'submitted'
    AND confidence_score = 0
    AND verification_count = 0
    AND flag_count = 0
    AND fixed_report_count = 0
    AND is_flagged = FALSE
  );

CREATE POLICY "incidents_admin_update"
  ON public.incidents FOR UPDATE
  TO authenticated
  USING (public.is_admin_for(university_id))
  WITH CHECK (public.is_admin_for(university_id));

-- -----------------------------------------------------------------------------
-- Policies: incident_images
-- -----------------------------------------------------------------------------
CREATE POLICY "incident_images_read"
  ON public.incident_images FOR SELECT
  TO authenticated
  USING (
    university_id = public.current_user_university_id()
    OR public.is_super_admin()
  );

CREATE POLICY "incident_images_insert_reporter_or_admin"
  ON public.incident_images FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      university_id = public.current_user_university_id()
      OR public.is_super_admin()
    )
    AND (
      image_type = 'evidence'
      OR public.is_admin_for(university_id)
    )
  );

-- -----------------------------------------------------------------------------
-- Policies: incident_verifications
-- Prevent users from verifying their own reports or cross-university reports.
-- -----------------------------------------------------------------------------
CREATE POLICY "incident_verifications_read"
  ON public.incident_verifications FOR SELECT
  TO authenticated
  USING (
    university_id = public.current_user_university_id()
    OR public.is_super_admin()
  );

CREATE POLICY "incident_verifications_insert_other_users"
  ON public.incident_verifications FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND university_id = public.current_user_university_id()
    AND EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.id = incident_id
        AND i.university_id = public.current_user_university_id()
        AND i.reporter_id <> auth.uid()
    )
  );

CREATE POLICY "incident_verifications_delete_own"
  ON public.incident_verifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Policies: incident_updates (append-only; internal notes hidden from students)
-- -----------------------------------------------------------------------------
CREATE POLICY "incident_updates_read"
  ON public.incident_updates FOR SELECT
  TO authenticated
  USING (
    (
      university_id = public.current_user_university_id()
      AND (NOT is_internal OR public.is_admin_for(university_id))
    )
    OR public.is_super_admin()
  );

CREATE POLICY "incident_updates_insert_authorized"
  ON public.incident_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND (
      public.is_admin_for(university_id)
      OR (
        university_id = public.current_user_university_id()
        AND is_internal = FALSE
        AND update_type IN ('submitted', 'dispute')
      )
    )
  );

-- -----------------------------------------------------------------------------
-- Policies: incident_assignments
-- -----------------------------------------------------------------------------
CREATE POLICY "incident_assignments_read"
  ON public.incident_assignments FOR SELECT
  TO authenticated
  USING (
    university_id = public.current_user_university_id()
    OR public.is_super_admin()
  );

CREATE POLICY "incident_assignments_admin_write"
  ON public.incident_assignments FOR ALL
  USING (public.is_admin_for(university_id))
  WITH CHECK (public.is_admin_for(university_id));

-- -----------------------------------------------------------------------------
-- Policies: incident_flags
-- -----------------------------------------------------------------------------
CREATE POLICY "incident_flags_read_own_or_admin"
  ON public.incident_flags FOR SELECT
  TO authenticated
  USING (
    flagged_by = auth.uid()
    OR public.is_admin_for(university_id)
  );

CREATE POLICY "incident_flags_insert"
  ON public.incident_flags FOR INSERT
  TO authenticated
  WITH CHECK (
    flagged_by = auth.uid()
    AND university_id = public.current_user_university_id()
  );

CREATE POLICY "incident_flags_admin_update"
  ON public.incident_flags FOR UPDATE
  TO authenticated
  USING (public.is_admin_for(university_id))
  WITH CHECK (public.is_admin_for(university_id));

-- -----------------------------------------------------------------------------
-- Policies: notifications
-- -----------------------------------------------------------------------------
CREATE POLICY "notifications_read_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own_read_status"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_admin_insert"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (university_id IS NOT NULL AND public.is_campus_admin_for(university_id))
    OR user_id = auth.uid()
  );

-- -----------------------------------------------------------------------------
-- Policies: audit_logs (admins can read their university logs; append-only)
-- -----------------------------------------------------------------------------
CREATE POLICY "audit_logs_admin_read"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR (university_id IS NOT NULL AND public.is_campus_admin_for(university_id))
  );

CREATE POLICY "audit_logs_admin_insert"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND (
      public.is_super_admin()
      OR (university_id IS NOT NULL AND public.is_campus_admin_for(university_id))
    )
  );
