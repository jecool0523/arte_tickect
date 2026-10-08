-- No real user inquiry or reply is created. Everything is rolled back.
BEGIN;
DO $$
DECLARE uid uuid; fixture record;
BEGIN
  FOR fixture IN SELECT * FROM (VALUES ('ArteSupportOwner',false,'9901'),('ArteSupportOther',false,'9902'),('ArteSupportAdmin',true,'9903')) f(username,is_admin,student_id) LOOP
    uid := gen_random_uuid();
    INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES(uid,lower(fixture.username)||'@example.invalid',now(),'{}');
    UPDATE public.profiles SET username=fixture.username,display_name=fixture.username,student_id=fixture.student_id,is_admin=fixture.is_admin WHERE id=uid;
  END LOOP;
END $$;
SET LOCAL ROLE service_role;
DO $$
DECLARE owner_id uuid; other_id uuid; admin_id uuid; key uuid:=gen_random_uuid(); inquiry_id uuid; result jsonb; other_inquiry uuid; i integer;
BEGIN
  SELECT id INTO owner_id FROM public.profiles WHERE username='ArteSupportOwner';
  SELECT id INTO other_id FROM public.profiles WHERE username='ArteSupportOther';
  SELECT id INTO admin_id FROM public.profiles WHERE username='ArteSupportAdmin';
  result := public.submit_support_inquiry(owner_id,key,'  예약 문의 <script>alert(1)</script>  ');
  IF result->>'success' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Incomplete profile could not contact support'; END IF;
  inquiry_id := (result->>'inquiryId')::uuid;
  IF public.submit_support_inquiry(owner_id,key,'예약 문의 <script>alert(1)</script>')->>'inquiryId' IS DISTINCT FROM inquiry_id::text THEN RAISE EXCEPTION 'Idempotent retry duplicated inquiry'; END IF;
  IF public.submit_support_inquiry(owner_id,key,'변경')->>'code' IS DISTINCT FROM 'REQUEST_CHANGED' THEN RAISE EXCEPTION 'Same key changed content'; END IF;
  IF public.submit_support_inquiry(owner_id,gen_random_uuid(),'  ')->>'code' IS DISTINCT FROM 'INVALID_INPUT' THEN RAISE EXCEPTION 'Blank inquiry accepted'; END IF;
  IF public.submit_support_inquiry(owner_id,gen_random_uuid(),repeat('a',2001))->>'code' IS DISTINCT FROM 'INVALID_INPUT' THEN RAISE EXCEPTION 'Oversized inquiry accepted'; END IF;
  result := public.list_support_inquiries(owner_id,false,0);
  IF result->>'total' IS DISTINCT FROM '1' OR result#>>'{inquiries,0,content}' IS DISTINCT FROM '예약 문의 <script>alert(1)</script>'
    OR (result#>'{inquiries,0}')?'user_id' OR (result#>'{inquiries,0}')?'displayName'
    THEN RAISE EXCEPTION 'Owner scope or payload incorrect'; END IF;
  IF public.list_support_inquiries(other_id,false,0)->>'total' IS DISTINCT FROM '0' THEN RAISE EXCEPTION 'Foreign inquiry disclosed'; END IF;
  IF public.list_support_inquiries(owner_id,true,0)->>'code' IS DISTINCT FROM 'FORBIDDEN' THEN RAISE EXCEPTION 'Ordinary user read admin queue'; END IF;
  IF public.reply_support_inquiry(other_id,inquiry_id,'도용 답변')->>'code' IS DISTINCT FROM 'FORBIDDEN' THEN RAISE EXCEPTION 'Ordinary account replied'; END IF;
  result := public.list_support_inquiries(admin_id,true,0);
  IF result#>>'{inquiries,0,displayName}' IS DISTINCT FROM 'ArteSupportOwner' THEN RAISE EXCEPTION 'Admin sender unavailable'; END IF;
  IF public.reply_support_inquiry(admin_id,gen_random_uuid(),'답변')->>'code' IS DISTINCT FROM 'NOT_FOUND' THEN RAISE EXCEPTION 'Missing inquiry accepted'; END IF;
  IF public.reply_support_inquiry(admin_id,inquiry_id,'')->>'code' IS DISTINCT FROM 'INVALID_INPUT' THEN RAISE EXCEPTION 'Blank answer accepted'; END IF;
  IF public.reply_support_inquiry(admin_id,inquiry_id,'  관리자 답변  ')->>'success' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Admin reply failed'; END IF;
  IF public.reply_support_inquiry(admin_id,inquiry_id,'덮어쓰기')->>'code' IS DISTINCT FROM 'ALREADY_ANSWERED' THEN RAISE EXCEPTION 'Reply overwritten'; END IF;
  result := public.list_support_inquiries(owner_id,false,0);
  IF result#>>'{inquiries,0,reply}' IS DISTINCT FROM '관리자 답변' OR result#>>'{inquiries,0,repliedAt}' IS NULL THEN RAISE EXCEPTION 'Owner could not read reply'; END IF;
  IF public.list_support_inquiries(other_id,false,0)->>'total' IS DISTINCT FROM '0' THEN RAISE EXCEPTION 'Foreign reply disclosed'; END IF;
  other_inquiry := (public.submit_support_inquiry(other_id,gen_random_uuid(),'다른 계정 문의')->>'inquiryId')::uuid;
  result := public.list_support_inquiries(admin_id,true,0);
  IF result#>>'{inquiries,0,id}' IS DISTINCT FROM other_inquiry::text THEN RAISE EXCEPTION 'Pending inquiry not first'; END IF;
  UPDATE public.profiles SET is_admin=false WHERE id=admin_id;
  IF public.reply_support_inquiry(admin_id,other_inquiry,'권한 해제')->>'code' IS DISTINCT FROM 'FORBIDDEN' THEN RAISE EXCEPTION 'Revoked admin replied'; END IF;
  IF public.list_support_inquiries(admin_id,true,0)->>'code' IS DISTINCT FROM 'FORBIDDEN' THEN RAISE EXCEPTION 'Revoked admin read queue'; END IF;
  FOR i IN 1..21 LOOP PERFORM public.submit_support_inquiry(owner_id,gen_random_uuid(),'페이지 검증 '||i); END LOOP;
  result := public.list_support_inquiries(owner_id,false,0);
  IF result->>'total' IS DISTINCT FROM '22' OR jsonb_array_length(result->'inquiries')<>20 THEN RAISE EXCEPTION 'First page incorrect'; END IF;
  IF jsonb_array_length(public.list_support_inquiries(owner_id,false,20)->'inquiries')<>2 THEN RAISE EXCEPTION 'Remaining page missing'; END IF;
  IF public.list_support_inquiries(owner_id,false,-1)->>'code' IS DISTINCT FROM 'INVALID_INPUT' THEN RAISE EXCEPTION 'Bad offset accepted'; END IF;
  IF has_table_privilege('authenticated','private.arte_support_inquiries','SELECT') OR has_table_privilege('anon','private.arte_support_inquiries','SELECT')
    OR has_function_privilege('authenticated','public.list_support_inquiries(uuid,boolean,integer)','EXECUTE')
    OR has_function_privilege('anon','public.submit_support_inquiry(uuid,uuid,text)','EXECUTE')
    OR has_function_privilege('authenticated','public.reply_support_inquiry(uuid,uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'Direct browser access allowed'; END IF;
END $$;
RESET ROLE;
DO $$
DECLARE owner_id uuid;
BEGIN
  SELECT id INTO owner_id FROM public.profiles WHERE username='ArteSupportOwner';
  DELETE FROM public.profiles WHERE id=owner_id;
  IF EXISTS(SELECT 1 FROM private.arte_support_inquiries WHERE user_id=owner_id) THEN RAISE EXCEPTION 'Account deletion retained private inquiries'; END IF;
END $$;
ROLLBACK;
SELECT 'owner isolation, admin role checks, reply visibility, retries, input bounds, pagination, private grants and deletion passed' AS result;
