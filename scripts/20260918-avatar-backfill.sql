-- 기존 사용자 아바타 백필 + 이메일 인증 상태 확인용 뷰
-- Supabase SQL Editor에서 실행

-- ============================================================
-- 1. 아바타 백필: auth.users.raw_user_meta_data.avatar_url → profiles.avatar_url
-- ============================================================
DO $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  UPDATE public.profiles p
  SET avatar_url = u.raw_user_meta_data ->> 'avatar_url',
      updated_at = now()
  FROM auth.users u
  WHERE p.id = u.id
    AND p.avatar_url IS NULL
    AND u.raw_user_meta_data ? 'avatar_url'
    AND u.raw_user_meta_data ->> 'avatar_url' <> '';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Avatar backfill complete: % rows updated', updated_count;
END $$;

-- ============================================================
-- 2. 표시 이름 백필 (NULL인 경우)
-- ============================================================
DO $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  UPDATE public.profiles p
  SET display_name = left(btrim(coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    ''
  )), 100),
      updated_at = now()
  FROM auth.users u
  WHERE p.id = u.id
    AND p.display_name IS NULL
    AND (
      u.raw_user_meta_data ? 'full_name'
      OR u.raw_user_meta_data ? 'name'
    )
    AND btrim(coalesce(
      u.raw_user_meta_data ->> 'full_name',
      u.raw_user_meta_data ->> 'name',
      ''
    )) <> '';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Display name backfill complete: % rows updated', updated_count;
END $$;

-- ============================================================
-- 3. 이메일 인증 상태 확인 뷰 (서버 RPC 없이 조회 가능)
--    참고: auth.users는 service_role만 직접 조회 가능하므로
--    실제 운영에서는 RPC(get_user_email_status) 사용 권장
-- ============================================================
CREATE OR REPLACE VIEW public.user_email_status AS
SELECT
  u.id AS user_id,
  u.email,
  u.email_confirmed_at IS NOT NULL AS email_confirmed,
  u.email_confirmed_at,
  u.created_at AS auth_created_at
FROM auth.users u;

-- 서비스 롤만 접근 가능하도록 권한 설정
REVOKE ALL ON public.user_email_status FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_email_status TO service_role;

-- ============================================================
-- 4. 프로필 완성도 확인용 뷰 (관리자/디버깅용)
-- ============================================================
CREATE OR REPLACE VIEW public.profile_completeness AS
SELECT
  p.id,
  p.display_name,
  p.student_id,
  p.avatar_url,
  u.email,
  u.email_confirmed_at IS NOT NULL AS email_confirmed,
  u.raw_user_meta_data ->> 'avatar_url' AS auth_avatar_url,
  u.raw_user_meta_data ->> 'full_name' AS auth_full_name,
  u.raw_user_meta_data ->> 'name' AS auth_name,
  CASE
    WHEN p.display_name IS NOT NULL AND p.student_id IS NOT NULL AND p.avatar_url IS NOT NULL THEN 'complete'
    WHEN p.display_name IS NOT NULL OR p.student_id IS NOT NULL THEN 'partial'
    ELSE 'empty'
  END AS completeness
FROM public.profiles p
JOIN auth.users u ON p.id = u.id;

REVOKE ALL ON public.profile_completeness FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profile_completeness TO service_role;

-- ============================================================
-- 검증 쿼리
-- ============================================================
-- SELECT * FROM public.user_email_status;
-- SELECT * FROM public.profile_completeness ORDER BY completeness;
-- SELECT id, email, email_confirmed_at, raw_user_meta_data ->> 'avatar_url' AS avatar FROM auth.users WHERE raw_user_meta_data ? 'avatar_url';