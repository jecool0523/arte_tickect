-- Every fixture account, booking and period edit is rolled back. No real reservation is changed.
BEGIN;
DO $$
DECLARE uid uuid; fixture record;
BEGIN
  FOR fixture IN SELECT * FROM (VALUES
    ('ArteQuotaMember','김예성','1203',false),('ArteQuotaAdmin','검증관리자','9900',true),
    ('ArteQuotaPending','김우찬','1204',false)
  ) f(username,name,student,is_admin) LOOP
    uid := gen_random_uuid();
    INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
      VALUES(uid,lower(fixture.username)||'@example.invalid',now(),'{}');
    UPDATE public.profiles SET username=fixture.username,display_name=fixture.name,student_id=fixture.student,
      contact_number='01000000000',profile_completed_at=now(),is_admin=fixture.is_admin WHERE id=uid;
  END LOOP;
END $$;
SET LOCAL ROLE service_role;
DO $$
DECLARE member_id uuid; admin_id uuid; pending_id uuid; req uuid; src text; tbl text; seats text[];
  result jsonb; bid bigint; first_id bigint; normal_id bigint; allowance jsonb; def text;
BEGIN
  SELECT id INTO member_id FROM public.profiles WHERE username='ArteQuotaMember';
  SELECT id INTO admin_id FROM public.profiles WHERE username='ArteQuotaAdmin';
  SELECT id INTO pending_id FROM public.profiles WHERE username='ArteQuotaPending';
  PERFORM public.submit_arte_membership_request(member_id,true);
  PERFORM public.submit_arte_membership_request(pending_id,true);
  IF (SELECT is_presale_user FROM public.profiles WHERE id IN (member_id) LIMIT 1)
    THEN RAISE EXCEPTION 'Pending claim granted presale'; END IF;
  SELECT id INTO req FROM private.arte_admin_requests WHERE user_id=member_id;
  result := public.review_arte_admin_request(admin_id,req,true);
  IF result->>'success' <> 'true' OR NOT (SELECT is_admin AND is_presale_user FROM public.profiles WHERE id=member_id)
    THEN RAISE EXCEPTION 'Approval did not grant default entitlement'; END IF;
  IF (SELECT is_presale_user FROM public.profiles WHERE id=admin_id) THEN RAISE EXCEPTION 'Admin role implicitly granted presale'; END IF;
  FOREACH src IN ARRAY ARRAY['toctoc','rent','dead-poets-society'] LOOP
    tbl := CASE src WHEN 'toctoc' THEN 'toctoc_bookings' WHEN 'rent' THEN 'rent_bookings' ELSE 'dead_poets_society_bookings' END;
    UPDATE public.arte_musical_application_period SET start_time=now()+interval '1 hour',end_time=now()+interval '2 hours' WHERE musical_name=src;
    EXECUTE format('SELECT array_agg(seat) FROM (SELECT ''F2-S-R''||lpad(r::text,2,''0'')||''-C''||lpad(c::text,2,''0'') AS seat
      FROM generate_series(1,8) r CROSS JOIN generate_series(1,12) c
      WHERE NOT EXISTS(SELECT 1 FROM public.%I b WHERE b.status=''confirmed'' AND
        (''F2-S-R''||lpad(r::text,2,''0'')||''-C''||lpad(c::text,2,''0''))=ANY(b.selected_seats)) ORDER BY r,c LIMIT 6) free',tbl) INTO seats;
    IF seats IS NULL OR cardinality(seats)<6 THEN RAISE EXCEPTION 'Not enough safe fixture seats'; END IF;
    allowance := public.get_account_presale_allowance(member_id,src);
    IF allowance->>'limit' IS DISTINCT FROM '2' OR allowance->>'remaining' IS DISTINCT FROM '2' THEN RAISE EXCEPTION 'Initial or independent quota incorrect'; END IF;
    IF public.book_musical_seats(src,'김우찬','1204','S',seats[1:1],NULL,pending_id)->>'code' IS DISTINCT FROM 'PRESALE_PERMISSION_REQUIRED'
      THEN RAISE EXCEPTION 'Pending member booked presale'; END IF;
    result := public.book_musical_seats(src,'김예성','1203','S',seats[1:3],NULL,member_id);
    IF result->>'code' IS DISTINCT FROM 'PRESALE_LIMIT_EXCEEDED' OR result->>'presaleRemaining' IS DISTINCT FROM '2' THEN RAISE EXCEPTION 'Three seats accepted'; END IF;
    result := public.book_musical_seats(src,'김예성','1203','S',seats[1:1],NULL,member_id);
    IF result->>'success' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'First seat failed: %',result; END IF;
    first_id := (result->>'bookingId')::bigint;
    result := public.book_musical_seats(src,'김예성','1203','S',seats[2:2],NULL,member_id);
    IF result->>'success' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Second seat failed'; END IF;
    bid := (result->>'bookingId')::bigint;
    EXECUTE format('UPDATE public.%I SET status=''completed'' WHERE id=$1',tbl) USING bid;
    IF public.get_account_presale_allowance(member_id,src)->>'remaining' IS DISTINCT FROM '0' THEN RAISE EXCEPTION 'Completed seats stopped consuming quota'; END IF;
    IF public.book_musical_seats(src,'김예성','1203','S',seats[3:3],NULL,member_id)->>'code' IS DISTINCT FROM 'PRESALE_LIMIT_EXCEEDED'
      THEN RAISE EXCEPTION 'Split bookings bypassed quota'; END IF;
    -- Rebooking of a non-presale row must not cancel it when all two presale seats are used.
    EXECUTE format('INSERT INTO public.%I(user_id,name,student_id,seat_grade,selected_seats,status)
      VALUES($1,''김예성'',''1203'',''S'',ARRAY[''quota-normal-fixture''],''confirmed'') RETURNING id',tbl) INTO normal_id USING member_id;
    IF public.cancel_owned_reservation(member_id,src,normal_id,true)->>'code' IS DISTINCT FROM 'PRESALE_LIMIT_EXCEEDED'
      THEN RAISE EXCEPTION 'Quota exhausted rebooking allowed'; END IF;
    EXECUTE format('SELECT to_jsonb(b) FROM public.%I b WHERE id=$1',tbl) INTO result USING normal_id;
    IF result->>'status' IS DISTINCT FROM 'confirmed' THEN RAISE EXCEPTION 'Blocked rebooking cancelled old booking'; END IF;
    IF public.cancel_owned_reservation(member_id,src,first_id,true)->>'success' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Presale cancellation failed'; END IF;
    IF public.get_account_presale_allowance(member_id,src)->>'remaining' IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'Cancellation did not release quota'; END IF;
    IF public.book_musical_seats(src,'김예성','1203','S',seats[3:4],NULL,member_id)->>'code' IS DISTINCT FROM 'PRESALE_LIMIT_EXCEEDED'
      THEN RAISE EXCEPTION 'Excess replacement seats accepted'; END IF;
    IF public.book_musical_seats(src,'김예성','1203','S',seats[1:1],NULL,member_id)->>'success' IS DISTINCT FROM 'true'
      THEN RAISE EXCEPTION 'Released seat could not be rebooked'; END IF;
    IF public.cancel_owned_reservation(member_id,src,first_id,true)->>'code' IS DISTINCT FROM 'PRESALE_LIMIT_EXCEEDED'
      THEN RAISE EXCEPTION 'Already-cancelled row gave another quota credit'; END IF;
    UPDATE public.profiles SET is_presale_user=false WHERE id=member_id;
    IF public.book_musical_seats(src,'김예성','1203','S',seats[3:3],NULL,member_id)->>'code' IS DISTINCT FROM 'PRESALE_PERMISSION_REQUIRED'
      THEN RAISE EXCEPTION 'Admin revocation bypassed'; END IF;
    UPDATE public.profiles SET is_presale_user=true WHERE id=member_id;
    -- Manual non-member grants retain their existing unlimited behavior.
    UPDATE public.profiles SET is_presale_user=true WHERE id=admin_id;
    IF public.get_account_presale_allowance(admin_id,src)->>'limit' IS NOT NULL THEN RAISE EXCEPTION 'Non-member manual grant unexpectedly limited'; END IF;
    IF public.book_musical_seats(src,'검증관리자','9900','S',seats[3:5],NULL,admin_id)->>'success' IS DISTINCT FROM 'true'
      THEN RAISE EXCEPTION 'Manual grant broken'; END IF;
    -- General sales do not consume/restrict the member presale allowance.
    UPDATE public.arte_musical_application_period SET start_time=now()-interval '1 hour',end_time=now()+interval '1 hour' WHERE musical_name=src;
    EXECUTE format('UPDATE public.%I SET status=''cancelled'' WHERE user_id=$1',tbl) USING admin_id;
    result := public.book_musical_seats(src,'김예성','1203','S',seats[3:5],NULL,member_id);
    IF result->>'success' IS DISTINCT FROM 'true' OR result->>'presale' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'General sales restricted'; END IF;
    IF public.get_account_presale_allowance(member_id,src)->>'used' IS DISTINCT FROM '2' THEN RAISE EXCEPTION 'General booking consumed presale quota'; END IF;
  END LOOP;
  IF has_function_privilege('authenticated','public.get_account_presale_allowance(uuid,text)','EXECUTE')
    OR has_function_privilege('anon','public.book_musical_seats(text,text,text,text,text[],text,uuid)','EXECUTE')
    OR has_function_privilege('authenticated','private.arte_presale_allowance(uuid,text,bigint)','EXECUTE')
    OR has_column_privilege('authenticated','public.toctoc_bookings','is_presale','UPDATE')
    OR has_column_privilege('authenticated','public.toctoc_bookings','is_presale','INSERT')
    THEN RAISE EXCEPTION 'Browser can forge entitlement or booking marker'; END IF;
  def := pg_get_functiondef('public.book_musical_seats(text,text,text,text,text[],text,uuid)'::regprocedure);
  IF strpos(def,'private.arte_presale_allowance')<strpos(def,'LOCK TABLE') THEN RAISE EXCEPTION 'Quota checked outside seat lock'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'member presale quota, split bookings, cancellation, rebooking, regular sales and privileges passed' AS result;
