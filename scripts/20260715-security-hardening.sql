-- Apply after the existing booking, presale, and review migrations.
-- All privileged functions are callable by the server service_role only.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  bucket TEXT NOT NULL,
  subject_hash TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, subject_hash, window_started_at)
);
REVOKE ALL ON TABLE public.api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.api_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_bucket TEXT, p_subject_hash TEXT, p_limit INTEGER, p_window_seconds INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_window TIMESTAMPTZ := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  v_attempts INTEGER;
BEGIN
  IF p_bucket IS NULL OR p_subject_hash IS NULL OR p_limit < 1 OR p_window_seconds < 1 THEN RETURN FALSE; END IF;
  INSERT INTO public.api_rate_limits(bucket, subject_hash, window_started_at, attempts)
  VALUES (p_bucket, p_subject_hash, v_window, 1)
  ON CONFLICT (bucket, subject_hash, window_started_at)
  DO UPDATE SET attempts = public.api_rate_limits.attempts + 1
  RETURNING attempts INTO v_attempts;
  DELETE FROM public.api_rate_limits WHERE window_started_at < now() - interval '1 day';
  RETURN v_attempts <= p_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS deletion_token_hash TEXT;

CREATE OR REPLACE FUNCTION public.create_review(
  p_musical_id TEXT, p_user_name TEXT, p_deletion_token TEXT,
  p_content TEXT, p_rating INTEGER, p_image_url TEXT DEFAULT NULL
) RETURNS TABLE (id BIGINT, musical_id TEXT, user_name TEXT, content TEXT, image_url TEXT, rating INTEGER, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  IF length(p_deletion_token) < 32 THEN RAISE EXCEPTION 'deletion token is too short'; END IF;
  RETURN QUERY INSERT INTO public.reviews (musical_id, user_name, deletion_token_hash, content, rating, image_url)
  VALUES (p_musical_id, p_user_name, extensions.crypt(p_deletion_token, extensions.gen_salt('bf')), p_content, p_rating, p_image_url)
  RETURNING reviews.id, reviews.musical_id, reviews.user_name, reviews.content, reviews.image_url, reviews.rating, reviews.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_review_with_token(p_review_id BIGINT, p_deletion_token TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  DELETE FROM public.reviews
  WHERE id = p_review_id AND deletion_token_hash = extensions.crypt(p_deletion_token, deletion_token_hash);
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.create_review(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_review_with_token(BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_review(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_review_with_token(BIGINT, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.delete_review_with_password(BIGINT, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.book_musical_seats(
  p_musical_id TEXT, p_name TEXT, p_student_id TEXT, p_seat_grade TEXT,
  p_selected_seats TEXT[], p_special_request TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_table TEXT; v_seat TEXT; v_conflicts TEXT[]; v_id BIGINT; v_date TIMESTAMPTZ;
BEGIN
  v_table := CASE p_musical_id WHEN 'dead-poets-society' THEN 'dead_poets_society_bookings' WHEN 'rent' THEN 'rent_bookings' WHEN 'toctoc' THEN 'toctoc_bookings' ELSE NULL END;
  IF v_table IS NULL OR p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 100 OR p_student_id !~ '^[A-Za-z0-9_-]{1,20}$' OR p_selected_seats IS NULL OR cardinality(p_selected_seats) NOT BETWEEN 1 AND 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid booking input.');
  END IF;
  IF (SELECT count(*) FROM unnest(p_selected_seats) s) <> (SELECT count(DISTINCT s) FROM unnest(p_selected_seats) s) THEN RETURN jsonb_build_object('success', false, 'error', 'Duplicate seats.'); END IF;
  FOREACH v_seat IN ARRAY p_selected_seats LOOP
    IF NOT ((p_seat_grade = 'VIP' AND v_seat ~ '^F1-VIP-R(0[1-9])-(L|R)0[1-6]$' OR p_seat_grade = 'VIP' AND v_seat ~ '^F1-VIP-R(0[1-9])-C(0[1-9]|1[0-2])$') OR (p_seat_grade IN ('R', 'R석') AND v_seat ~ '^F1-R-R(0[1-8])-(L|R)0[1-6]$' OR p_seat_grade IN ('R', 'R석') AND v_seat ~ '^F1-R-R(0[1-8])-C(0[1-9]|1[0-2])$') OR (p_seat_grade IN ('S', 'S석') AND v_seat ~ '^F2-S-R(0[1-8])-(L|R)0[1-6]$' OR p_seat_grade IN ('S', 'S석') AND v_seat ~ '^F2-S-R(0[1-8])-C(0[1-9]|1[0-2])$')) THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid seat for grade.'); END IF;
  END LOOP;
  EXECUTE format('LOCK TABLE %I IN EXCLUSIVE MODE', v_table);
  EXECUTE format('SELECT ARRAY(SELECT unnest(selected_seats) FROM %I WHERE status = ''confirmed'' AND selected_seats && $1)', v_table) INTO v_conflicts USING p_selected_seats;
  IF cardinality(v_conflicts) > 0 THEN RETURN jsonb_build_object('success', false, 'conflictSeats', v_conflicts); END IF;
  EXECUTE format('INSERT INTO %I (name, student_id, seat_grade, selected_seats, special_request, status) VALUES ($1,$2,$3,$4,$5,''confirmed'') RETURNING id, booking_date', v_table) INTO v_id, v_date USING btrim(p_name), p_student_id, p_seat_grade, p_selected_seats, NULLIF(btrim(p_special_request), '');
  RETURN jsonb_build_object('success', true, 'bookingId', v_id, 'bookingDate', v_date);
END;
$$;
REVOKE ALL ON FUNCTION public.book_musical_seats(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_musical_seats(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT) TO service_role;

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['dead_poets_society_bookings','rent_bookings','toctoc_bookings','arte_musical_tickets'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
  END LOOP;
END $$;
