-- Run in Supabase Dashboard → SQL Editor (production + staging)

-- 1) Block self-promotion on profile insert
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND coalesce(role, '') <> 'admin'
    AND coalesce(verification_status, 'unverified') = 'unverified'
  );

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin_user() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'admin' THEN
      NEW.role := NULL;
    END IF;

    IF NEW.verification_status IS DISTINCT FROM 'unverified' THEN
      NEW.verification_status := 'unverified';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    NEW.verification_status := OLD.verification_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER protect_profile_privileged_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- 2) Users can submit and read their own verification requests; only admins can change status
DROP POLICY IF EXISTS verification_requests_own ON public.verification_requests;
DROP POLICY IF EXISTS verification_requests_select_own ON public.verification_requests;
DROP POLICY IF EXISTS verification_requests_insert_own ON public.verification_requests;
CREATE POLICY verification_requests_select_own ON public.verification_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY verification_requests_insert_own ON public.verification_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
  );

CREATE OR REPLACE FUNCTION public.protect_verification_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin_user() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status := OLD.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_verification_request_status ON public.verification_requests;
CREATE TRIGGER protect_verification_request_status
BEFORE INSERT OR UPDATE ON public.verification_requests
FOR EACH ROW
EXECUTE FUNCTION public.protect_verification_request_status();