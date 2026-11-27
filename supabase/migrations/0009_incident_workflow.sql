ALTER TABLE public.incidents
  DROP CONSTRAINT IF EXISTS incidents_status_check;

ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_status_check
  CHECK (
    status IN (
      'submitted',
      'under_review',
      'approved',
      'assigned',
      'in_progress',
      'resolved',
      'rejected',
      'reopened'
    )
  );

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
    COUNT(*) FILTER (WHERE i.status IN ('assigned', 'in_progress', 'reopened')),
    COUNT(*) FILTER (WHERE i.status = 'resolved'),
    COUNT(*) FILTER (WHERE i.is_flagged)
  FROM public.incidents AS i
  WHERE i.university_id = target_university_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admins_on_incident_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    university_id,
    incident_id,
    type,
    title,
    message,
    link
  )
  SELECT
    p.id,
    NEW.university_id,
    NEW.id,
    CASE WHEN NEW.severity = 'critical' THEN 'critical_incident' ELSE 'new_incident' END,
    CASE WHEN NEW.severity = 'critical' THEN 'Critical report submitted' ELSE 'New report submitted' END,
    'A new report "' || NEW.title || '" was submitted for ' || NEW.severity || ' priority review.',
    '/reports/' || NEW.id
  FROM public.profiles AS p
  WHERE p.is_active = TRUE
    AND p.id <> NEW.reporter_id
    AND (
      (p.role = 'campus_admin' AND p.university_id = NEW.university_id)
      OR p.role = 'super_admin'
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_incident_insert ON public.incidents;
CREATE TRIGGER trg_notify_admins_on_incident_insert
  AFTER INSERT ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_incident_insert();

CREATE OR REPLACE FUNCTION public.admin_update_incident_workflow(
  target_incident_id UUID,
  requested_status TEXT,
  resolution_text TEXT,
  requested_department_id UUID,
  requested_assignee_name TEXT,
  requested_assignment_notes TEXT,
  internal_note TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  target_incident public.incidents%ROWTYPE;
  active_assignment public.incident_assignments%ROWTYPE;
  assignment_changed BOOLEAN := FALSE;
  status_changed BOOLEAN := FALSE;
BEGIN
  IF target_incident_id IS NULL OR requested_status IS NULL THEN
    RAISE EXCEPTION 'Choose a report and status.'
      USING ERRCODE = '22023';
  END IF;

  SELECT i.*
  INTO target_incident
  FROM public.incidents AS i
  WHERE i.id = target_incident_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The report was not found or is outside your campus.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin_for(target_incident.university_id) THEN
    RAISE EXCEPTION 'The report was not found or is outside your campus.'
      USING ERRCODE = '42501';
  END IF;

  IF requested_status NOT IN (
    'submitted', 'under_review', 'approved', 'assigned',
    'in_progress', 'resolved', 'rejected', 'reopened'
  ) THEN
    RAISE EXCEPTION 'The requested report status is invalid.'
      USING ERRCODE = '22023';
  END IF;

  IF char_length(COALESCE(resolution_text, '')) > 2000
     OR char_length(COALESCE(requested_assignee_name, '')) > 120
     OR char_length(COALESCE(requested_assignment_notes, '')) > 500
     OR char_length(COALESCE(internal_note, '')) > 2000 THEN
    RAISE EXCEPTION 'One or more report update fields are too long.'
      USING ERRCODE = '22023';
  END IF;

  status_changed := requested_status IS DISTINCT FROM target_incident.status;
  IF status_changed AND NOT (
    (target_incident.status = 'submitted' AND requested_status IN ('under_review', 'rejected'))
    OR (target_incident.status = 'under_review' AND requested_status IN ('approved', 'rejected'))
    OR (target_incident.status = 'approved' AND requested_status IN ('assigned', 'rejected'))
    OR (target_incident.status = 'assigned' AND requested_status IN ('in_progress', 'rejected'))
    OR (target_incident.status = 'in_progress' AND requested_status IN ('assigned', 'resolved', 'rejected'))
    OR (target_incident.status IN ('resolved', 'rejected') AND requested_status = 'reopened')
    OR (target_incident.status = 'reopened' AND requested_status IN ('under_review', 'approved', 'rejected'))
  ) THEN
    RAISE EXCEPTION 'That status transition is not allowed.'
      USING ERRCODE = '22023';
  END IF;

  IF status_changed
     AND requested_status IN ('resolved', 'rejected', 'reopened')
     AND char_length(btrim(COALESCE(resolution_text, ''))) = 0 THEN
    RAISE EXCEPTION 'Add a resolution, rejection, or reopening reason.'
      USING ERRCODE = '22023';
  END IF;

  SELECT ia.*
  INTO active_assignment
  FROM public.incident_assignments AS ia
  WHERE ia.incident_id = target_incident_id
    AND ia.status = 'active'
  ORDER BY ia.assigned_at DESC
  LIMIT 1
  FOR UPDATE;

  IF requested_department_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.departments AS d
    WHERE d.id = requested_department_id
      AND d.university_id = target_incident.university_id
      AND d.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Choose an active department from the report campus.'
      USING ERRCODE = '22023';
  END IF;

  IF requested_status = 'assigned'
     AND requested_department_id IS NULL
     AND active_assignment.id IS NULL THEN
    RAISE EXCEPTION 'Choose a department before assigning this report.'
      USING ERRCODE = '22023';
  END IF;

  IF requested_department_id IS NOT NULL THEN
    IF active_assignment.id IS NOT NULL
       AND active_assignment.department_id IS DISTINCT FROM requested_department_id THEN
      UPDATE public.incident_assignments
      SET status = 'reassigned',
          completed_at = NOW()
      WHERE id = active_assignment.id;
      active_assignment.id := NULL;
      assignment_changed := TRUE;
    END IF;

    IF active_assignment.id IS NULL THEN
      INSERT INTO public.incident_assignments (
        incident_id,
        university_id,
        department_id,
        assigned_by,
        assigned_to_name,
        notes,
        status
      ) VALUES (
        target_incident_id,
        target_incident.university_id,
        requested_department_id,
        auth.uid(),
        NULLIF(btrim(COALESCE(requested_assignee_name, '')), ''),
        NULLIF(btrim(COALESCE(requested_assignment_notes, '')), ''),
        'active'
      );
      assignment_changed := TRUE;
    ELSIF active_assignment.department_id = requested_department_id THEN
      IF active_assignment.assigned_to_name IS DISTINCT FROM NULLIF(btrim(COALESCE(requested_assignee_name, '')), '')
         OR active_assignment.notes IS DISTINCT FROM NULLIF(btrim(COALESCE(requested_assignment_notes, '')), '') THEN
        assignment_changed := TRUE;
      END IF;

      UPDATE public.incident_assignments
      SET assigned_to_name = NULLIF(btrim(COALESCE(requested_assignee_name, '')), ''),
          notes = NULLIF(btrim(COALESCE(requested_assignment_notes, '')), '')
      WHERE id = active_assignment.id;
    END IF;
  END IF;

  IF status_changed THEN
    IF requested_status = 'resolved' THEN
      UPDATE public.incident_assignments
      SET status = 'completed',
          completed_at = NOW()
      WHERE incident_id = target_incident_id
        AND status = 'active';
    END IF;

    UPDATE public.incidents
    SET status = requested_status,
        rejection_reason = CASE
          WHEN requested_status = 'rejected' THEN btrim(resolution_text)
          WHEN requested_status = 'reopened' THEN rejection_reason
          ELSE NULL
        END,
        resolution_description = CASE
          WHEN requested_status = 'resolved' THEN btrim(resolution_text)
          ELSE resolution_description
        END,
        resolved_at = CASE
          WHEN requested_status = 'resolved' THEN NOW()
          ELSE resolved_at
        END,
        resolved_by = CASE
          WHEN requested_status = 'resolved' THEN auth.uid()
          ELSE resolved_by
        END
    WHERE id = target_incident_id;

    INSERT INTO public.incident_updates (
      incident_id,
      university_id,
      actor_id,
      actor_role,
      update_type,
      previous_status,
      new_status,
      title,
      message,
      is_internal
    ) VALUES (
      target_incident_id,
      target_incident.university_id,
      auth.uid(),
      public.current_user_role(),
      'status_change',
      target_incident.status,
      requested_status,
      CASE requested_status
        WHEN 'submitted' THEN 'Report marked pending'
        WHEN 'under_review' THEN 'Report is under review'
        WHEN 'approved' THEN 'Report verified'
        WHEN 'assigned' THEN 'Report assigned'
        WHEN 'in_progress' THEN 'Work is in progress'
        WHEN 'resolved' THEN 'Report resolved'
        WHEN 'rejected' THEN 'Report rejected'
        WHEN 'reopened' THEN 'Report reopened'
      END,
      COALESCE(
        NULLIF(btrim(COALESCE(resolution_text, '')), ''),
        'Campus administration updated the report status.'
      ),
      FALSE
    );
  END IF;

  IF assignment_changed THEN
    INSERT INTO public.incident_updates (
      incident_id,
      university_id,
      actor_id,
      actor_role,
      update_type,
      title,
      message,
      is_internal
    ) VALUES (
      target_incident_id,
      target_incident.university_id,
      auth.uid(),
      public.current_user_role(),
      'assignment',
      'Department assignment updated',
      'This report was assigned to a campus department.',
      FALSE
    );
  END IF;

  IF char_length(btrim(COALESCE(internal_note, ''))) > 0 THEN
    INSERT INTO public.incident_updates (
      incident_id,
      university_id,
      actor_id,
      actor_role,
      update_type,
      title,
      message,
      is_internal
    ) VALUES (
      target_incident_id,
      target_incident.university_id,
      auth.uid(),
      public.current_user_role(),
      'note',
      'Internal administrative note',
      btrim(internal_note),
      TRUE
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_campus_operations_metrics(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_campus_operations_metrics(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_update_incident_workflow(UUID, TEXT, TEXT, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_incident_workflow(UUID, TEXT, TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
