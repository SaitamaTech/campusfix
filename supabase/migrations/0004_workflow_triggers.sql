-- CampusFix workflow counters and notifications

CREATE OR REPLACE FUNCTION public.refresh_incident_verification_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_incident_id UUID;
  total_confirmations INTEGER;
  fixed_count INTEGER;
BEGIN
  target_incident_id := COALESCE(NEW.incident_id, OLD.incident_id);

  SELECT COUNT(*) INTO total_confirmations
  FROM public.incident_verifications
  WHERE incident_id = target_incident_id;

  SELECT COUNT(*) INTO fixed_count
  FROM public.incident_verifications
  WHERE incident_id = target_incident_id
    AND verification_type = 'appears_fixed';

  UPDATE public.incidents
  SET
    verification_count = total_confirmations,
    fixed_report_count = fixed_count,
    confidence_score = LEAST(
      100,
      15 + (total_confirmations * 8) + (fixed_count * 5)
    )
  WHERE id = target_incident_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_verification_counters ON public.incident_verifications;
CREATE TRIGGER trg_refresh_verification_counters
  AFTER INSERT OR UPDATE OR DELETE ON public.incident_verifications
  FOR EACH ROW EXECUTE FUNCTION public.refresh_incident_verification_counters();

CREATE OR REPLACE FUNCTION public.refresh_incident_flag_counters()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_incident_id UUID;
  total_flags INTEGER;
BEGIN
  target_incident_id := COALESCE(NEW.incident_id, OLD.incident_id);

  SELECT COUNT(*) INTO total_flags
  FROM public.incident_flags
  WHERE incident_id = target_incident_id;

  UPDATE public.incidents
  SET
    flag_count = total_flags,
    is_flagged = total_flags >= 3
  WHERE id = target_incident_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_flag_counters ON public.incident_flags;
CREATE TRIGGER trg_refresh_flag_counters
  AFTER INSERT OR UPDATE OR DELETE ON public.incident_flags
  FOR EACH ROW EXECUTE FUNCTION public.refresh_incident_flag_counters();

CREATE OR REPLACE FUNCTION public.notify_incident_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (
      user_id, university_id, incident_id, type, title, message, link
    ) VALUES (
      NEW.reporter_id,
      NEW.university_id,
      NEW.id,
      'incident_status',
      'Report status updated',
      'Your report "' || NEW.title || '" is now ' || replace(NEW.status, '_', ' ') || '.',
      '/reports/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_incident_status_change ON public.incidents;
CREATE TRIGGER trg_notify_incident_status_change
  AFTER UPDATE OF status ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.notify_incident_status_change();
