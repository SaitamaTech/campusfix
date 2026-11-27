CREATE INDEX IF NOT EXISTS idx_incidents_university_created_at
  ON public.incidents (university_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_student_dashboard_metrics()
RETURNS TABLE (
  total_campus_reports BIGINT,
  resolved_reports BIGINT,
  under_review_reports BIGINT,
  awaiting_action_reports BIGINT,
  high_priority_count BIGINT,
  my_reports_count BIGINT,
  recent_reports JSONB
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH campus AS (
    SELECT public.current_user_university_id() AS university_id
  ),
  campus_counts AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE i.status = 'resolved') AS resolved,
      COUNT(*) FILTER (WHERE i.status = 'under_review') AS under_review,
      COUNT(*) FILTER (WHERE i.status IN ('submitted', 'approved', 'assigned')) AS awaiting_action,
      COUNT(*) FILTER (
        WHERE i.severity IN ('high', 'critical')
          AND i.status NOT IN ('resolved', 'rejected')
      ) AS high_priority
    FROM public.incidents AS i
    CROSS JOIN campus AS c
    WHERE i.university_id = c.university_id
  ),
  my_reports AS (
    SELECT COUNT(*) AS total
    FROM public.incidents
    WHERE reporter_id = auth.uid()
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
        i.created_at
      FROM public.incidents AS i
      CROSS JOIN campus AS c
      WHERE i.university_id = c.university_id
      ORDER BY i.created_at DESC
      LIMIT 5
    ) AS report
  )
  SELECT
    campus_counts.total,
    campus_counts.resolved,
    campus_counts.under_review,
    campus_counts.awaiting_action,
    campus_counts.high_priority,
    my_reports.total,
    recent.reports
  FROM campus_counts
  CROSS JOIN my_reports
  CROSS JOIN recent;
$$;

REVOKE ALL ON FUNCTION public.get_student_dashboard_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_dashboard_metrics() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_campus_admin_dashboard_metrics()
RETURNS TABLE (
  total_reports BIGINT,
  pending_reports BIGINT,
  in_progress_reports BIGINT,
  resolved_reports BIGINT,
  flagged_reports BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH campus AS (
    SELECT public.current_user_university_id() AS university_id
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE i.status IN ('submitted', 'under_review')),
    COUNT(*) FILTER (WHERE i.status IN ('assigned', 'in_progress')),
    COUNT(*) FILTER (WHERE i.status = 'resolved'),
    COUNT(*) FILTER (WHERE i.is_flagged)
  FROM public.incidents AS i
  CROSS JOIN campus AS c
  WHERE i.university_id = c.university_id;
$$;

REVOKE ALL ON FUNCTION public.get_campus_admin_dashboard_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_campus_admin_dashboard_metrics() TO authenticated;
