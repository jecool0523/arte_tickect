-- Single transaction; every fixture account, reservation and period change is rolled back.
BEGIN;
DO $$
DECLARE v_owner uuid := gen_random_uuid(); v_other uuid := gen_random_uuid(); v_id bigint; source text; tbl text;
BEGIN
  INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
    (v_owner,'arte-cancel-test@example.invalid',now(),'{}'),(v_other,'arte-cancel-other@example.invalid',now(),'{}');
  UPDATE public.profiles SET username='ArteCancelTest',display_name='취소테스트',student_id='9901',contact_number='01000000000',profile_completed_at=now() WHERE id=v_owner;
  UPDATE public.profiles SET username='ArteCancelOther',display_name='다른테스트',student_id='9902',contact_number='01000000000',profile_completed_at=now() WHERE id=v_other;
  -- Use non-production fixture seat IDs. Cancellation never needs to invent seat inventory.
  FOREACH source IN ARRAY ARRAY['rent','toctoc','dead-poets-society','legacy'] LOOP
    tbl := CASE source WHEN 'rent' THEN 'rent_bookings' WHEN 'toctoc' THEN 'toctoc_bookings'
      WHEN 'dead-poets-society' THEN 'dead_poets_society_bookings' ELSE 'arte_musical_tickets' END;
    EXECUTE format('INSERT INTO public.%I(user_id,name,student_id,seat_grade,selected_seats,status) VALUES($1,''취소테스트'',''9901'',''VIP'',ARRAY[''fixture-cancel-seat''],''confirmed'') RETURNING id',tbl) INTO v_id USING v_owner;
  END LOOP;
END $$;
SET LOCAL ROLE service_role;
DO $$
DECLARE owner_id uuid; other_id uuid; bid bigint; source text; tbl text; result jsonb; before_count bigint; after_count bigint; status text; retained text[]; v_seat text;
BEGIN
  SELECT id INTO owner_id FROM public.profiles WHERE username='ArteCancelTest';
  SELECT id INTO other_id FROM public.profiles WHERE username='ArteCancelOther';
  before_count := (public.get_account_fan_activity(owner_id)->>'bookingCount')::bigint;
  IF before_count <> 4 THEN RAISE EXCEPTION 'Fixture bookings missing'; END IF;
  IF public.cancel_owned_reservation(owner_id,'toString',1,false)->>'code' <> 'INVALID_INPUT' THEN RAISE EXCEPTION 'Arbitrary source accepted'; END IF;
  FOREACH source IN ARRAY ARRAY['rent','toctoc','dead-poets-society','legacy'] LOOP
    tbl := CASE source WHEN 'rent' THEN 'rent_bookings' WHEN 'toctoc' THEN 'toctoc_bookings'
      WHEN 'dead-poets-society' THEN 'dead_poets_society_bookings' ELSE 'arte_musical_tickets' END;
    EXECUTE format('SELECT id FROM public.%I WHERE user_id=$1',tbl) INTO bid USING owner_id;
    IF public.cancel_owned_reservation(other_id,source,bid,false)->>'code' <> 'NOT_FOUND' THEN RAISE EXCEPTION 'Foreign cancellation accepted'; END IF;
    IF public.cancel_owned_reservation(owner_id,source,9223372036854775807,false)->>'code' <> 'NOT_FOUND' THEN RAISE EXCEPTION 'Missing booking accepted'; END IF;
    IF source='legacy' THEN
      IF public.cancel_owned_reservation(owner_id,source,bid,true)->>'code' <> 'REBOOK_UNSUPPORTED' THEN RAISE EXCEPTION 'Unknown legacy show guessed'; END IF;
    ELSE
      UPDATE public.arte_musical_application_period SET start_time=now()-interval '2 hours',end_time=now()-interval '1 hour' WHERE musical_name=source;
      IF public.cancel_owned_reservation(owner_id,source,bid,true)->>'code' <> 'BOOKING_CLOSED' THEN RAISE EXCEPTION 'Closed rebooking accepted'; END IF;
      EXECUTE format('SELECT status FROM public.%I WHERE id=$1',tbl) INTO status USING bid;
      IF status <> 'confirmed' THEN RAISE EXCEPTION 'Closed rebooking cancelled old booking'; END IF;
      UPDATE public.arte_musical_application_period SET start_time=now()+interval '1 hour',end_time=now()+interval '2 hours' WHERE musical_name=source;
      IF public.cancel_owned_reservation(owner_id,source,bid,true)->>'code' <> 'PRESALE_PERMISSION_REQUIRED' THEN RAISE EXCEPTION 'Unprivileged presale rebooking accepted'; END IF;
      EXECUTE format('SELECT status FROM public.%I WHERE id=$1',tbl) INTO status USING bid;
      IF status <> 'confirmed' THEN RAISE EXCEPTION 'Denied presale cancelled old booking'; END IF;
      UPDATE public.profiles SET is_presale_user=true WHERE id=owner_id;
      result := public.cancel_owned_reservation(owner_id,source,bid,true);
      IF result->>'success' <> 'true' OR result#>>'{rebooking,musicalId}' <> source OR result#>>'{rebooking,name}' <> '취소테스트'
        OR result#>>'{rebooking,studentId}' <> '9901' THEN RAISE EXCEPTION 'Presale rebooking preparation failed'; END IF;
      UPDATE public.profiles SET is_presale_user=false WHERE id=owner_id;
    END IF;
    result := public.cancel_owned_reservation(owner_id,source,bid,false);
    IF result->>'success' <> 'true' THEN RAISE EXCEPTION 'Own cancellation failed for %',source; END IF;
    EXECUTE format('SELECT status,selected_seats FROM public.%I WHERE id=$1 AND user_id=$2',tbl) INTO status,retained USING bid,owner_id;
    IF status <> 'cancelled' OR retained <> ARRAY['fixture-cancel-seat'] THEN RAISE EXCEPTION 'History removed or cancellation missing'; END IF;
    IF public.cancel_owned_reservation(owner_id,source,bid,false)->>'alreadyCancelled' <> 'true' THEN RAISE EXCEPTION 'Cancellation not idempotent'; END IF;
  END LOOP;
  after_count := (public.get_account_fan_activity(owner_id)->>'bookingCount')::bigint;
  IF after_count <> 0 THEN RAISE EXCEPTION 'Cancelled booking still awards fan XP'; END IF;
  -- Completed status also uses the same ownership-safe cancellation path.
  SELECT id INTO bid FROM public.rent_bookings WHERE user_id=owner_id;
  UPDATE public.rent_bookings SET status='completed' WHERE id=bid;
  IF public.cancel_owned_reservation(owner_id,'rent',bid,false)->>'success' <> 'true' THEN RAISE EXCEPTION 'Completed cancellation failed'; END IF;
  -- A regular open period accepts cancelled-history rebooking without restoring the old row.
  UPDATE public.arte_musical_application_period SET start_time=now()-interval '1 hour',end_time=now()+interval '1 hour' WHERE musical_name='rent';
  IF public.cancel_owned_reservation(owner_id,'rent',bid,true)->>'alreadyCancelled' <> 'true' THEN RAISE EXCEPTION 'Cancelled history rebooking failed'; END IF;
  IF (SELECT b.status FROM public.rent_bookings b WHERE b.id=bid) <> 'cancelled' THEN RAISE EXCEPTION 'Cancelled row restored instead of creating new booking'; END IF;
  -- Exercise actual seat conflict/release/new booking, not just the cancellation flag.
  SELECT 'F2-S-R'||lpad(r::text,2,'0')||'-C'||lpad(c::text,2,'0') INTO v_seat
    FROM generate_series(1,8) r CROSS JOIN generate_series(1,12) c
    WHERE NOT EXISTS(SELECT 1 FROM public.rent_bookings b WHERE b.status='confirmed'
      AND ('F2-S-R'||lpad(r::text,2,'0')||'-C'||lpad(c::text,2,'0'))=ANY(b.selected_seats)) LIMIT 1;
  IF v_seat IS NULL THEN RAISE EXCEPTION 'No available fixture seat; do not overwrite production bookings'; END IF;
  UPDATE public.rent_bookings SET status='confirmed',seat_grade='S',selected_seats=ARRAY[v_seat] WHERE id=bid;
  result := public.book_musical_seats('rent','취소테스트','9901','S',ARRAY[v_seat],NULL,owner_id);
  IF result->>'success' <> 'false' OR result->'conflictSeats' IS NULL THEN RAISE EXCEPTION 'Active seat not protected'; END IF;
  PERFORM public.cancel_owned_reservation(owner_id,'rent',bid,false);
  result := public.book_musical_seats('rent','취소테스트','9901','S',ARRAY[v_seat],NULL,owner_id);
  IF result->>'success' <> 'true' OR (result->>'bookingId')::bigint=bid THEN RAISE EXCEPTION 'Released seat did not create a NEW booking'; END IF;
  IF (public.get_account_fan_activity(owner_id)->>'bookingCount')::integer <> 1 THEN RAISE EXCEPTION 'Rebooking XP not recalculated'; END IF;
END $$;
RESET ROLE;
DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF has_function_privilege(role_name,'public.cancel_owned_reservation(uuid,text,bigint,boolean)','EXECUTE') THEN RAISE EXCEPTION 'Server-only RPC exposed'; END IF;
  END LOOP;
END $$;
ROLLBACK;
SELECT jsonb_build_object('test','owned_cancellation_rollback_passed','profiles',(SELECT count(*) FROM public.profiles),
  'bookings',(SELECT sum(n) FROM (SELECT count(*) n FROM public.rent_bookings UNION ALL SELECT count(*) FROM public.toctoc_bookings UNION ALL SELECT count(*) FROM public.dead_poets_society_bookings UNION ALL SELECT count(*) FROM public.arte_musical_tickets) b)) AS result;
