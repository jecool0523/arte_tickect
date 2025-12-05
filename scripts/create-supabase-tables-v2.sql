-- arte_musical_tickets 테이블 생성
CREATE TABLE IF NOT EXISTS public.arte_musical_tickets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    student_id VARCHAR(20) NOT NULL,
    seat_grade VARCHAR(10) NOT NULL,
    selected_seats TEXT[] NOT NULL,
    special_request TEXT,
    booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_arte_tickets_student_id ON public.arte_musical_tickets(student_id);
CREATE INDEX IF NOT EXISTS idx_arte_tickets_booking_date ON public.arte_musical_tickets(booking_date);
CREATE INDEX IF NOT EXISTS idx_arte_tickets_status ON public.arte_musical_tickets(status);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.arte_musical_tickets ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Anyone can read tickets" ON public.arte_musical_tickets;
DROP POLICY IF EXISTS "Anyone can insert tickets" ON public.arte_musical_tickets;

-- 모든 사용자가 읽기 가능하도록 정책 설정
CREATE POLICY "Anyone can read tickets" ON public.arte_musical_tickets
    FOR SELECT USING (true);

-- 모든 사용자가 삽입 가능하도록 정책 설정
CREATE POLICY "Anyone can insert tickets" ON public.arte_musical_tickets
    FOR INSERT WITH CHECK (true);

-- 업데이트 트리거 함수 생성 (이미 존재하면 교체)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = '' -- [추가된 부분] 보안을 위해 검색 경로를 제한
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;
-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS update_arte_tickets_updated_at ON public.arte_musical_tickets;
CREATE TRIGGER update_arte_tickets_updated_at 
    BEFORE UPDATE ON public.arte_musical_tickets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 테스트 데이터 삽입 (선택사항)
INSERT INTO public.arte_musical_tickets (name, student_id, seat_grade, selected_seats, special_request) 
VALUES 
    ('테스트 사용자', '1234', 'VIP', ARRAY['1층-앞-1줄-중앙-5번', '1층-앞-1줄-중앙-6번'], '테스트 예매')
ON CONFLICT DO NOTHING;
