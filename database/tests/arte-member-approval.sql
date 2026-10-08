-- Run as a single transaction. Fixture accounts/roles/requests are ALL rolled back.
BEGIN;
DO $$
DECLARE fixture record; v_id uuid;
BEGIN
  FOR fixture IN SELECT * FROM (VALUES
    ('ArteApprovalTestAdmin','테스트관리자','9001'),
    ('ArteApprovalTestMember','김예성','1203'),
    ('ArteApprovalTestStale','김우찬','1204'),
    ('ArteApprovalTestNameOnly','박동우','9911'),
    ('ArteApprovalTestDuplicate','박동우','9912'),
    ('ArteApprovalTestWrong','김예성','9999'),
    ('ArteApprovalTestReject','김청휘','1205')
  ) AS fixtures(username,display_name,student_id) LOOP
    v_id := gen_random_uuid();
    INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
      VALUES(v_id,lower(fixture.username)||'@example.invalid',now(),'{}');
    UPDATE public.profiles SET username=fixture.username,display_name=fixture.display_name,
      student_id=fixture.student_id,contact_number='01000000000',profile_completed_at=now(),
      is_admin=fixture.username='ArteApprovalTestAdmin' WHERE id=v_id;
  END LOOP;
END $$;
SET LOCAL ROLE service_role;
DO $$
DECLARE admin_id uuid; member_id uuid; stale_id uuid; named_id uuid; duplicate_id uuid; wrong_id uuid; reject_id uuid; request_id uuid; result jsonb;
BEGIN
  SELECT id INTO admin_id FROM public.profiles WHERE username='ArteApprovalTestAdmin';
  SELECT id INTO member_id FROM public.profiles WHERE username='ArteApprovalTestMember';
  SELECT id INTO stale_id FROM public.profiles WHERE username='ArteApprovalTestStale';
  SELECT id INTO named_id FROM public.profiles WHERE username='ArteApprovalTestNameOnly';
  SELECT id INTO duplicate_id FROM public.profiles WHERE username='ArteApprovalTestDuplicate';
  SELECT id INTO wrong_id FROM public.profiles WHERE username='ArteApprovalTestWrong';
  SELECT id INTO reject_id FROM public.profiles WHERE username='ArteApprovalTestReject';
  IF public.get_arte_membership_state(wrong_id)->>'eligible' <> 'false' THEN RAISE EXCEPTION 'Wrong student ID was eligible'; END IF;
  IF public.submit_arte_membership_request(wrong_id,true)->>'code' <> 'NOT_ELIGIBLE' THEN RAISE EXCEPTION 'Ineligible submission accepted'; END IF;
  IF public.get_arte_membership_state(member_id)->>'status' <> 'unanswered' THEN RAISE EXCEPTION 'Initial state incorrect'; END IF;
  IF public.submit_arte_membership_request(member_id,false)#>>'{state,status}' <> 'declined' THEN RAISE EXCEPTION 'No answer not persisted'; END IF;
  IF public.submit_arte_membership_request(member_id,true)#>>'{state,status}' <> 'pending' THEN RAISE EXCEPTION 'Request not pending'; END IF;
  PERFORM public.submit_arte_membership_request(member_id,true);
  IF (SELECT count(*) FROM private.arte_admin_requests WHERE user_id=member_id) <> 1 THEN RAISE EXCEPTION 'Duplicate request'; END IF;
  IF (SELECT is_admin FROM public.profiles WHERE id=member_id) THEN RAISE EXCEPTION 'Submission granted privileges'; END IF;
  SELECT id INTO request_id FROM private.arte_admin_requests WHERE user_id=member_id;
  IF public.list_arte_admin_requests(wrong_id)->>'code' <> 'FORBIDDEN' THEN RAISE EXCEPTION 'Ordinary user read pending requests'; END IF;
  IF public.review_arte_admin_request(wrong_id,request_id,true)->>'code' <> 'FORBIDDEN' THEN RAISE EXCEPTION 'Ordinary user approved'; END IF;
  IF public.review_arte_admin_request(admin_id,request_id,true)->>'success' <> 'true' THEN RAISE EXCEPTION 'Admin approval failed'; END IF;
  IF NOT (SELECT is_admin FROM public.profiles WHERE id=member_id) THEN RAISE EXCEPTION 'Approval did not grant privileges'; END IF;
  IF public.get_arte_membership_state(member_id)->>'status' <> 'admin' THEN RAISE EXCEPTION 'Approved admin state incorrect'; END IF;
  IF NOT EXISTS(SELECT 1 FROM private.arte_admin_requests WHERE id=request_id AND status='approved' AND reviewed_by=admin_id AND reviewed_at IS NOT NULL) THEN RAISE EXCEPTION 'Missing approval audit'; END IF;
  IF public.review_arte_admin_request(admin_id,request_id,true)->>'code' <> 'ALREADY_REVIEWED' THEN RAISE EXCEPTION 'Repeat approval accepted'; END IF;
  -- Revocation must not be reversed by a later membership submission.
  UPDATE public.profiles SET is_admin=false WHERE id=member_id;
  PERFORM public.submit_arte_membership_request(member_id,true);
  IF (SELECT is_admin FROM public.profiles WHERE id=member_id) THEN RAISE EXCEPTION 'Revoked role regranted automatically'; END IF;
  PERFORM public.submit_arte_membership_request(stale_id,true);
  SELECT id INTO request_id FROM private.arte_admin_requests WHERE user_id=stale_id;
  UPDATE public.profiles SET display_name='변경된이름' WHERE id=stale_id;
  IF public.review_arte_admin_request(admin_id,request_id,true)->>'code' <> 'PROFILE_CHANGED' THEN RAISE EXCEPTION 'Stale profile approved'; END IF;
  IF (SELECT is_admin FROM public.profiles WHERE id=stale_id) THEN RAISE EXCEPTION 'Stale profile granted privileges'; END IF;
  IF public.get_arte_membership_state(named_id)->>'manualStudentCheck' <> 'true' THEN RAISE EXCEPTION 'Name-only flag absent'; END IF;
  PERFORM public.submit_arte_membership_request(named_id,true);
  PERFORM public.submit_arte_membership_request(duplicate_id,true);
  SELECT id INTO request_id FROM private.arte_admin_requests WHERE user_id=named_id;
  IF public.review_arte_admin_request(admin_id,request_id,true)->>'success' <> 'true' THEN RAISE EXCEPTION 'Name-only approval failed'; END IF;
  SELECT id INTO request_id FROM private.arte_admin_requests WHERE user_id=duplicate_id;
  IF public.review_arte_admin_request(admin_id,request_id,true)->>'code' <> 'MEMBER_ALREADY_APPROVED' THEN RAISE EXCEPTION 'Same roster member approved twice'; END IF;
  PERFORM public.submit_arte_membership_request(reject_id,true);
  SELECT id INTO request_id FROM private.arte_admin_requests WHERE user_id=reject_id;
  IF public.review_arte_admin_request(admin_id,request_id,false)->>'status' <> 'rejected' THEN RAISE EXCEPTION 'Rejection failed'; END IF;
  IF (SELECT is_admin FROM public.profiles WHERE id=reject_id) THEN RAISE EXCEPTION 'Rejection granted privileges'; END IF;
  IF public.submit_arte_membership_request(reject_id,true)#>>'{state,status}' <> 'rejected' THEN RAISE EXCEPTION 'Rejected request auto-reopened'; END IF;
  IF (public.list_arte_admin_requests(admin_id)->>'total')::integer < 2 THEN RAISE EXCEPTION 'Pending queue incorrect'; END IF;
END $$;
RESET ROLE;
DO $$
DECLARE f record; role_name text;
BEGIN
  FOR f IN SELECT oid FROM pg_proc WHERE proname IN ('get_arte_membership_state','submit_arte_membership_request','list_arte_admin_requests','review_arte_admin_request','get_arte_member_email') LOOP
    FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_function_privilege(role_name,f.oid,'EXECUTE') THEN RAISE EXCEPTION 'Public RPC privilege on % for %',f.oid,role_name; END IF;
    END LOOP;
  END LOOP;
  IF has_table_privilege('authenticated','private.arte_member_roster','SELECT')
    OR has_table_privilege('authenticated','private.arte_admin_requests','SELECT')
    OR has_column_privilege('authenticated','public.profiles','is_admin','UPDATE')
    OR has_table_privilege('service_role','auth.users','SELECT') THEN RAISE EXCEPTION 'Sensitive access widened'; END IF;
END $$;
DO $$ BEGIN
  PERFORM set_config('request.jwt.claim.sub',(SELECT id::text FROM public.profiles WHERE username='ArteApprovalTestWrong'),true);
END $$;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.submit_arte_membership_request(auth.uid(),true);
    RAISE EXCEPTION 'Authenticated user could invoke server-only RPC';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.profiles SET is_admin=true WHERE id=auth.uid();
    RAISE EXCEPTION 'Authenticated user could directly grant admin';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM public.get_arte_membership_state(NULL);
    RAISE EXCEPTION 'Anonymous user could invoke server-only RPC';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
SELECT jsonb_build_object('test','arte_member_approval_rollback_passed',
  'roster',(SELECT count(*) FROM private.arte_member_roster),
  'requests',(SELECT count(*) FROM private.arte_admin_requests),
  'profiles',(SELECT count(*) FROM public.profiles),
  'admins',(SELECT count(*) FROM public.profiles WHERE is_admin)) AS result;
