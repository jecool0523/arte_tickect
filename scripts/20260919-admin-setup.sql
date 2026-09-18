-- 관리자 시스템 설정
-- Supabase SQL Editor에서 실행

-- ============================================================
-- 1. profiles 테이블에 is_admin 컬럼 추가
-- ============================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 인덱스 추가 (관리자 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles (is_admin) WHERE is_admin = TRUE;

-- ============================================================
-- 2. 관리자 전용 RPC 함수들
-- ============================================================

-- 2.1 현재 사용자가 관리자인지 확인
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated, service_role;

-- 2.2 관리자 권한 부여/해제 (service_role만 호출 가능)
CREATE OR REPLACE FUNCTION public.set_user_admin_status(
  p_target_user_id UUID,
  p_is_admin BOOLEAN,
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

  -- 자기 자신 권한 변경 방지
  IF p_target_user_id = p_by_admin_id AND p_is_admin = FALSE THEN
    RETURN jsonb_build_object('success', false, 'error', '자기 자신의 관리자 권한은 해제할 수 없습니다.', 'code', 'SELF_DEMOTE_FORBIDDEN');
  END IF;

  -- 권한 변경
  UPDATE public.profiles
  SET is_admin = p_is_admin,
      updated_at = now()
  WHERE id = p_target_user_id;

  RETURN jsonb_build_object('success', true, 'is_admin', p_is_admin);
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_admin_status(UUID, BOOLEAN, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_admin_status(UUID, BOOLEAN, UUID) TO service_role;

-- 2.3 관리자용 전체 사용자 목록 조회
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
  -- 호출자가 관리자인지 확인
  IF NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', '관리자 권한이 필요합니다.', 'code', 'FORBIDDEN');
  END IF;

  -- 전체 개수 조회
  SELECT COUNT(*) INTO v_total
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p_search IS NULL
     OR u.email ILIKE '%' || p_search || '%'
     OR p.display_name ILIKE '%' || p_search || '%'
     OR p.student_id ILIKE '%' || p_search || '%';

  -- 사용자 목록 조회 (예매 수 포함)
  SELECT jsonb_agg(jsonb_build_object(
    'id', p.id,
    'email', u.email,
    'display_name', p.display_name,
    'student_id', p.student_id,
    'avatar_url', p.avatar_url,
    'is_admin', p.is_admin,
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

-- 2.4 관리자용 전체 예매 현황 조회
CREATE OR REPLACE FUNCTION public.admin_get_booking_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', '관리자 권한이 필요합니다.', 'code', 'FORBIDDEN');
  END IF;

  SELECT jsonb_build_object(
    'dead_poets_society', (
      SELECT jsonb_build_object(
        'total_bookings', COUNT(*),
        'total_seats', SUM(cardinality(selected_seats)),
        'unique_users', COUNT(DISTINCT user_id)
      ) FROM public.dead_poets_society_bookings WHERE status = 'confirmed'
    ),
    'rent', (
      SELECT jsonb_build_object(
        'total_bookings', COUNT(*),
        'total_seats', SUM(cardinality(selected_seats)),
        'unique_users', COUNT(DISTINCT user_id)
      ) FROM public.rent_bookings WHERE status = 'confirmed'
    ),
    'toctoc', (
      SELECT jsonb_build_object(
        'total_bookings', COUNT(*),
        'total_seats', SUM(cardinality(selected_seats)),
        'unique_users', COUNT(DISTINCT user_id)
      ) FROM public.toctoc_bookings WHERE status = 'confirmed'
    ),
    'periods', (
      SELECT jsonb_agg(jsonb_build_object(
        'musical_name', musical_name,
        'start_time', start_time,
        'end_time', end_time
      )) FROM public.arte_musical_application_period
    ),
    'presale_keys', (
      SELECT jsonb_agg(jsonb_build_object(
        'musical_id', musical_id,
        'label', label,
        'is_active', is_active,
        'used_count', used_count,
        'max_uses', max_uses,
        'max_seats_per_booking', max_seats_per_booking,
        'starts_at', starts_at,
        'ends_at', ends_at
      )) FROM public.presale_access_keys
    )
  ) INTO v_result;

  RETURN jsonb_build_object('success', true, 'stats', v_result);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_booking_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_booking_stats() TO authenticated, service_role;

-- 2.5 관리자용 리뷰 관리 (삭제)
CREATE OR REPLACE FUNCTION public.admin_delete_review(p_review_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', '관리자 권한이 필요합니다.', 'code', 'FORBIDDEN');
  END IF;

  DELETE FROM public.reviews WHERE id = p_review_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_review(BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_review(BIGINT) TO service_role;

-- ============================================================
-- 3. 초기 관리자 설정 (실행 후 이메일로 관리자 지정)
-- ============================================================
-- 사용 예시 (SQL Editor에서 실행):
-- SELECT public.set_user_admin_status('user-uuid-here', TRUE, 'admin-uuid-here');
-- 또는 직접 업데이트:
-- UPDATE public.profiles SET is_admin = TRUE WHERE id = 'user-uuid-here';

-- ============================================================
-- 4. RLS 정책 업데이트 (관리자는 모든 프로필 읽기 가능)
-- ============================================================
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) = id
  OR public.is_current_user_admin()
);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

-- ============================================================
-- 검증 쿼리
-- ============================================================
-- SELECT id, email, display_name, is_admin FROM public.profiles WHERE is_admin = TRUE;
-- SELECT public.is_current_user_admin();
-- SELECT * FROM public.admin_get_all_users(10, 0, NULL);
-- SELECT * FROM public.admin_get_booking_stats();