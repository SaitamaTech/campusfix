DROP POLICY IF EXISTS "announcements_super_admin_insert"
  ON public.announcements;

CREATE POLICY "announcements_admin_insert"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.is_super_admin()
      OR public.is_campus_admin_for(public.current_user_university_id())
    )
  );
