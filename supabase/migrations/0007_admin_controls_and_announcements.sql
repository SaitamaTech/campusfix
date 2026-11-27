CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 140),
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 10 AND 5000),
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_published_created
  ON public.announcements(is_published, created_at DESC);

CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;

CREATE POLICY "announcements_read_published"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (is_published OR public.is_super_admin());

CREATE POLICY "announcements_super_admin_insert"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    AND created_by = auth.uid()
  );

CREATE POLICY "announcements_super_admin_update"
  ON public.announcements FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "announcements_super_admin_delete"
  ON public.announcements FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.get_campus_operations_metrics(
  target_university_id UUID
)
RETURNS TABLE (
  total_reports BIGINT,
  pending_reports BIGINT,
  in_progress_reports BIGINT,
  resolved_reports BIGINT,
  flagged_reports BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF target_university_id IS NULL OR NOT public.is_admin_for(target_university_id) THEN
    RAISE EXCEPTION 'Campus administrator access required.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE i.status IN ('submitted', 'under_review')),
    COUNT(*) FILTER (WHERE i.status IN ('assigned', 'in_progress')),
    COUNT(*) FILTER (WHERE i.status = 'resolved'),
    COUNT(*) FILTER (WHERE i.is_flagged)
  FROM public.incidents AS i
  WHERE i.university_id = target_university_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.manage_profile_role(
  target_profile_id UUID,
  requested_role TEXT,
  requested_university_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  target_profile public.profiles%ROWTYPE;
  resulting_university_id UUID;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Super administrator access required.'
      USING ERRCODE = '42501';
  END IF;

  IF target_profile_id IS NULL OR target_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot change your own account role.'
      USING ERRCODE = '22023';
  END IF;

  IF requested_role IS NULL OR requested_role NOT IN ('student', 'campus_admin') THEN
    RAISE EXCEPTION 'Only Student and Campus Admin roles can be assigned here.'
      USING ERRCODE = '22023';
  END IF;

  SELECT p.*
  INTO target_profile
  FROM public.profiles AS p
  WHERE p.id = target_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The selected account does not exist.'
      USING ERRCODE = 'P0002';
  END IF;

  IF target_profile.role = 'super_admin' THEN
    RAISE EXCEPTION 'Super Admin accounts are protected from role changes.'
      USING ERRCODE = '42501';
  END IF;

  resulting_university_id := target_profile.university_id;

  IF requested_role = 'campus_admin' THEN
    IF requested_university_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.universities AS u
      WHERE u.id = requested_university_id
        AND u.is_active = TRUE
    ) THEN
      RAISE EXCEPTION 'Choose an active university for the Campus Admin.'
        USING ERRCODE = '22023';
    END IF;
    resulting_university_id := requested_university_id;
  END IF;

  IF target_profile.role IS DISTINCT FROM requested_role
     OR target_profile.university_id IS DISTINCT FROM resulting_university_id THEN
    UPDATE public.profiles
    SET role = requested_role,
        university_id = resulting_university_id
    WHERE id = target_profile_id;

    INSERT INTO public.audit_logs (
      university_id,
      actor_id,
      actor_role,
      action,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      resulting_university_id,
      auth.uid(),
      'super_admin',
      'profile_role_changed',
      'profile',
      target_profile_id,
      jsonb_build_object(
        'previous_role', target_profile.role,
        'new_role', requested_role,
        'previous_university_id', target_profile.university_id,
        'new_university_id', resulting_university_id
      )
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_profile_active(
  target_profile_id UUID,
  requested_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  target_profile public.profiles%ROWTYPE;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Super administrator access required.'
      USING ERRCODE = '42501';
  END IF;

  IF target_profile_id IS NULL
     OR requested_is_active IS NULL
     OR target_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'Invalid account status request.'
      USING ERRCODE = '22023';
  END IF;

  SELECT p.*
  INTO target_profile
  FROM public.profiles AS p
  WHERE p.id = target_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The selected account does not exist.'
      USING ERRCODE = 'P0002';
  END IF;

  IF target_profile.role = 'super_admin' THEN
    RAISE EXCEPTION 'Super Admin accounts are protected from suspension.'
      USING ERRCODE = '42501';
  END IF;

  IF target_profile.is_active IS DISTINCT FROM requested_is_active THEN
    UPDATE public.profiles
    SET is_active = requested_is_active
    WHERE id = target_profile_id;

    INSERT INTO public.audit_logs (
      university_id,
      actor_id,
      actor_role,
      action,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      target_profile.university_id,
      auth.uid(),
      'super_admin',
      CASE WHEN requested_is_active THEN 'profile_reactivated' ELSE 'profile_suspended' END,
      'profile',
      target_profile_id,
      jsonb_build_object(
        'previous_is_active', target_profile.is_active,
        'new_is_active', requested_is_active
      )
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.manage_profile_role(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manage_profile_role(UUID, TEXT, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.set_profile_active(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_profile_active(UUID, BOOLEAN) TO authenticated;

REVOKE ALL ON FUNCTION public.get_campus_operations_metrics(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_campus_operations_metrics(UUID) TO authenticated;

GRANT INSERT ON public.audit_logs TO authenticated;
