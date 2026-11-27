CREATE OR REPLACE FUNCTION public.get_super_admin_dashboard_data()
RETURNS TABLE (
  registered_universities BIGINT,
  active_universities BIGINT,
  platform_accounts BIGINT,
  total_incidents BIGINT,
  reports_needing_review BIGINT,
  resolved_incidents BIGINT,
  flagged_incidents BIGINT,
  latest_reports JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Super administrator access required.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH university_counts AS (
    SELECT
      COUNT(*) AS registered,
      COUNT(*) FILTER (WHERE is_active) AS active
    FROM public.universities
  ),
  profile_counts AS (
    SELECT COUNT(*) AS total
    FROM public.profiles
  ),
  incident_counts AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status IN ('submitted', 'under_review')) AS needs_review,
      COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
      COUNT(*) FILTER (WHERE is_flagged) AS flagged
    FROM public.incidents
  ),
  recent AS (
    SELECT COALESCE(
      jsonb_agg(to_jsonb(report) ORDER BY report.created_at DESC),
      '[]'::JSONB
    ) AS reports
    FROM (
      SELECT
        i.id,
        i.reference_code,
        i.title,
        i.status,
        i.severity,
        i.created_at,
        u.name AS university_name
      FROM public.incidents AS i
      JOIN public.universities AS u ON u.id = i.university_id
      ORDER BY i.created_at DESC
      LIMIT 8
    ) AS report
  )
  SELECT
    university_counts.registered,
    university_counts.active,
    profile_counts.total,
    incident_counts.total,
    incident_counts.needs_review,
    incident_counts.resolved,
    incident_counts.flagged,
    recent.reports
  FROM university_counts
  CROSS JOIN profile_counts
  CROSS JOIN incident_counts
  CROSS JOIN recent;
END;
$$;

REVOKE ALL ON FUNCTION public.get_super_admin_dashboard_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_super_admin_dashboard_data() TO authenticated;
