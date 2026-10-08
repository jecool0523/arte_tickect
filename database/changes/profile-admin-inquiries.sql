-- Site-only private inquiry channel. No external email delivery or public PII exposure.
CREATE TABLE private.arte_support_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_key uuid NOT NULL,
  display_name text NOT NULL,
  student_id text,
  content text NOT NULL CHECK (length(btrim(content)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  reply text CHECK (length(btrim(reply)) BETWEEN 1 AND 2000),
  replied_at timestamptz,
  replied_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT arte_support_reply_state CHECK ((reply IS NULL AND replied_at IS NULL AND replied_by IS NULL)
    OR (reply IS NOT NULL AND replied_at IS NOT NULL)),
  UNIQUE(user_id,request_key)
);
ALTER TABLE private.arte_support_inquiries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.arte_support_inquiries FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON private.arte_support_inquiries TO service_role;
CREATE INDEX arte_support_owner_created_idx ON private.arte_support_inquiries(user_id,created_at DESC,id);
CREATE INDEX arte_support_queue_idx ON private.arte_support_inquiries((reply IS NOT NULL),created_at DESC,id);
CREATE INDEX arte_support_reviewer_idx ON private.arte_support_inquiries(replied_by) WHERE replied_by IS NOT NULL;

CREATE FUNCTION public.submit_support_inquiry(p_user_id uuid,p_request_key uuid,p_content text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE p public.profiles%ROWTYPE; q private.arte_support_inquiries%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_request_key IS NULL OR p_content IS NULL OR length(btrim(p_content)) NOT BETWEEN 1 AND 2000
    THEN RETURN jsonb_build_object('success',false,'code','INVALID_INPUT'); END IF;
  SELECT * INTO p FROM public.profiles WHERE id=p_user_id FOR SHARE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'code','NOT_FOUND'); END IF;
  INSERT INTO private.arte_support_inquiries(user_id,request_key,display_name,student_id,content)
    VALUES(p_user_id,p_request_key,COALESCE(NULLIF(btrim(p.display_name),''),p.username,'미등록'),p.student_id,btrim(p_content))
    ON CONFLICT(user_id,request_key) DO NOTHING;
  SELECT * INTO q FROM private.arte_support_inquiries WHERE user_id=p_user_id AND request_key=p_request_key;
  IF q.content IS DISTINCT FROM btrim(p_content) THEN RETURN jsonb_build_object('success',false,'code','REQUEST_CHANGED'); END IF;
  RETURN jsonb_build_object('success',true,'inquiryId',q.id);
END $$;

CREATE FUNCTION public.list_support_inquiries(p_user_id uuid,p_admin boolean DEFAULT false,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE items jsonb; total integer;
BEGIN
  IF p_user_id IS NULL OR p_admin IS NULL OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 1000000
    THEN RETURN jsonb_build_object('success',false,'code','INVALID_INPUT'); END IF;
  IF p_admin THEN
    PERFORM 1 FROM public.profiles WHERE id=p_user_id AND is_admin FOR SHARE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'code','FORBIDDEN'); END IF;
  ELSE
    PERFORM 1 FROM public.profiles WHERE id=p_user_id FOR SHARE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'code','NOT_FOUND'); END IF;
  END IF;
  SELECT count(*) INTO total FROM private.arte_support_inquiries WHERE p_admin OR user_id=p_user_id;
  SELECT COALESCE(jsonb_agg(item ORDER BY queue,created_at DESC,id),'[]'::jsonb) INTO items FROM (
    SELECT id,created_at,CASE WHEN p_admin THEN reply IS NOT NULL ELSE false END AS queue,
      jsonb_build_object('id',id,'content',content,'createdAt',created_at,'reply',reply,'repliedAt',replied_at)
        || CASE WHEN p_admin THEN jsonb_build_object('displayName',display_name,'studentId',student_id) ELSE '{}'::jsonb END AS item
    FROM private.arte_support_inquiries WHERE p_admin OR user_id=p_user_id
    ORDER BY CASE WHEN p_admin THEN reply IS NOT NULL ELSE false END,created_at DESC,id LIMIT 20 OFFSET p_offset
  ) page;
  RETURN jsonb_build_object('success',true,'inquiries',items,'total',total);
END $$;

CREATE FUNCTION public.reply_support_inquiry(p_admin_id uuid,p_inquiry_id uuid,p_reply text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE q private.arte_support_inquiries%ROWTYPE;
BEGIN
  IF p_inquiry_id IS NULL OR p_reply IS NULL OR length(btrim(p_reply)) NOT BETWEEN 1 AND 2000
    THEN RETURN jsonb_build_object('success',false,'code','INVALID_INPUT'); END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_admin_id AND is_admin FOR SHARE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'code','FORBIDDEN'); END IF;
  SELECT * INTO q FROM private.arte_support_inquiries WHERE id=p_inquiry_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'code','NOT_FOUND'); END IF;
  IF q.reply IS NOT NULL THEN RETURN jsonb_build_object('success',false,'code','ALREADY_ANSWERED'); END IF;
  UPDATE private.arte_support_inquiries SET reply=btrim(p_reply),replied_at=now(),replied_by=p_admin_id WHERE id=p_inquiry_id;
  RETURN jsonb_build_object('success',true);
END $$;
REVOKE ALL ON FUNCTION public.submit_support_inquiry(uuid,uuid,text),public.list_support_inquiries(uuid,boolean,integer),
  public.reply_support_inquiry(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_support_inquiry(uuid,uuid,text),public.list_support_inquiries(uuid,boolean,integer),
  public.reply_support_inquiry(uuid,uuid,text) TO service_role;
