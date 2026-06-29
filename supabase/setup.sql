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