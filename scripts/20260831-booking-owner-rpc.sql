-- Require a verified OAuth user for every new booking and persist ownership.

DROP FUNCTION IF EXISTS public.book_musical_seats(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT);

CREATE FUNCTION public.book_musical_seats(
  p_musical_id TEXT,
  p_name TEXT,
  p_student_id TEXT,
  p_seat_grade TEXT,
  p_selected_seats TEXT[],
  p_special_request TEXT,
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_table TEXT;
  v_seat TEXT;
  v_conflicts TEXT[];
  v_id BIGINT;
  v_date TIMESTAMPTZ;
BEGIN
  v_table := CASE p_musical_id
    WHEN 'dead-poets-society' THEN 'dead_poets_society_bookings'
    WHEN 'rent' THEN 'rent_bookings'
    WHEN 'toctoc' THEN 'toctoc_bookings'
    ELSE NULL
  END;

  IF v_table IS NULL
    OR p_user_id IS NULL
    OR p_name IS NULL
    OR length(btrim(p_name)) NOT BETWEEN 1 AND 100
    OR p_student_id !~ '^[A-Za-z0-9_-]{1,20}$'
    OR p_selected_seats IS NULL
    OR cardinality(p_selected_seats) NOT BETWEEN 1 AND 10
  THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid booking input.');
  END IF;

  IF (SELECT count(*) FROM unnest(p_selected_seats) AS seat)
    <> (SELECT count(DISTINCT seat) FROM unnest(p_selected_seats) AS seat)
  THEN
    RETURN jsonb_build_object('success', false, 'error', 'Duplicate seats.');
  END IF;

  FOREACH v_seat IN ARRAY p_selected_seats LOOP
    IF NOT (
      (p_seat_grade = 'VIP' AND v_seat ~ '^F1-VIP-R(0[1-9])-(L|R)0[1-6]$')
      OR (p_seat_grade = 'VIP' AND v_seat ~ '^F1-VIP-R(0[1-9])-C(0[1-9]|1[0-2])$')
      OR (p_seat_grade IN ('R', 'R석') AND v_seat ~ '^F1-R-R(0[1-8])-(L|R)0[1-6]$')
      OR (p_seat_grade IN ('R', 'R석') AND v_seat ~ '^F1-R-R(0[1-8])-C(0[1-9]|1[0-2])$')
      OR (p_seat_grade IN ('S', 'S석') AND v_seat ~ '^F2-S-R(0[1-8])-(L|R)0[1-6]$')
      OR (p_seat_grade IN ('S', 'S석') AND v_seat ~ '^F2-S-R(0[1-8])-C(0[1-9]|1[0-2])$')
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid seat for grade.');
    END IF;
  END LOOP;

  EXECUTE format('LOCK TABLE public.%I IN EXCLUSIVE MODE', v_table);
  EXECUTE format(
    'SELECT ARRAY(SELECT unnest(selected_seats) FROM public.%I WHERE status = ''confirmed'' AND selected_seats && $1)',
    v_table
  ) INTO v_conflicts USING p_selected_seats;

  IF cardinality(v_conflicts) > 0 THEN
    RETURN jsonb_build_object('success', false, 'conflictSeats', v_conflicts);
  END IF;

  EXECUTE format(
    'INSERT INTO public.%I (user_id, name, student_id, seat_grade, selected_seats, special_request, status) VALUES ($1,$2,$3,$4,$5,$6,''confirmed'') RETURNING id, booking_date',
    v_table
  ) INTO v_id, v_date
  USING p_user_id, btrim(p_name), p_student_id, p_seat_grade, p_selected_seats,
        NULLIF(btrim(coalesce(p_special_request, '')), '');

  RETURN jsonb_build_object(
    'success', true,
    'bookingId', v_id,
    'bookingDate', v_date
  );
END;
$$;

REVOKE ALL ON FUNCTION public.book_musical_seats(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_musical_seats(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, UUID)
  TO service_role;
