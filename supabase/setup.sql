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

-- 7) Auth rate limiting (service role only)
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  bucket_key text PRIMARY KEY,
  attempt_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

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
  WITH CHECK (auth.uid() = id);

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
CREATE POLICY verification_requests_own ON public.verification_requests
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

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
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- 10) Phone check: server-only (no public enumeration)
REVOKE EXECUTE ON FUNCTION public.check_phone_available(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_phone_available(text) FROM authenticated;

-- 11) Browse-safe CV access (verified viewer, opposite gender, verified target)
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
  normalized_cv_gender text;
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

  normalized_cv_gender := lower(trim(coalesce(cv_gender, '')));

  IF lower(trim(coalesce(viewer_gender, ''))) = 'male'
     AND normalized_cv_gender <> 'female' THEN
    RETURN false;
  END IF;

  IF lower(trim(coalesce(viewer_gender, ''))) = 'female'
     AND normalized_cv_gender <> 'male' THEN
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
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

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
CREATE POLICY "Public read profile photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'profile-photos');