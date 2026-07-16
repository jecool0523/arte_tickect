-- Restores the RPC required by the server-side booking/review rate limiter.
-- Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  bucket TEXT NOT NULL,
  subject_hash TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, subject_hash, window_started_at)
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.api_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_bucket TEXT,
  p_subject_hash TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window TIMESTAMPTZ := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );
  v_attempts INTEGER;
BEGIN
  IF p_bucket IS NULL OR p_subject_hash IS NULL OR p_limit < 1 OR p_window_seconds < 1 THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.api_rate_limits(bucket, subject_hash, window_started_at, attempts)
  VALUES (p_bucket, p_subject_hash, v_window, 1)
  ON CONFLICT (bucket, subject_hash, window_started_at)
  DO UPDATE SET attempts = public.api_rate_limits.attempts + 1
  RETURNING attempts INTO v_attempts;

  DELETE FROM public.api_rate_limits
  WHERE window_started_at < now() - interval '1 day';

  RETURN v_attempts <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER)
  TO service_role;
