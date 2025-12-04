-- 1. 예매 기간 관리 테이블 생성 (필수)
CREATE TABLE IF NOT EXISTS public.arte_musical_application_period (
    id BIGSERIAL PRIMARY KEY,
    musical_name VARCHAR(100) NOT NULL UNIQUE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 보안 정책(RLS) 설정 (조회 권한 부여)
ALTER TABLE public.arte_musical_application_period ENABLE ROW LEVEL SECURITY;

-- 기존 정책이 있다면 삭제 후 재생성 (에러 방지)
DROP POLICY IF EXISTS "Public read access" ON public.arte_musical_application_period;
CREATE POLICY "Public read access" ON public.arte_musical_application_period FOR SELECT USING (true);

-- 3. 뮤지컬별 예매 기간 데이터 삽입 (현재 시간 기준 오픈)
-- 'rent', 'dead-poets-society', 'your-lie-in-april' 3개 작품 모두 등록
INSERT INTO public.arte_musical_application_period (musical_name, start_time, end_time)
VALUES 
    ('rent', NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days'),
    ('dead-poets-society', NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days'),
    ('your-lie-in-april', NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days')
ON CONFLICT (musical_name) 
DO UPDATE SET 
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time;
