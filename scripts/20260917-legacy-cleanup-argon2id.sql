-- Legacy 테이블·정책 정리 + 리뷰 비밀번호 argon2id 전환
-- 실행 전: Supabase SQL Editor에서 실행. 되돌리기 어려우니 백업(테이블 DDL·데이터) 권장.

-- ============================================================
-- 1. argon2id 전환: reviews 테이블
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- argon2id 사용 가능 여부 확인 (PostgreSQL 14+ / Supabase에서 기본 제공)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pgcrypto') THEN
    RAISE EXCEPTION 'pgcrypto extension required';
  END IF;
  -- argon2id는 pgcrypto의 crypt()에서 'argon2id' salt로 지원
  PERFORM extensions.crypt('test', extensions.gen_salt('argon2id'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'argon2id not available, falling back to bf. Consider upgrading PostgreSQL.';
END $$;

-- 기존 password_hash(bcrypt)를 argon2id로 재해시 불가(원본 비밀번호 모름).
-- 신규 작성분부터 argon2id 적용. 기존 행은 bcrypt로 검증 유지.
-- 방식: password_hash 컬럼에 알고리즘 식별자 프리픽스 저장($argon2id$... vs $2b$...)
-- create_review / delete_review_with_token 함수 수정으로 처리.

-- create_review: argon2id로 해시 저장
CREATE OR REPLACE FUNCTION public.create_review(
    p_musical_id TEXT,
    p_user_name TEXT,
    p_password TEXT,
    p_content TEXT,
    p_rating INTEGER,
    p_image_url TEXT DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    musical_id TEXT,
    user_name TEXT,
    content TEXT,
    image_url TEXT,
    rating INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    INSERT INTO public.reviews (musical_id, user_name, password_hash, content, rating, image_url)
    VALUES (
        p_musical_id,
        p_user_name,
        extensions.crypt(p_password, extensions.gen_salt('argon2id')),
        p_content,
        LEAST(GREATEST(p_rating, 1), 5),
        p_image_url
    )
    RETURNING
        reviews.id,
        reviews.musical_id,
        reviews.user_name,
        reviews.content,
        reviews.image_url,
        reviews.rating,
        reviews.created_at;
END;
$$;

-- delete_review_with_token: argon2id 또는 bcrypt 모두 검증
CREATE OR REPLACE FUNCTION public.delete_review_with_token(
    p_review_id BIGINT,
    p_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_hash TEXT;
BEGIN
    SELECT password_hash INTO v_hash
    FROM public.reviews
    WHERE id = p_review_id;

    IF v_hash IS NULL THEN
        RETURN FALSE;
    END IF;

    -- argon2id($argon2id$) 또는 bcrypt($2b$/$2a$/$2y$) 자동 판별 검증
    IF v_hash = extensions.crypt(p_password, v_hash) THEN
        DELETE FROM public.reviews WHERE id = p_review_id;
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- 권한 재설정
REVOKE ALL ON FUNCTION public.create_review(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_review_with_token(BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_review(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_review_with_token(BIGINT, TEXT) TO service_role;

-- ============================================================
-- 2. Legacy 테이블 권한 완전 차단 (데이터 보존, 접근만 차단)
-- ============================================================
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'arte_musical_tickets',
        'bookings',
        'seat_status',
        'your_lie_in_april_bookings',
        'talktalk_bookings'
    ] LOOP
        IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
            -- 모든 권한 회수
            EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated, service_role', t);
            -- service_role만 소유자로서 관리 목적 남김 (필요 시 주석 해제)
            -- EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
            -- RLS 강제 활성화 (정책 없음 = 아무도 읽기 불가)
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('DROP POLICY IF EXISTS "Users can read own bookings" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Anyone can read bookings" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Anyone can insert bookings" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Anyone can read seat_status" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Anyone can read dead_poets_bookings" ON public.%I', t);
            RAISE NOTICE 'Locked down: %', t;
        ELSE
            RAISE NOTICE 'Table not found (skip): %', t;
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- 3. 사용하지 않는 시퀀스/인덱스/뷰 정리 (선택)
-- ============================================================
-- 필요 시 아래 주석 해제 후 실행
-- DROP INDEX IF EXISTS idx_arte_musical_tickets_student_id;
-- DROP INDEX IF EXISTS idx_bookings_student_id;
-- DROP SEQUENCE IF EXISTS bookings_id_seq;
-- DROP SEQUENCE IF EXISTS seat_status_id_seq;

-- ============================================================
-- 검증 쿼리 (실행 후 확인용)
-- ============================================================
-- SELECT schemaname, tablename, policyname, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('reviews', 'arte_musical_tickets', 'bookings', 'seat_status')
-- ORDER BY tablename, policyname;

-- SELECT proname, prosecdef, proacl
-- FROM pg_proc
-- WHERE proname IN ('create_review', 'delete_review_with_token');

-- 신규 리뷰 작성·삭제 테스트(서버에서 service_role로):
-- SELECT * FROM public.create_review('dead-poets-society', 'Tester', 'pw123', 'Good!', 5, NULL);
-- SELECT public.delete_review_with_token(<returned_id>, 'pw123');