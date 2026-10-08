-- Additive server-only API. Existing reservations remain as cancellation history.
CREATE FUNCTION public.cancel_owned_reservation(p_user_id uuid, p_source_id text, p_booking_id bigint, p_for_rebooking boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_table text; v_booking record; v_profile public.profiles%ROWTYPE;
  v_start timestamptz; v_end timestamptz; v_now timestamptz; v_already_cancelled boolean;
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
  EXECUTE format('SELECT id,name,student_id,status FROM public.%I WHERE id=$1 AND user_id=$2 FOR UPDATE',v_table)
    INTO v_booking USING p_booking_id,p_user_id;
  IF v_booking.id IS NULL THEN RETURN jsonb_build_object('success',false,'code','NOT_FOUND'); END IF;
  IF v_booking.status NOT IN ('confirmed','completed','cancelled')
    THEN RETURN jsonb_build_object('success',false,'code','INVALID_STATUS'); END IF;
  IF p_for_rebooking THEN
    v_now := clock_timestamp();
    IF v_now > v_end THEN RETURN jsonb_build_object('success',false,'code','BOOKING_CLOSED'); END IF;
    IF v_now < v_start AND v_profile.is_presale_user IS DISTINCT FROM true
      THEN RETURN jsonb_build_object('success',false,'code','PRESALE_PERMISSION_REQUIRED'); END IF;
  END IF;
  v_already_cancelled := v_booking.status='cancelled';
  IF NOT v_already_cancelled THEN
    EXECUTE format('UPDATE public.%I SET status=''cancelled'',updated_at=now() WHERE id=$1 AND user_id=$2',v_table)
      USING p_booking_id,p_user_id;
  END IF;
  RETURN jsonb_build_object('success',true,'status','cancelled','alreadyCancelled',v_already_cancelled,
    'rebooking',CASE WHEN p_for_rebooking THEN jsonb_build_object('musicalId',p_source_id,'name',v_booking.name,'studentId',v_booking.student_id) ELSE NULL END);
END $$;
REVOKE ALL ON FUNCTION public.cancel_owned_reservation(uuid,text,bigint,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_owned_reservation(uuid,text,bigint,boolean) TO service_role;
