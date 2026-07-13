-- Run this in Supabase Dashboard → SQL Editor

-- 1) Phone uniqueness helper (normalized digits)
CREATE OR REPLACE FUNCTION public.check_phone_available(phone_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
BEGIN
  normalized := regexp_replace(coalesce(phone_input, ''), '[^0-9+]', '', 'g');
  IF normalized = '' THEN
    RETURN false;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE regexp_replace(coalesce(phone, ''), '[^0-9+]', '', 'g') = normalized
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_phone_available(text) TO anon, authenticated;

-- 2) Optional: block duplicate pending verification requests at DB level
CREATE UNIQUE INDEX IF NOT EXISTS verification_requests_one_pending_per_user
ON public.verification_requests (user_id)
WHERE status = 'pending';

-- 3) Track who initiated each match request (for direction arrows in admin/user UI)
ALTER TABLE public.match_requests
ADD COLUMN IF NOT EXISTS requested_by_short_id text;

-- 4) Allow authenticated users to read match requests they are part of
-- Updates are handled server-side via service role in /api/match/respond

-- 5) Permanent resident flag on profiles (set at registration)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_permanent_resident boolean;

-- 5b) Date of birth on profiles (set at registration; minimum age enforced in app)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth date;

-- 6) Extra verification fields for non-permanent residents
ALTER TABLE public.verification_requests
ADD COLUMN IF NOT EXISTS years_in_hk text,
ADD COLUMN IF NOT EXISTS years_in_hk_other text,
ADD COLUMN IF NOT EXISTS visa_type text,
ADD COLUMN IF NOT EXISTS visa_type_other text,
ADD COLUMN IF NOT EXISTS visa_document_path text,
ADD COLUMN IF NOT EXISTS referral_name text,
ADD COLUMN IF NOT EXISTS referral_phone text,
ADD COLUMN IF NOT EXISTS referral_email text,
ADD COLUMN IF NOT EXISTS referral_hkid text;

-- 7) Remove legacy custom auth rate-limit table
DROP TABLE IF EXISTS public.auth_rate_limits;

-- 7b) App-level rate limiting (see supabase/migrations/20260703_rate_limits.sql)
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key text PRIMARY KEY,
  request_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  window_seconds integer NOT NULL
);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_bucket_key text,
  p_max_requests integer,
  p_window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_window_start timestamptz;
  v_window_seconds integer;
  v_window_end timestamptz;
  v_retry_after integer;
  v_attempt integer;
BEGIN
  IF p_bucket_key IS NULL OR btrim(p_bucket_key) = '' THEN
    RETURN jsonb_build_object('allowed', false, 'retry_after_seconds', 60);
  END IF;

  IF p_max_requests IS NULL OR p_max_requests < 1 THEN
    RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
  END IF;

  IF p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
  END IF;

  FOR v_attempt IN 1..5 LOOP
    BEGIN
      SELECT request_count, window_start, window_seconds
        INTO v_count, v_window_start, v_window_seconds
        FROM rate_limit_buckets
        WHERE bucket_key = p_bucket_key
        FOR UPDATE;

      IF NOT FOUND THEN
        INSERT INTO rate_limit_buckets (
          bucket_key,
          request_count,
          window_start,
          window_seconds
        )
        VALUES (p_bucket_key, 1, v_now, p_window_seconds);
        RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
      END IF;

      v_window_end := v_window_start + make_interval(secs => v_window_seconds);

      IF v_now >= v_window_end THEN
        UPDATE rate_limit_buckets
        SET
          request_count = 1,
          window_start = v_now,
          window_seconds = p_window_seconds
        WHERE bucket_key = p_bucket_key;
        RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
      END IF;

      IF v_count >= p_max_requests THEN
        v_retry_after := GREATEST(
          1,
          ceil(extract(epoch FROM (v_window_end - v_now)))::integer
        );
        RETURN jsonb_build_object(
          'allowed',
          false,
          'retry_after_seconds',
          v_retry_after
        );
      END IF;

      UPDATE rate_limit_buckets
      SET request_count = v_count + 1
      WHERE bucket_key = p_bucket_key;

      RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
    EXCEPTION
      WHEN unique_violation THEN
        NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

-- 8) Row Level Security policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_select_verified_members ON public.profiles;
CREATE POLICY profiles_select_verified_members ON public.profiles
  FOR SELECT TO authenticated
  USING (verification_status = 'verified');

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND coalesce(role, '') <> 'admin'
    AND coalesce(verification_status, 'unverified') = 'unverified'
  );

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid() AND admin_profile.role = 'admin'
    )
  );

ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cvs_select_verified_users ON public.cvs;
CREATE POLICY cvs_select_verified_users ON public.cvs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid() AND viewer.verification_status = 'verified'
    )
  );

DROP POLICY IF EXISTS cvs_manage_own ON public.cvs;
CREATE POLICY cvs_manage_own ON public.cvs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cvs_admin_all ON public.cvs;
CREATE POLICY cvs_admin_all ON public.cvs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid() AND admin_profile.role = 'admin'
    )
  );

ALTER TABLE public.match_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS match_requests_select_participant ON public.match_requests;
CREATE POLICY match_requests_select_participant ON public.match_requests
  FOR SELECT TO authenticated
  USING (
    male_short_id IN (SELECT short_id FROM public.cvs WHERE user_id = auth.uid())
    OR female_short_id IN (SELECT short_id FROM public.cvs WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS match_requests_insert_requester ON public.match_requests;
CREATE POLICY match_requests_insert_requester ON public.match_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by_short_id IN (SELECT short_id FROM public.cvs WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS match_requests_admin_all ON public.match_requests;
CREATE POLICY match_requests_admin_all ON public.match_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid() AND admin_profile.role = 'admin'
    )
  );

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS verification_requests_admin_all ON public.verification_requests;
CREATE POLICY verification_requests_admin_all ON public.verification_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid() AND admin_profile.role = 'admin'
    )
  );

-- match_requests status values include: pending, approved, contacted, completed, rejected, expired

-- 9) Block privilege escalation on profiles (role / verification_status)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

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

-- 10) Phone check: server-only (no public enumeration)
REVOKE EXECUTE ON FUNCTION public.check_phone_available(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_phone_available(text) FROM authenticated;

-- 11) Browse-safe CV access (verified viewer, opposite gender, verified target)
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

DROP POLICY IF EXISTS cvs_select_verified_users ON public.cvs;
DROP POLICY IF EXISTS cvs_select_browse ON public.cvs;
CREATE POLICY cvs_select_browse ON public.cvs
  FOR SELECT TO authenticated
  USING (
    public.viewer_can_browse_cv(
      user_id,
      COALESCE(data->>'gender', '')
    )
  );

DROP POLICY IF EXISTS profiles_select_verified_members ON public.profiles;
CREATE POLICY profiles_select_verified_members ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin_user()
  );

DROP POLICY IF EXISTS match_requests_insert_requester ON public.match_requests;
CREATE POLICY match_requests_insert_requester ON public.match_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by_short_id IN (
      SELECT short_id FROM public.cvs WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.profiles requester
      WHERE requester.id = auth.uid()
        AND requester.verification_status = 'verified'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS cvs_short_id_unique ON public.cvs (short_id);

-- 12) Private verification storage + scoped profile photos
UPDATE storage.buckets
SET public = false
WHERE id = 'verifications';

INSERT INTO storage.buckets (id, name, public)
VALUES ('verifications', 'verifications', false)
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

UPDATE storage.buckets
SET public = false
WHERE id = 'profile-photos';

CREATE OR REPLACE FUNCTION public.viewer_can_read_profile_photo(photo_owner_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cv_gender text;
BEGIN
  IF photo_owner_id IS NULL THEN
    RETURN false;
  END IF;

  IF photo_owner_id = auth.uid() THEN
    RETURN true;
  END IF;

  IF public.is_admin_user() THEN
    RETURN true;
  END IF;

  SELECT COALESCE(data->>'gender', '')
  INTO cv_gender
  FROM public.cvs
  WHERE user_id = photo_owner_id
  LIMIT 1;

  RETURN public.viewer_can_browse_cv(photo_owner_id, cv_gender);
END;
$$;

REVOKE ALL ON FUNCTION public.viewer_can_read_profile_photo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.viewer_can_read_profile_photo(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users upload own verification docs" ON storage.objects;
CREATE POLICY "Users upload own verification docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'verifications'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users read own verification docs" ON storage.objects;
CREATE POLICY "Users read own verification docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'verifications'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Admins read verification docs" ON storage.objects;
CREATE POLICY "Admins read verification docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'verifications'
  AND public.is_admin_user()
);

DROP POLICY IF EXISTS "Users upload own profile photos" ON storage.objects;
CREATE POLICY "Users upload own profile photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users update own profile photos" ON storage.objects;
CREATE POLICY "Users update own profile photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users delete own profile photos" ON storage.objects;
CREATE POLICY "Users delete own profile photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Public read profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users read own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Verified users read browsable profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Scoped read profile photos" ON storage.objects;
CREATE POLICY "Scoped read profile photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND public.viewer_can_read_profile_photo(
    CASE
      WHEN (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
      THEN ((storage.foldername(name))[1])::uuid
      ELSE NULL
    END
  )
);