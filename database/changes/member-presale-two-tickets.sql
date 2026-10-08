-- Approved club members: two presale seats per performance, cumulative, cancellation releases quota.
-- Historical reservations are not classified from editable booking dates.
ALTER TABLE public.dead_poets_society_bookings ADD COLUMN is_presale boolean NOT NULL DEFAULT false;
ALTER TABLE public.rent_bookings ADD COLUMN is_presale boolean NOT NULL DEFAULT false;
ALTER TABLE public.toctoc_bookings ADD COLUMN is_presale boolean NOT NULL DEFAULT false;

CREATE FUNCTION private.arte_presale_allowance(p_user_id uuid,p_musical_id text,p_exclude_booking_id bigint DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_table text; v_used integer; v_limit integer;
BEGIN
  v_table := CASE p_musical_id WHEN 'dead-poets-society' THEN 'dead_poets_society_bookings'
    WHEN 'rent' THEN 'rent_bookings' WHEN 'toctoc' THEN 'toctoc_bookings' ELSE NULL END;
  IF v_table IS NULL OR p_user_id IS NULL THEN RAISE EXCEPTION 'Invalid presale input'; END IF;
  IF EXISTS(SELECT 1 FROM private.arte_admin_requests WHERE user_id=p_user_id AND status='approved') THEN v_limit := 2; END IF;
  EXECUTE format('SELECT COALESCE(sum(cardinality(selected_seats)),0)::integer FROM public.%I
    WHERE user_id=$1 AND is_presale AND status IN (''confirmed'',''completed'')
      AND ($2 IS NULL OR id<>$2)',v_table) INTO v_used USING p_user_id,p_exclude_booking_id;
  RETURN jsonb_build_object('limit',v_limit,'used',v_used,'remaining',CASE WHEN v_limit IS NOT NULL THEN greatest(0,v_limit-v_used) ELSE NULL END);
END $$;
REVOKE ALL ON FUNCTION private.arte_presale_allowance(uuid,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.arte_presale_allowance(uuid,text,bigint) TO service_role;

CREATE FUNCTION public.get_account_presale_allowance(p_user_id uuid,p_musical_id text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  SELECT private.arte_presale_allowance(p_user_id,p_musical_id);
$$;
REVOKE ALL ON FUNCTION public.get_account_presale_allowance(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_presale_allowance(uuid,text) TO service_role;

-- Only previously approved members receive the new default. Ordinary admins and pending claims do not.
UPDATE public.profiles p SET is_presale_user=true,updated_at=now()
  WHERE EXISTS(SELECT 1 FROM private.arte_admin_requests q WHERE q.user_id=p.id AND q.status='approved');

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
  v_allowance JSONB;
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
  IF v_presale THEN
    v_allowance := private.arte_presale_allowance(p_user_id,p_musical_id);
    IF v_allowance->>'remaining' IS NOT NULL AND cardinality(p_selected_seats) > (v_allowance->>'remaining')::integer THEN
      RETURN jsonb_build_object('success',false,'code','PRESALE_LIMIT_EXCEEDED',
        'error','선예매 가능 수량을 초과했습니다. 남은 수량에 맞게 좌석을 선택해주세요.',
        'presaleLimit',v_allowance->'limit','presaleRemaining',v_allowance->'remaining');
    END IF;
  END IF;
  EXECUTE format(
    'SELECT ARRAY(SELECT unnest(selected_seats) FROM public.%I WHERE status = ''confirmed'' AND selected_seats && $1)',
    v_table
  ) INTO v_conflicts USING p_selected_seats;

  IF cardinality(v_conflicts) > 0 THEN
    RETURN jsonb_build_object('success', false, 'conflictSeats', v_conflicts);
  END IF;

  EXECUTE format(
    'INSERT INTO public.%I (user_id, name, student_id, seat_grade, selected_seats, special_request, status, is_presale) VALUES ($1,$2,$3,$4,$5,$6,''confirmed'',$7) RETURNING id, booking_date',
    v_table
  ) INTO v_id, v_date
  USING p_user_id, btrim(p_name), p_student_id, p_seat_grade, p_selected_seats,
        NULLIF(btrim(coalesce(p_special_request, '')), ''), v_presale;

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

CREATE OR REPLACE FUNCTION public.review_arte_admin_request(p_admin_id uuid,p_request_id uuid,p_approve boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE q private.arte_admin_requests%ROWTYPE; p public.profiles%ROWTYPE; v_user uuid; v_email text;
BEGIN
  IF p_approve IS NULL THEN RETURN jsonb_build_object('success',false,'code','INVALID_INPUT'); END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_admin_id AND is_admin FOR SHARE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'code','FORBIDDEN'); END IF;
  SELECT user_id INTO v_user FROM private.arte_admin_requests WHERE id=p_request_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'code','NOT_FOUND'); END IF;
  IF v_user=p_admin_id THEN RETURN jsonb_build_object('success',false,'code','SELF_APPROVAL_FORBIDDEN'); END IF;
  SELECT * INTO p FROM public.profiles WHERE id=v_user FOR UPDATE;
  SELECT * INTO q FROM private.arte_admin_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND OR q.status <> 'pending' THEN RETURN jsonb_build_object('success',false,'code','ALREADY_REVIEWED'); END IF;
  IF p_approve THEN
    v_email := private.get_arte_member_email(v_user,true);
    IF p.profile_completed_at IS NULL OR p.display_name IS DISTINCT FROM q.display_name
      OR p.student_id IS DISTINCT FROM q.student_id OR v_email IS DISTINCT FROM q.email
      OR NOT EXISTS(SELECT 1 FROM private.arte_member_roster WHERE id=q.roster_id AND display_name=q.display_name
        AND (student_id IS NULL OR student_id=q.student_id))
    THEN RETURN jsonb_build_object('success',false,'code','PROFILE_CHANGED'); END IF;
    -- Serialize approvals for the same roster member, including name-only entries.
    PERFORM 1 FROM private.arte_member_roster WHERE id=q.roster_id FOR UPDATE;
    IF EXISTS(SELECT 1 FROM private.arte_admin_requests WHERE roster_id=q.roster_id AND status='approved')
      THEN RETURN jsonb_build_object('success',false,'code','MEMBER_ALREADY_APPROVED'); END IF;
    UPDATE public.profiles SET is_admin=true,is_presale_user=true,updated_at=now() WHERE id=v_user;
  END IF;
  UPDATE private.arte_admin_requests SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    reviewed_at=now(),reviewed_by=p_admin_id WHERE id=p_request_id;
  RETURN jsonb_build_object('success',true,'status',CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END);
END $$;


-- Follow-up: normalize legacy integer / modern bigint IDs before cached PL/pgSQL expressions.
-- Replacement of cancel_owned_reservation only; existing data and permissions unchanged.
CREATE OR REPLACE FUNCTION public.cancel_owned_reservation(p_user_id uuid, p_source_id text, p_booking_id bigint, p_for_rebooking boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_table text; v_booking_id bigint; v_name text; v_student_id text; v_status text; v_profile public.profiles%ROWTYPE;
  v_start timestamptz; v_end timestamptz; v_now timestamptz; v_already_cancelled boolean; v_allowance jsonb;
BEGIN
  v_table := CASE p_source_id WHEN 'dead-poets-society' THEN 'dead_poets_society_bookings'
    WHEN 'rent' THEN 'rent_bookings' WHEN 'toctoc' THEN 'toctoc_bookings'
    WHEN 'legacy' THEN 'arte_musical_tickets' ELSE NULL END;
  IF v_table IS NULL OR p_user_id IS NULL OR p_booking_id IS NULL OR p_booking_id < 1 OR p_for_rebooking IS NULL
    THEN RETURN jsonb_build_object('success',false,'code','INVALID_INPUT'); END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id=p_user_id FOR SHARE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'code','NOT_FOUND'); END IF;
  IF p_for_rebooking THEN
    IF p_source_id='legacy' THEN RETURN jsonb_build_object('success',false,'code','REBOOK_UNSUPPORTED'); END IF;
    IF v_profile.profile_completed_at IS NULL OR v_profile.username IS NULL OR v_profile.display_name IS NULL
      OR v_profile.student_id IS NULL OR v_profile.contact_number IS NULL
      THEN RETURN jsonb_build_object('success',false,'code','PROFILE_INCOMPLETE'); END IF;
    -- Use the same profile -> period -> booking-table lock order as book_musical_seats.
    SELECT start_time,end_time INTO v_start,v_end FROM public.arte_musical_application_period
      WHERE musical_name=p_source_id FOR SHARE;
    IF NOT FOUND OR v_start IS NULL OR v_end IS NULL OR v_start >= v_end
      THEN RETURN jsonb_build_object('success',false,'code','BOOKING_PERIOD_UNAVAILABLE'); END IF;
  END IF;
  -- Serialize seat release with the existing booking transaction's EXCLUSIVE lock.
  EXECUTE format('LOCK TABLE public.%I IN EXCLUSIVE MODE',v_table);
  EXECUTE format('SELECT id::bigint,name,student_id,status FROM public.%I WHERE id=$1 AND user_id=$2 FOR UPDATE',v_table)
    INTO v_booking_id,v_name,v_student_id,v_status USING p_booking_id,p_user_id;
  IF v_booking_id IS NULL THEN RETURN jsonb_build_object('success',false,'code','NOT_FOUND'); END IF;
  IF v_status NOT IN ('confirmed','completed','cancelled')
    THEN RETURN jsonb_build_object('success',false,'code','INVALID_STATUS'); END IF;
  IF p_for_rebooking THEN
    v_now := clock_timestamp();
    IF v_now > v_end THEN RETURN jsonb_build_object('success',false,'code','BOOKING_CLOSED'); END IF;
    IF v_now < v_start AND v_profile.is_presale_user IS DISTINCT FROM true
      THEN RETURN jsonb_build_object('success',false,'code','PRESALE_PERMISSION_REQUIRED'); END IF;
    IF v_now < v_start THEN
      -- Exclude only the ownership-checked booking that this transaction will cancel.
      v_allowance := private.arte_presale_allowance(p_user_id,p_source_id,p_booking_id);
      IF v_allowance->>'remaining' IS NOT NULL AND (v_allowance->>'remaining')::integer < 1
        THEN RETURN jsonb_build_object('success',false,'code','PRESALE_LIMIT_EXCEEDED'); END IF;
    END IF;
  END IF;
  v_already_cancelled := v_status='cancelled';
  IF NOT v_already_cancelled THEN
    EXECUTE format('UPDATE public.%I SET status=''cancelled'',updated_at=now() WHERE id=$1 AND user_id=$2',v_table)
      USING p_booking_id,p_user_id;
  END IF;
  RETURN jsonb_build_object('success',true,'status','cancelled','alreadyCancelled',v_already_cancelled,
    'rebooking',CASE WHEN p_for_rebooking THEN jsonb_build_object('musicalId',p_source_id,'name',v_name,'studentId',v_student_id) ELSE NULL END);
END $$;
REVOKE ALL ON FUNCTION public.cancel_owned_reservation(uuid,text,bigint,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_owned_reservation(uuid,text,bigint,boolean) TO service_role;

