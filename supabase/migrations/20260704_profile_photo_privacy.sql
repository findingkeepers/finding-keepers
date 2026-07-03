-- Restrict profile photo reads to owners, admins, and verified opposite-gender browse viewers.

UPDATE storage.buckets
SET public = false
WHERE id = 'profile-photos';

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

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