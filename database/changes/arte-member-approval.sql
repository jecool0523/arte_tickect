-- Additive, server-only membership approval. No existing role is changed by setup.
CREATE TABLE private.arte_member_roster (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  student_id text,
  CHECK (student_id IS NULL OR student_id ~ '^[0-9]{4}$')
);
INSERT INTO private.arte_member_roster(id, student_id, display_name) VALUES
('1203','1203','김예성'), ('1204','1204','김우찬'), ('1205','1205','김청휘'),
('1208','1208','노준서'), ('1216','1216','심휘'), ('1227','1227','최율하'),
('1322','1322','이준수'), ('1425','1425','차예린'), ('2101','2101','김근우'),
('2122','2122','정세훈'), ('2123','2123','조경윤'), ('2208','2208','박근우'),
('2223','2223','조민서'), ('2323','2323','장현중'), ('2325','2325','제시원'),
('2403','2403','곽승현'), ('2509','2509','김승현'), ('2610','2610','김현우'),
('2612','2612','박소은'), ('name:구민찬',NULL,'구민찬'),
('name:김보경',NULL,'김보경'), ('name:박동우',NULL,'박동우');

CREATE TABLE private.arte_admin_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  roster_id text NOT NULL REFERENCES private.arte_member_roster(id),
  display_name text NOT NULL,
  student_id text NOT NULL,
  email text NOT NULL,
  status text NOT NULL CHECK (status IN ('declined','pending','approved','rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CHECK ((status IN ('declined','pending') AND reviewed_at IS NULL)
    OR (status IN ('approved','rejected') AND reviewed_at IS NOT NULL))
);
CREATE UNIQUE INDEX arte_admin_requests_approved_roster ON private.arte_admin_requests(roster_id) WHERE status='approved';
CREATE INDEX arte_admin_requests_pending ON private.arte_admin_requests(requested_at) WHERE status='pending';
ALTER TABLE private.arte_member_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.arte_admin_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.arte_member_roster, private.arte_admin_requests FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
-- UPDATE privilege is needed for the approval transaction's FOR UPDATE lock.
GRANT SELECT, UPDATE ON private.arte_member_roster TO service_role;
GRANT SELECT, INSERT, UPDATE ON private.arte_admin_requests TO service_role;
COMMENT ON TABLE private.arte_member_roster IS 'INTERNAL: user-supplied roster; matching is eligibility, not verified identity.';
COMMENT ON TABLE private.arte_admin_requests IS 'INTERNAL: one membership answer/request per account; only an existing administrator can approve. Review snapshots are retained.';

-- service_role intentionally has no direct auth.users access. This narrowly scoped,
-- non-PostgREST helper reads ONLY a confirmed email and optionally locks that row.
CREATE FUNCTION private.get_arte_member_email(p_user_id uuid, p_lock boolean DEFAULT false) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_email text;
BEGIN
  IF p_lock THEN
    SELECT email INTO v_email FROM auth.users WHERE id=p_user_id AND email_confirmed_at IS NOT NULL FOR SHARE;
  ELSE
    SELECT email INTO v_email FROM auth.users WHERE id=p_user_id AND email_confirmed_at IS NOT NULL;
  END IF;
  RETURN v_email;
END $$;
REVOKE ALL ON FUNCTION private.get_arte_member_email(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.get_arte_member_email(uuid,boolean) TO service_role;

CREATE FUNCTION public.get_arte_membership_state(p_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE p public.profiles%ROWTYPE; r private.arte_member_roster%ROWTYPE; q private.arte_admin_requests%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id=p_user_id;
  IF NOT FOUND OR p.profile_completed_at IS NULL THEN RETURN jsonb_build_object('eligible',false,'status','profile_incomplete'); END IF;
  IF p.is_admin THEN RETURN jsonb_build_object('eligible',false,'status','admin'); END IF;
  SELECT * INTO q FROM private.arte_admin_requests WHERE user_id=p_user_id;
  IF FOUND AND q.status <> 'declined' THEN RETURN jsonb_build_object('eligible',true,'status',q.status); END IF;
  SELECT * INTO r FROM private.arte_member_roster
    WHERE display_name=btrim(p.display_name) AND (student_id IS NULL OR student_id=btrim(p.student_id));
  IF NOT FOUND THEN RETURN jsonb_build_object('eligible',false,'status','not_eligible'); END IF;
  RETURN jsonb_build_object('eligible',true,'status',COALESCE(q.status,'unanswered'),'manualStudentCheck',r.student_id IS NULL);
END $$;

CREATE FUNCTION public.submit_arte_membership_request(p_user_id uuid, p_is_member boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE p public.profiles%ROWTYPE; r private.arte_member_roster%ROWTYPE; q private.arte_admin_requests%ROWTYPE; v_email text;
BEGIN
  IF p_is_member IS NULL THEN RETURN jsonb_build_object('success',false,'code','INVALID_INPUT'); END IF;
  SELECT * INTO p FROM public.profiles WHERE id=p_user_id FOR SHARE;
  IF NOT FOUND OR p.profile_completed_at IS NULL THEN RETURN jsonb_build_object('success',false,'code','PROFILE_INCOMPLETE'); END IF;
  IF p.is_admin THEN RETURN jsonb_build_object('success',true,'state',jsonb_build_object('eligible',false,'status','admin')); END IF;
  SELECT * INTO q FROM private.arte_admin_requests WHERE user_id=p_user_id FOR UPDATE;
  IF FOUND AND q.status <> 'declined' THEN RETURN jsonb_build_object('success',true,'state',public.get_arte_membership_state(p_user_id)); END IF;
  SELECT * INTO r FROM private.arte_member_roster
    WHERE display_name=btrim(p.display_name) AND (student_id IS NULL OR student_id=btrim(p.student_id));
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'code','NOT_ELIGIBLE'); END IF;
  v_email := private.get_arte_member_email(p_user_id);
  IF v_email IS NULL THEN RETURN jsonb_build_object('success',false,'code','EMAIL_UNVERIFIED'); END IF;
  INSERT INTO private.arte_admin_requests(user_id,roster_id,display_name,student_id,email,status)
    VALUES(p_user_id,r.id,btrim(p.display_name),btrim(p.student_id),v_email,CASE WHEN p_is_member THEN 'pending' ELSE 'declined' END)
    ON CONFLICT(user_id) DO UPDATE SET roster_id=excluded.roster_id,display_name=excluded.display_name,
      student_id=excluded.student_id,email=excluded.email,status=excluded.status,requested_at=now()
      WHERE arte_admin_requests.status='declined';
  -- Deliberately does not UPDATE profiles.is_admin.
  RETURN jsonb_build_object('success',true,'state',public.get_arte_membership_state(p_user_id));
END $$;

CREATE FUNCTION public.list_arte_admin_requests(p_admin_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE items jsonb; total integer;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_admin_id AND is_admin) THEN RETURN jsonb_build_object('success',false,'code','FORBIDDEN'); END IF;
  SELECT count(*) INTO total FROM private.arte_admin_requests WHERE status='pending';
  SELECT COALESCE(jsonb_agg(item ORDER BY requested_at),'[]'::jsonb) INTO items FROM (
    SELECT q.requested_at, jsonb_build_object('id',q.id,'email',q.email,'displayName',q.display_name,
      'studentId',q.student_id,'requestedAt',q.requested_at,'manualStudentCheck',r.student_id IS NULL,
      'profileUnchanged',p.display_name=q.display_name AND p.student_id=q.student_id
        AND COALESCE(private.get_arte_member_email(q.user_id)=q.email,false) AND p.profile_completed_at IS NOT NULL,
      'alreadyAdmin',p.is_admin) AS item
    FROM private.arte_admin_requests q JOIN private.arte_member_roster r ON r.id=q.roster_id
      JOIN public.profiles p ON p.id=q.user_id
    WHERE q.status='pending' ORDER BY q.requested_at LIMIT 100
  ) pending;
  RETURN jsonb_build_object('success',true,'requests',items,'total',total);
END $$;

CREATE FUNCTION public.review_arte_admin_request(p_admin_id uuid,p_request_id uuid,p_approve boolean) RETURNS jsonb
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
    UPDATE public.profiles SET is_admin=true,updated_at=now() WHERE id=v_user;
  END IF;
  UPDATE private.arte_admin_requests SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    reviewed_at=now(),reviewed_by=p_admin_id WHERE id=p_request_id;
  RETURN jsonb_build_object('success',true,'status',CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END);
END $$;

REVOKE ALL ON FUNCTION public.get_arte_membership_state(uuid), public.submit_arte_membership_request(uuid,boolean),
  public.list_arte_admin_requests(uuid), public.review_arte_admin_request(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_arte_membership_state(uuid), public.submit_arte_membership_request(uuid,boolean),
  public.list_arte_admin_requests(uuid), public.review_arte_admin_request(uuid,uuid,boolean) TO service_role;
