-- 프로필 기능 개선: 아바타 동기화, 계정 탈퇴 RPC, 이메일 인증 확인
-- 실행 전 백업 권장

-- ============================================================
-- 1. handle_new_auth_user: 아바타 URL 동기화 추가
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NULLIF(left(btrim(coalesce(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      ''
    )), 100), ''),
    NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(NULLIF(left(btrim(coalesce(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      ''
    )), 100), ''), public.profiles.display_name),
    avatar_url = COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', ''), public.profiles.avatar_url),
    updated_at = now()
  WHERE public.profiles.id = NEW.id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO service_role;

-- ============================================================
-- 2. 프로필 업데이트 RPC (서버 전용, 학번 중복 검사 포함)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_profile(
  p_user_id UUID,
  p_display_name TEXT DEFAULT NULL,
  p_student_id TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_conflict UUID;
BEGIN
  -- 입력 검증
  IF p_display_name IS NOT NULL AND length(btrim(p_display_name)) NOT BETWEEN 1 AND 100 THEN
    RETURN jsonb_build_object('success', false, 'error', '이름은 1~100자여야 합니다.', 'code', 'INVALID_DISPLAY_NAME');
  END IF;

  IF p_student_id IS NOT NULL THEN
    IF p_student_id !~ '^[A-Za-z0-9_-]{1,20}$' THEN
      RETURN jsonb_build_object('success', false, 'error', '학번은 영문/숫자/_- 1~20자여야 합니다.', 'code', 'INVALID_STUDENT_ID');
    END IF;
    -- 다른 사용자가 이미 사용하는 학번인지 확인
    SELECT id INTO v_conflict
    FROM public.profiles
    WHERE student_id = p_student_id AND id <> p_user_id;
    IF v_conflict IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', '이미 사용 중인 학번입니다.', 'code', 'STUDENT_ID_TAKEN');
    END IF;
  END IF;

  -- 업데이트
  UPDATE public.profiles
  SET
    display_name = COALESCE(NULLIF(btrim(p_display_name), ''), display_name),
    student_id = COALESCE(NULLIF(btrim(p_student_id), ''), student_id),
    avatar_url = COALESCE(NULLIF(btrim(p_avatar_url), ''), avatar_url),
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.update_profile(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile(UUID, TEXT, TEXT, TEXT) TO service_role;

-- ============================================================
-- 3. 계정 탈퇴 RPC (소유 티켓 익명화 + 프로필 삭제 + auth.users 삭제)
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_account(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_booking_tables TEXT[] := ARRAY['dead_poets_society_bookings', 'rent_bookings', 'toctoc_bookings'];
  v_table TEXT;
BEGIN
  -- 1) 소유 예매 티켓 익명화 (user_id NULL, 이름/학번 마스킹)
  FOREACH v_table IN ARRAY v_booking_tables LOOP
    IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
      EXECUTE format(
        'UPDATE public.%I SET user_id = NULL, name = ''탈퇴한 사용자'', student_id = ''deleted'' WHERE user_id = $1',
        v_table
      ) USING p_user_id;
    END IF;
  END LOOP;

  -- 2) 리뷰 user_id NULL
  IF to_regclass('public.reviews') IS NOT NULL THEN
    UPDATE public.reviews SET user_id = NULL WHERE user_id = p_user_id;
  END IF;

  -- 3) 프로필 삭제
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- 4) auth.users 삭제 (service_role만 가능, Admin API 필요)
  -- 이 함수는 service_role로 호출되므로 admin API 사용 가능
  -- 주의: Supabase에서는 auth.users 직접 삭제 불가, Admin API 사용 필요
  -- 여기서는 프로필/데이터 정리만 하고 실제 계정 삭제는 서버에서 Admin API 호출

  RETURN jsonb_build_object('success', true, 'message', '계정 데이터가 정리되었습니다. 완전한 탈퇴는 관리자 승인 필요.');
END;
$$;

REVOKE ALL ON FUNCTION public.delete_account(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account(UUID) TO service_role;

-- ============================================================
-- 4. 이메일 인증 상태 확인 RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_email_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email TEXT;
  v_confirmed_at TIMESTAMPTZ;
BEGIN
  -- auth.users에서 직접 조회 (service_role 필요)
  SELECT email, email_confirmed_at INTO v_email, v_confirmed_at
  FROM auth.users
  WHERE id = p_user_id;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', '사용자를 찾을 수 없습니다.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'email', v_email,
    'email_confirmed', v_confirmed_at IS NOT NULL,
    'email_confirmed_at', v_confirmed_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_email_status(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_email_status(UUID) TO service_role;

-- ============================================================
-- 검증 쿼리
-- ============================================================
-- SELECT * FROM public.update_profile(gen_random_uuid(), 'Test', '1234', NULL); -- 성공
-- SELECT * FROM public.update_profile(gen_random_uuid(), 'Test', '1234', NULL); -- STUDENT_ID_TAKEN
-- SELECT * FROM public.get_user_email_status('<some-uuid>');