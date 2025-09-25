-- arte_musical_tickets 테이블 생성
CREATE TABLE IF NOT EXISTS arte_musical_tickets (
    id SERIAL PRIMARY KEY,
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
CREATE INDEX IF NOT EXISTS idx_arte_tickets_student_id ON arte_musical_tickets(student_id);
CREATE INDEX IF NOT EXISTS idx_arte_tickets_booking_date ON arte_musical_tickets(booking_date);
CREATE INDEX IF NOT EXISTS idx_arte_tickets_status ON arte_musical_tickets(status);

-- RLS (Row Level Security) 활성화
ALTER TABLE arte_musical_tickets ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능하도록 정책 설정
CREATE POLICY "Anyone can read tickets" ON arte_musical_tickets
    FOR SELECT USING (true);

-- 모든 사용자가 삽입 가능하도록 정책 설정
CREATE POLICY "Anyone can insert tickets" ON arte_musical_tickets
    FOR INSERT WITH CHECK (true);

-- 업데이트 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 업데이트 트리거 생성
CREATE TRIGGER update_arte_tickets_updated_at 
    BEFORE UPDATE ON arte_musical_tickets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
