-- Use profiles.gender as the source of truth for browse access and keep CV data in sync.

CREATE OR REPLACE FUNCTION public.profile_gender_to_cv_gender(profile_gender text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(coalesce(profile_gender, '')))
    WHEN 'male' THEN 'Male'
    WHEN 'female' THEN 'Female'
    ELSE ''
  END;
$$;

CREATE OR REPLACE FUNCTION public.sync_cv_gender_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cv_gender text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.gender IS DISTINCT FROM OLD.gender THEN
    cv_gender := public.profile_gender_to_cv_gender(NEW.gender);

    IF cv_gender <> '' THEN
      UPDATE public.cvs
      SET data = jsonb_set(
        COALESCE(data, '{}'::jsonb),
        '{gender}',
        to_jsonb(cv_gender),
        true
      )
      WHERE user_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_cv_gender_from_profile ON public.profiles;
CREATE TRIGGER sync_cv_gender_from_profile
AFTER UPDATE OF gender ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_cv_gender_from_profile();

UPDATE public.cvs AS cv
SET data = jsonb_set(
  COALESCE(cv.data, '{}'::jsonb),
  '{gender}',
  to_jsonb(public.profile_gender_to_cv_gender(p.gender)),
  true
)
FROM public.profiles AS p
WHERE p.id = cv.user_id
  AND public.profile_gender_to_cv_gender(p.gender) <> '';

CREATE OR REPLACE FUNCTION public.viewer_can_browse_cv(
  cv_owner_id uuid,
  cv_gender text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_gender text;
  viewer_verified text;
  target_gender text;
  normalized_target_gender text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF cv_owner_id = auth.uid() THEN
    RETURN true;
  END IF;

  SELECT gender, verification_status
  INTO viewer_gender, viewer_verified
  FROM public.profiles
  WHERE id = auth.uid();

  IF viewer_verified IS DISTINCT FROM 'verified' THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles target
    WHERE target.id = cv_owner_id
      AND target.verification_status = 'verified'
  ) THEN
    RETURN false;
  END IF;

  IF public.is_admin_user() THEN
    RETURN true;
  END IF;

  SELECT gender
  INTO target_gender
  FROM public.profiles
  WHERE id = cv_owner_id;

  normalized_target_gender := lower(trim(coalesce(target_gender, '')));

  IF lower(trim(coalesce(viewer_gender, ''))) = 'male'
     AND normalized_target_gender <> 'female' THEN
    RETURN false;
  END IF;

  IF lower(trim(coalesce(viewer_gender, ''))) = 'female'
     AND normalized_target_gender <> 'male' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;