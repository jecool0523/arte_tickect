-- 죽은 시인의 사회 전용 테이블
CREATE TABLE IF NOT EXISTS public.dead_poets_society_bookings (
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

-- RENT 뮤지컬 전용 테이블
CREATE TABLE IF NOT EXISTS public.rent_bookings (
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

-- 아르떼 re 전용 테이블
CREATE TABLE IF NOT EXISTS public.your_lie_in_april_bookings (
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_dead_poets_student_id ON public.dead_poets_society_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_dead_poets_booking_date ON public.dead_poets_society_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_dead_poets_status ON public.dead_poets_society_bookings(status);

CREATE INDEX IF NOT EXISTS idx_rent_student_id ON public.rent_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_rent_booking_date ON public.rent_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_rent_status ON public.rent_bookings(status);

CREATE INDEX IF NOT EXISTS idx_your_lie_student_id ON public.your_lie_in_april_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_your_lie_booking_date ON public.your_lie_in_april_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_your_lie_status ON public.your_lie_in_april_bookings(status);

-- RLS 활성화
ALTER TABLE public.dead_poets_society_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.your_lie_in_april_bookings ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Anyone can read dead_poets_bookings" ON public.dead_poets_society_bookings;
DROP POLICY IF EXISTS "Anyone can insert dead_poets_bookings" ON public.dead_poets_society_bookings;
DROP POLICY IF EXISTS "Anyone can read rent_bookings" ON public.rent_bookings;
DROP POLICY IF EXISTS "Anyone can insert rent_bookings" ON public.rent_bookings;
DROP POLICY IF EXISTS "Anyone can read your_lie_bookings" ON public.your_lie_in_april_bookings;
DROP POLICY IF EXISTS "Anyone can insert your_lie_bookings" ON public.your_lie_in_april_bookings;

-- 정책 설정
CREATE POLICY "Anyone can read dead_poets_bookings" ON public.dead_poets_society_bookings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert dead_poets_bookings" ON public.dead_poets_society_bookings FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read rent_bookings" ON public.rent_bookings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert rent_bookings" ON public.rent_bookings FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read your_lie_bookings" ON public.your_lie_in_april_bookings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert your_lie_bookings" ON public.your_lie_in_april_bookings FOR INSERT WITH CHECK (true);

-- 업데이트 트리거 함수 생성 (이미 존재하면 교체)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS update_dead_poets_updated_at ON public.dead_poets_society_bookings;
DROP TRIGGER IF EXISTS update_rent_updated_at ON public.rent_bookings;
DROP TRIGGER IF EXISTS update_your_lie_updated_at ON public.your_lie_in_april_bookings;

CREATE TRIGGER update_dead_poets_updated_at 
    BEFORE UPDATE ON public.dead_poets_society_bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rent_updated_at 
    BEFORE UPDATE ON public.rent_bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_your_lie_updated_at 
    BEFORE UPDATE ON public.your_lie_in_april_bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 테스트 데이터 삽입 (선택사항)
INSERT INTO public.dead_poets_society_bookings (name, student_id, seat_grade, selected_seats, special_request) 
VALUES 
    ('테스트 사용자', '1234', 'VIP', ARRAY['1층-앞-1줄-중앙-5번', '1층-앞-1줄-중앙-6번'], '테스트 예매')
ON CONFLICT DO NOTHING;
