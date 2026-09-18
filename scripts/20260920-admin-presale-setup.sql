-- 관리자 계정 설정 + 선예매 전용 계정 시스템
-- Supabase SQL Editor에서 실행

-- ============================================================
-- 1. profiles 테이블에 is_presale_user 컬럼 추가
-- ============================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_presale_user BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_is_presale_user ON public.profiles (is_presale_user) WHERE is_presale_user = TRUE;

-- ============================================================
-- 2. jecool0523@dimigo.hs.kr 관리자 권한 부여
-- ============================================================
-- 이메일로 사용자 ID 찾고 관리자 설정
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'jecool0523@dimigo.hs.kr';

  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET is_admin = TRUE,
        updated_at = now()
    WHERE id = v_user_id;
    RAISE NOTICE 'Admin granted to jecool0523@dimigo.hs.kr (id: %)', v_user_id;
  ELSE
    RAISE NOTICE 'User jecool0523@dimigo.hs.kr not found in auth.users. Will be set on first login via trigger.';
    -- 첫 로그인 시 트리거가 프로필 생성하므로, 이후 수동으로 설정하거나 아래 정책 활용
  END IF;
END $$;

-- ============================================================
-- 3. 선예매 전용 계정 설정 (이메일로 지정)
-- ============================================================
-- 사용 예시: 선예매 권한을 줄 계정 이메일로 변경 후 실행
-- DO $$
-- DECLARE
--   v_user_id UUID;
-- BEGIN
--   SELECT id INTO v_user_id
--   FROM auth.users
--   WHERE email = 'presale-account@dimigo.hs.kr';  -- 여기에 선예매 계정 이메일 입력
--
--   IF v_user_id IS NOT NULL THEN
--     UPDATE public.profiles
--     SET is_presale_user = TRUE,
--         updated_at = now()
--     WHERE id = v_user_id;
--     RAISE NOTICE 'Presale user granted to % (id: %)', 'presale-account@dimigo.hs.kr', v_user_id;
--   ELSE
--     RAISE NOTICE 'Presale user not found. Will be set on first login.';
--   END IF;
-- END $$;

-- ============================================================
-- 4. 선예매 사용자 여부 확인 RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_current_user_presale()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_presale_user = TRUE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_current_user_presale() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_presale() TO authenticated, service_role;

-- ============================================================
-- 5. 관리자용 선예매 사용자 권한 부여/해제 RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_user_presale_status(
  p_target_user_id UUID,
  p_is_presale BOOLEAN,
  p_by_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_requester_admin BOOLEAN;
  v_target_exists BOOLEAN;
BEGIN
  -- 요청자가 관리자인지 확인
  SELECT is_admin INTO v_requester_admin
  FROM public.profiles
  WHERE id = p_by_admin_id;

  IF v_requester_admin IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', '관리자 권한이 없습니다.', 'code', 'FORBIDDEN');
  END IF;

  -- 대상 사용자 존재 확인
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_target_user_id) INTO v_target_exists;
  IF NOT v_target_exists THEN
    RETURN jsonb_build_object('success', false, 'error', '사용자를 찾을 수 없습니다.', 'code', 'USER_NOT_FOUND');
  END IF;

  -- 권한 변경
  UPDATE public.profiles
  SET is_presale_user = p_is_presale,
      updated_at = now()
  WHERE id = p_target_user_id;

  RETURN jsonb_build_object('success', true, 'is_presale_user', p_is_presale);
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_presale_status(UUID, BOOLEAN, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_presale_status(UUID, BOOLEAN, UUID) TO service_role;

-- ============================================================
-- 6. 관리자 사용자 목록에 is_presale_user 필드 추가 (admin_get_all_users 수정)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_all_users(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
  v_total INTEGER;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', '관리자 권한이 필요합니다.', 'code', 'FORBIDDEN');
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p_search IS NULL
     OR u.email ILIKE '%' || p_search || '%'
     OR p.display_name ILIKE '%' || p_search || '%'
     OR p.student_id ILIKE '%' || p_search || '%';

  SELECT jsonb_agg(jsonb_build_object(
    'id', p.id,
    'email', u.email,
    'display_name', p.display_name,
    'student_id', p.student_id,
    'avatar_url', p.avatar_url,
    'is_admin', p.is_admin,
    'is_presale_user', p.is_presale_user,
    'email_confirmed', u.email_confirmed_at IS NOT NULL,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'booking_count', COALESCE(b.count, 0),
    'review_count', COALESCE(r.count, 0)
  )) INTO v_result
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM (
      SELECT user_id FROM public.dead_poets_society_bookings
      UNION ALL SELECT user_id FROM public.rent_bookings
      UNION ALL SELECT user_id FROM public.toctoc_bookings
    ) all_bookings
    GROUP BY user_id
  ) b ON p.id = b.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM public.reviews
    GROUP BY user_id
  ) r ON p.id = r.user_id
  WHERE p_search IS NULL
     OR u.email ILIKE '%' || p_search || '%'
     OR p.display_name ILIKE '%' || p_search || '%'
     OR p.student_id ILIKE '%' || p_search || '%'
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;

  RETURN jsonb_build_object(
    'success', true,
    'users', COALESCE(v_result, '[]'::jsonb),
    'total', v_total,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_all_users(INTEGER, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_users(INTEGER, INTEGER, TEXT) TO authenticated, service_role;

-- ============================================================
-- 7. RLS 정책 업데이트 (관리자는 is_presale_user 수정 가능)
-- ============================================================
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- ============================================================
-- 검증 쿼리
-- ============================================================
-- SELECT id, email, display_name, is_admin, is_presale_user FROM public.profiles WHERE is_admin = TRUE OR is_presale_user = TRUE;
-- SELECT public.is_current_user_admin();
-- SELECT public.is_current_user_presale();
-- SELECT * FROM public.admin_get_all_users(10, 0, NULL);