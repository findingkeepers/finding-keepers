-- Introduction workflow: interest_returned → active introduction, browse hiding, atomic activation.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS browse_visible boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS active_introduction_request_id uuid;

ALTER TABLE public.match_requests
ADD COLUMN IF NOT EXISTS interest_returned_at timestamptz,
ADD COLUMN IF NOT EXISTS activated_at timestamptz,
ADD COLUMN IF NOT EXISTS closed_at timestamptz,
ADD COLUMN IF NOT EXISTS closed_reason text;

UPDATE public.match_requests
SET status = 'interest_returned',
    interest_returned_at = COALESCE(interest_returned_at, created_at)
WHERE status = 'approved';

CREATE OR REPLACE FUNCTION public.short_id_to_user_id(p_short_id text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id
  FROM public.cvs
  WHERE short_id = p_short_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.activate_match_introduction(
  p_request_id uuid,
  p_activator_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.match_requests%ROWTYPE;
  v_activator_short_id text;
  v_male_user_id uuid;
  v_female_user_id uuid;
  v_withdrawn_count integer;
BEGIN
  SELECT *
  INTO v_request
  FROM public.match_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Match request not found');
  END IF;

  IF v_request.status IS DISTINCT FROM 'interest_returned' THEN
    RETURN jsonb_build_object(
      'ok',
      false,
      'message',
      'This interest is not ready to begin an introduction'
    );
  END IF;

  SELECT short_id
  INTO v_activator_short_id
  FROM public.cvs
  WHERE user_id = p_activator_user_id;

  IF v_activator_short_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Your profile was not found');
  END IF;

  IF v_request.requested_by_short_id IS DISTINCT FROM v_activator_short_id THEN
    RETURN jsonb_build_object(
      'ok',
      false,
      'message',
      'Only the member who sent the original interest can begin the introduction'
    );
  END IF;

  v_male_user_id := public.short_id_to_user_id(v_request.male_short_id);
  v_female_user_id := public.short_id_to_user_id(v_request.female_short_id);

  IF v_male_user_id IS NULL OR v_female_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Could not resolve both members');
  END IF;

  PERFORM 1
  FROM public.profiles
  WHERE id IN (v_male_user_id, v_female_user_id)
    AND active_introduction_request_id IS NOT NULL
  FOR UPDATE;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok',
      false,
      'message',
      'One of the members already has an active introduction'
    );
  END IF;

  UPDATE public.match_requests
  SET status = 'active',
      activated_at = now()
  WHERE id = p_request_id;

  UPDATE public.profiles
  SET browse_visible = false,
      active_introduction_request_id = p_request_id
  WHERE id IN (v_male_user_id, v_female_user_id);

  UPDATE public.match_requests
  SET status = 'withdrawn',
      closed_at = now(),
      closed_reason = 'other_introduction'
  WHERE id <> p_request_id
    AND status IN ('pending', 'interest_returned')
    AND (
      male_short_id IN (v_request.male_short_id, v_request.female_short_id)
      OR female_short_id IN (v_request.male_short_id, v_request.female_short_id)
    );

  GET DIAGNOSTICS v_withdrawn_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok',
    true,
    'withdrawn_count',
    v_withdrawn_count,
    'male_user_id',
    v_male_user_id,
    'female_user_id',
    v_female_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.end_match_introduction(
  p_request_id uuid,
  p_new_status text DEFAULT 'unmatched'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.match_requests%ROWTYPE;
  v_male_user_id uuid;
  v_female_user_id uuid;
BEGIN
  IF p_new_status NOT IN ('unmatched', 'completed') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Invalid end status');
  END IF;

  SELECT *
  INTO v_request
  FROM public.match_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Match request not found');
  END IF;

  IF v_request.status IS DISTINCT FROM 'active' THEN
    RETURN jsonb_build_object(
      'ok',
      false,
      'message',
      'Only active introductions can be ended'
    );
  END IF;

  v_male_user_id := public.short_id_to_user_id(v_request.male_short_id);
  v_female_user_id := public.short_id_to_user_id(v_request.female_short_id);

  UPDATE public.match_requests
  SET status = p_new_status,
      closed_at = now()
  WHERE id = p_request_id;

  UPDATE public.profiles
  SET browse_visible = true,
      active_introduction_request_id = NULL
  WHERE id IN (v_male_user_id, v_female_user_id)
    AND active_introduction_request_id = p_request_id;

  RETURN jsonb_build_object('ok', true, 'status', p_new_status);
END;
$$;

REVOKE ALL ON FUNCTION public.activate_match_introduction(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.end_match_introduction(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_match_introduction(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.end_match_introduction(uuid, text) TO service_role;

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
  target_verified text;
  target_browse_visible boolean;
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

  SELECT gender, verification_status, browse_visible
  INTO target_gender, target_verified, target_browse_visible
  FROM public.profiles
  WHERE id = cv_owner_id;

  IF target_verified IS DISTINCT FROM 'verified' THEN
    RETURN false;
  END IF;

  IF coalesce(target_browse_visible, true) = false THEN
    RETURN false;
  END IF;

  IF public.is_admin_user() THEN
    RETURN true;
  END IF;

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