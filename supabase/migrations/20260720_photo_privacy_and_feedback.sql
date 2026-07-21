-- Profile photo privacy (blur variants) + verification profile photo + platform feedback.

ALTER TABLE public.verification_requests
ADD COLUMN IF NOT EXISTS profile_photo_path text,
ADD COLUMN IF NOT EXISTS profile_photo_blur_path text;

ALTER TABLE public.cvs
ADD COLUMN IF NOT EXISTS photo_blur_url text;

CREATE TABLE IF NOT EXISTS public.platform_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  rating integer CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  category text,
  message text NOT NULL,
  source text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_feedback_insert_own ON public.platform_feedback;
CREATE POLICY platform_feedback_insert_own ON public.platform_feedback
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS platform_feedback_select_admin ON public.platform_feedback;
CREATE POLICY platform_feedback_select_admin ON public.platform_feedback
  FOR SELECT TO authenticated
  USING (public.is_admin_user());

-- Only owners and admins may read profile-photos via storage RLS.
-- Browse/match photo access is mediated by the app using the service role after checks.
CREATE OR REPLACE FUNCTION public.viewer_can_read_profile_photo(photo_owner_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.viewer_can_read_profile_photo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.viewer_can_read_profile_photo(uuid) TO authenticated;