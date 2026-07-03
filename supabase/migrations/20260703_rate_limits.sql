-- App-level rate limiting buckets (fixed window per key).
-- Run in Supabase Dashboard → SQL Editor.

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