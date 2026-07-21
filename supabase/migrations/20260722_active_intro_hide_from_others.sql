-- Active introductions hide both profiles from everyone else.
-- App-layer still limits each party to browsing only their active partner.

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

  -- Hide both from the rest of browse; app still lets them view only each other.
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

CREATE OR REPLACE FUNCTION public.admin_activate_match_introduction(
  p_request_id uuid
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

  IF v_request.status NOT IN ('pending', 'interest_returned', 'approved') THEN
    RETURN jsonb_build_object(
      'ok',
      false,
      'message',
      'This match cannot be activated from its current status'
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
      activated_at = now(),
      interest_returned_at = COALESCE(interest_returned_at, now())
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
    AND status IN ('pending', 'interest_returned', 'approved')
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

-- Re-hide anyone already in an active introduction (undo previous unhide).
UPDATE public.profiles
SET browse_visible = false
WHERE active_introduction_request_id IS NOT NULL;