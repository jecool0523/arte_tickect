-- 예매 정보를 저장할 테이블 생성
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    student_id VARCHAR(20) NOT NULL,
    seat_grade VARCHAR(10) NOT NULL,
    selected_seats TEXT[] NOT NULL,
    special_request TEXT,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'confirmed'
);

-- 좌석 상태를 관리할 테이블 생성
CREATE TABLE IF NOT EXISTS seat_status (
    id SERIAL PRIMARY KEY,
    seat_id VARCHAR(20) NOT NULL UNIQUE,
    seat_grade VARCHAR(10) NOT NULL,
    floor VARCHAR(10) NOT NULL,
    status VARCHAR(20) DEFAULT 'available', -- available, reserved, unavailable
    booking_id INTEGER REFERENCES bookings(id),
    reserved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 기본 좌석 데이터 삽입
INSERT INTO seat_status (seat_id, seat_grade, floor, status) VALUES
-- 1층 VIP석
('A-5', 'VIP', '1층', 'unavailable'),
('A-16', 'VIP', '1층', 'unavailable'),
('B-8', 'VIP', '1층', 'unavailable'),
('B-12', 'VIP', '1층', 'unavailable'),
('C-3', 'VIP', '1층', 'unavailable'),
('C-18', 'VIP', '1층', 'unavailable'),

-- 1층 R석
('D-7', 'R', '1층', 'unavailable'),
('D-15', 'R', '1층', 'unavailable'),
('E-4', 'R', '1층', 'unavailable'),
('E-19', 'R', '1층', 'unavailable'),
('F-11', 'R', '1층', 'unavailable'),
('G-6', 'R', '1층', 'unavailable'),
('G-17', 'R', '1층', 'unavailable'),

-- 2층 S석
('H-9', 'S', '2층', 'unavailable'),
('I-13', 'S', '2층', 'unavailable'),
('J-2', 'S', '2층', 'unavailable'),
('J-22', 'S', '2층', 'unavailable'),
('K-8', 'S', '2층', 'unavailable'),
('K-16', 'S', '2층', 'unavailable'),
('L-5', 'S', '2층', 'unavailable'),
('L-20', 'S', '2층', 'unavailable'),

-- 2층 A석
('M-12', 'A', '2층', 'unavailable'),
('N-7', 'A', '2층', 'unavailable'),
('N-19', 'A', '2층', 'unavailable'),
('O-4', 'A', '2층', 'unavailable'),
('O-23', 'A', '2층', 'unavailable'),
('P-10', 'A', '2층', 'unavailable'),
('P-17', 'A', '2층', 'unavailable');
