-- 죽은 시인의 사회 전용 테이블
CREATE TABLE IF NOT EXISTS dead_poets_society_bookings (
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
CREATE TABLE IF NOT EXISTS rent_bookings (
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
CREATE TABLE IF NOT EXISTS your_lie_in_april_bookings (
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
CREATE INDEX IF NOT EXISTS idx_dead_poets_student_id ON dead_poets_society_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_dead_poets_booking_date ON dead_poets_society_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_dead_poets_status ON dead_poets_society_bookings(status);

CREATE INDEX IF NOT EXISTS idx_rent_student_id ON rent_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_rent_booking_date ON rent_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_rent_status ON rent_bookings(status);

CREATE INDEX IF NOT EXISTS idx_your_lie_student_id ON your_lie_in_april_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_your_lie_booking_date ON your_lie_in_april_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_your_lie_status ON your_lie_in_april_bookings(status);

-- RLS 활성화
ALTER TABLE dead_poets_society_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE your_lie_in_april_bookings ENABLE ROW LEVEL SECURITY;

-- 정책 설정
CREATE POLICY "Anyone can read dead_poets_bookings" ON dead_poets_society_bookings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert dead_poets_bookings" ON dead_poets_society_bookings FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read rent_bookings" ON rent_bookings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert rent_bookings" ON rent_bookings FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read your_lie_bookings" ON your_lie_in_april_bookings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert your_lie_bookings" ON your_lie_in_april_bookings FOR INSERT WITH CHECK (true);

-- 업데이트 트리거 생성
CREATE TRIGGER update_dead_poets_updated_at 
    BEFORE UPDATE ON dead_poets_society_bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rent_updated_at 
    BEFORE UPDATE ON rent_bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_your_lie_updated_at 
    BEFORE UPDATE ON your_lie_in_april_bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
