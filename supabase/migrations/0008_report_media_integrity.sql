CREATE INDEX IF NOT EXISTS idx_incident_images_incident_type_created
  ON public.incident_images(incident_id, image_type, created_at);

GRANT INSERT ON public.incident_images TO authenticated;

DROP POLICY IF EXISTS "incident_images_insert_reporter_or_admin"
  ON public.incident_images;

CREATE POLICY "incident_images_insert_owner_evidence_or_admin_resolution"
  ON public.incident_images FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND storage_path LIKE (
      university_id::TEXT || '/' || uploaded_by::TEXT || '/' || incident_id::TEXT || '/%'
    )
    AND (
      (
        image_type = 'evidence'
        AND university_id = public.current_user_university_id()
        AND EXISTS (
          SELECT 1
          FROM public.incidents AS i
          WHERE i.id = incident_images.incident_id
            AND i.university_id = incident_images.university_id
            AND i.reporter_id = auth.uid()
            AND i.status = 'submitted'
        )
      )
      OR (
        image_type = 'resolution'
        AND public.is_admin_for(university_id)
        AND EXISTS (
          SELECT 1
          FROM public.incidents AS i
          WHERE i.id = incident_images.incident_id
            AND i.university_id = incident_images.university_id
            AND i.status = 'resolved'
        )
      )
    )
  );

DROP POLICY IF EXISTS "incident_evidence_authenticated_upload"
  ON storage.objects;

CREATE POLICY "incident_evidence_authorized_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'incident-evidence'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
    AND EXISTS (
      SELECT 1
      FROM public.universities AS u
      WHERE u.id::TEXT = (storage.foldername(name))[1]
        AND (
          u.id = public.current_user_university_id()
          OR public.is_super_admin()
        )
    )
  );
