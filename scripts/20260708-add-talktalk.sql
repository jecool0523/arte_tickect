CREATE TABLE IF NOT EXISTS public.talktalk_bookings (
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

CREATE INDEX IF NOT EXISTS idx_talktalk_student_id ON public.talktalk_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_talktalk_booking_date ON public.talktalk_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_talktalk_status ON public.talktalk_bookings(status);

ALTER TABLE public.talktalk_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read talktalk_bookings" ON public.talktalk_bookings;
DROP POLICY IF EXISTS "Anyone can insert talktalk_bookings" ON public.talktalk_bookings;
REVOKE ALL ON TABLE public.talktalk_bookings FROM PUBLIC;
REVOKE ALL ON TABLE public.talktalk_bookings FROM anon;
REVOKE ALL ON TABLE public.talktalk_bookings FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.talktalk_bookings TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.talktalk_bookings_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_talktalk_updated_at ON public.talktalk_bookings;
CREATE TRIGGER update_talktalk_updated_at
    BEFORE UPDATE ON public.talktalk_bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.arte_musical_application_period (musical_name, start_time, end_time)
VALUES ('talktalk', NOW() - INTERVAL '1 day', '2026-07-20 23:59:59+09')
ON CONFLICT (musical_name)
DO UPDATE SET
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time;

CREATE OR REPLACE FUNCTION public.book_musical_seats(
    p_musical_id text,
    p_name text,
    p_student_id text,
    p_seat_grade text,
    p_selected_seats text[],
    p_special_request text
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
    v_table_name TEXT;
    v_conflict_seats TEXT[];
    v_new_id BIGINT;
    v_booking_date TIMESTAMP WITH TIME ZONE;
BEGIN
    CASE p_musical_id
        WHEN 'dead-poets-society' THEN v_table_name := 'dead_poets_society_bookings';
        WHEN 'rent' THEN v_table_name := 'rent_bookings';
        WHEN 'your-lie-in-april' THEN v_table_name := 'your_lie_in_april_bookings';
        WHEN 'talktalk' THEN v_table_name := 'talktalk_bookings';
        ELSE
            RETURN jsonb_build_object('success', false, 'error', '잘못된 뮤지컬 ID입니다.');
    END CASE;

    EXECUTE format('LOCK TABLE %I IN EXCLUSIVE MODE', v_table_name);

    EXECUTE format('
        SELECT ARRAY(
            SELECT unnest(selected_seats)
            FROM %I
            WHERE status = ''confirmed''
            AND selected_seats && $1
        )', v_table_name)
    INTO v_conflict_seats
    USING p_selected_seats;

    IF array_length(v_conflict_seats, 1) > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', '선택한 좌석 중 이미 예매된 좌석이 있습니다.',
            'conflictSeats', v_conflict_seats
        );
    END IF;

    EXECUTE format('
        INSERT INTO %I (name, student_id, seat_grade, selected_seats, special_request, status)
        VALUES ($1, $2, $3, $4, $5, ''confirmed'')
        RETURNING id, booking_date
    ', v_table_name)
    INTO v_new_id, v_booking_date
    USING p_name, p_student_id, p_seat_grade, p_selected_seats, p_special_request;

    RETURN jsonb_build_object(
        'success', true,
        'bookingId', v_new_id,
        'bookingDate', v_booking_date
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.book_musical_seats(text, text, text, text, text[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.book_musical_seats(text, text, text, text, text[], text) FROM anon;
REVOKE ALL ON FUNCTION public.book_musical_seats(text, text, text, text, text[], text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.book_musical_seats(text, text, text, text, text[], text) TO service_role;
