-- =============================================================================
-- CAMPUSFIX: Storage Bucket Policies & Initial Institutional Seed
-- Migration: 0003_storage_and_seed.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Supabase Storage Bucket: incident-evidence
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'incident-evidence',
  'incident-evidence',
  FALSE,
  5242880, -- 5 MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS Policies (object path format: {university_id}/{user_id}/{filename})
CREATE POLICY "incident_evidence_authenticated_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'incident-evidence'
    AND (
      public.is_super_admin()
      OR (storage.foldername(name))[1] = public.current_user_university_id()::TEXT
    )
  );

CREATE POLICY "incident_evidence_authenticated_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'incident-evidence'
    AND (storage.foldername(name))[1] = public.current_user_university_id()::TEXT
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
  );

CREATE POLICY "incident_evidence_delete_own_or_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'incident-evidence'
    AND (
      public.is_super_admin()
      OR (
        (storage.foldername(name))[1] = public.current_user_university_id()::TEXT
        AND (
          (storage.foldername(name))[2] = auth.uid()::TEXT
          OR public.is_campus_admin_for(public.current_user_university_id())
        )
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 2. Initial University Seed: University of Ilesa, Nigeria
-- Note: Coordinates are intentionally omitted (NULL / map_configured = FALSE)
-- so campus administrators configure verified campus coordinates themselves.
-- -----------------------------------------------------------------------------
INSERT INTO public.universities (
  id, name, short_name, slug, country, state, city, email_domain, is_active
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  'University of Ilesa',
  'UNILESA',
  'unilesa',
  'Nigeria',
  'Osun',
  'Ilesa',
  'unilesa.edu.ng',
  TRUE
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.campus_settings (
  university_id,
  require_matric_number,
  allowed_email_domains,
  auto_approve_reports,
  allow_public_comments,
  duplicate_distance_meters,
  duplicate_time_window_hours,
  map_center_lat,
  map_center_lng,
  map_default_zoom,
  map_configured
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  FALSE,
  ARRAY[]::TEXT[],
  FALSE,
  TRUE,
  75,
  72,
  NULL,
  NULL,
  16,
  FALSE
)
ON CONFLICT (university_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. Default Campus Departments (configurable per university)
-- -----------------------------------------------------------------------------
INSERT INTO public.departments (id, university_id, name, slug, description)
VALUES
  ('20000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Works and Maintenance', 'works-and-maintenance', 'Civil works, buildings, furniture, roads, drainage, and structural repairs.'),
  ('20000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Electrical Services', 'electrical-services', 'Power supply, lighting, wiring, generators, and electrical fixtures.'),
  ('20000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Water and Sanitation', 'water-and-sanitation', 'Water supply, plumbing, toilets, waste disposal, and campus hygiene.'),
  ('20000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'Hostel Management', 'hostel-management', 'Student residential halls, hostel utilities, and accommodation facilities.'),
  ('20000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'Security', 'security', 'Campus safety, perimeter lighting, access control, and hazard response.'),
  ('20000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'ICT', 'ict', 'Campus internet, Wi-Fi access points, network ports, and digital infrastructure.'),
  ('20000000-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'General Administration', 'general-administration', 'General campus operations, laboratory coordination, and cross-unit escalations.')
ON CONFLICT (university_id, slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. Default Incident Categories (12 core categories)
-- -----------------------------------------------------------------------------
INSERT INTO public.incident_categories (
  university_id, name, slug, description, icon_name, default_department_id, sort_order
)
SELECT
  NULL,
  v.name,
  v.slug,
  v.description,
  v.icon_name,
  v.default_department_id,
  v.sort_order
FROM (
  VALUES
    ('Electricity', 'electricity', 'Power outages, exposed wiring, broken switches, or faulty lighting.', 'zap', '20000000-0000-4000-8000-000000000002'::UUID, 1),
    ('Water Supply', 'water-supply', 'Dry taps, burst pipes, leaking tanks, or contaminated water points.', 'droplets', '20000000-0000-4000-8000-000000000003'::UUID, 2),
    ('Roads and Walkways', 'roads-and-walkways', 'Potholes, broken pavements, collapsed walkways, or unsafe paths.', 'route', '20000000-0000-4000-8000-000000000001'::UUID, 3),
    ('Drainage and Flooding', 'drainage-and-flooding', 'Blocked gutters, overflowing drains, or campus flooding.', 'cloud-rain', '20000000-0000-4000-8000-000000000001'::UUID, 4),
    ('Classroom Facilities', 'classroom-facilities', 'Broken desks, chairs, doors, windows, boards, or ventilation.', 'armchair', '20000000-0000-4000-8000-000000000001'::UUID, 5),
    ('Laboratory Equipment', 'laboratory-equipment', 'Damaged lab apparatus, benches, fume hoods, or safety gear.', 'flask-conical', '20000000-0000-4000-8000-000000000007'::UUID, 6),
    ('Toilets and Sanitation', 'toilets-and-sanitation', 'Unmaintained restrooms, broken cisterns, or sanitation hazards.', 'sparkles', '20000000-0000-4000-8000-000000000003'::UUID, 7),
    ('Security and Safety', 'security-and-safety', 'Dark zones, broken gates, structural hazards, or safety risks.', 'shield-alert', '20000000-0000-4000-8000-000000000005'::UUID, 8),
    ('Waste Management', 'waste-management', 'Overflowing bins, uncollected refuse, or illegal dumping spots.', 'trash-2', '20000000-0000-4000-8000-000000000003'::UUID, 9),
    ('Internet and Connectivity', 'internet-and-connectivity', 'Dead Wi-Fi zones, damaged network ports, or campus ISP outages.', 'wifi', '20000000-0000-4000-8000-000000000006'::UUID, 10),
    ('Hostel Facilities', 'hostel-facilities', 'Residential hall maintenance, beds, plumbing, or power issues.', 'building-2', '20000000-0000-4000-8000-000000000004'::UUID, 11),
    ('Other', 'other', 'Other campus infrastructure or public facility issues.', 'circle-alert', '20000000-0000-4000-8000-000000000007'::UUID, 12)
) AS v(name, slug, description, icon_name, default_department_id, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.incident_categories ic
  WHERE ic.university_id IS NULL AND ic.slug = v.slug
);
