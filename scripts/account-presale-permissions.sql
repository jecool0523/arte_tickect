-- Account permissions replace codes. Historical code records are retained, not used.
-- Booking and permission mutation RPCs are server-only; verified IDs come from getUser().
CREATE OR REPLACE FUNCTION public.book_musical_seats(
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
  v_profile public.profiles%ROWTYPE;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_now TIMESTAMPTZ;
  v_presale BOOLEAN;
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
    OR p_student_id IS NULL
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

  -- Hold permission and period rows through the insert; revocation/time edits cannot race.
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR SHARE;
  IF NOT FOUND OR v_profile.profile_completed_at IS NULL OR v_profile.username IS NULL
    OR v_profile.display_name IS NULL OR v_profile.student_id IS NULL OR v_profile.contact_number IS NULL
  THEN RETURN jsonb_build_object('success', false, 'code', 'PROFILE_INCOMPLETE', 'error', '내 정보를 먼저 등록해주세요.'); END IF;
  SELECT start_time, end_time INTO v_start, v_end FROM public.arte_musical_application_period
    WHERE musical_name = p_musical_id FOR SHARE;
  IF NOT FOUND OR v_start IS NULL OR v_end IS NULL OR v_start >= v_end
  THEN RETURN jsonb_build_object('success', false, 'code', 'BOOKING_PERIOD_UNAVAILABLE'); END IF;

  EXECUTE format('LOCK TABLE public.%I IN EXCLUSIVE MODE', v_table);
  -- Use the current clock AFTER any lock wait, not transaction-start now().
  v_now := clock_timestamp();
  IF v_now > v_end THEN
    RETURN jsonb_build_object('success', false, 'code', 'BOOKING_CLOSED', 'error', '예매 기간이 종료되었습니다.');
  END IF;
  v_presale := v_now < v_start;
  IF v_presale AND v_profile.is_presale_user IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('success', false, 'code', 'PRESALE_PERMISSION_REQUIRED', 'error', '선예매 권한이 없는 계정입니다.');
  END IF;
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
    'bookingDate', v_date,
    'presale', v_presale
  );
END;
$$;

REVOKE ALL ON FUNCTION public.book_musical_seats(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_musical_seats(TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, UUID)
  TO service_role;

create or replace function private.arte_admin_users(p_limit integer, p_offset integer, p_search text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb; total integer;
begin
  if auth.uid() is null or not public.is_current_user_admin() then return jsonb_build_object('success',false,'code','FORBIDDEN'); end if;
  p_limit := greatest(1, least(100, p_limit)); p_offset := greatest(0, p_offset);
  select count(*) into total from public.profiles p join auth.users u on u.id=p.id
  where p_search is null or u.email ilike '%'||p_search||'%' or p.display_name ilike '%'||p_search||'%' or p.student_id ilike '%'||p_search||'%';
  select coalesce(jsonb_agg(x.row), '[]'::jsonb) into result from (
    select jsonb_build_object('id',p.id,'email',u.email,'display_name',p.display_name,'student_id',p.student_id,'avatar_url',p.avatar_url,'is_admin',p.is_admin,'is_presale_user',p.is_presale_user,'email_confirmed',u.email_confirmed_at is not null,'created_at',p.created_at,'updated_at',p.updated_at,'booking_count',
      (select count(*) from (select user_id from public.toctoc_bookings union all select user_id from public.rent_bookings union all select user_id from public.dead_poets_society_bookings) b where b.user_id=p.id),
      'review_count',(select count(*) from public.reviews r where r.user_id=p.id)) as row
    from public.profiles p join auth.users u on u.id=p.id
    where p_search is null or u.email ilike '%'||p_search||'%' or p.display_name ilike '%'||p_search||'%' or p.student_id ilike '%'||p_search||'%'
    order by p.created_at desc, p.id limit p_limit offset p_offset
  ) x;
  return jsonb_build_object('success',true,'users',result,'total',total,'limit',p_limit,'offset',p_offset);
end; $$;
