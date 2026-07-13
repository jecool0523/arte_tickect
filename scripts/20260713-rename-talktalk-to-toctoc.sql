-- Rename the existing Talk Talk booking data to the canonical frontend ID.
-- This migration preserves existing bookings and is safe to run more than once.

DO $$
BEGIN
    IF to_regclass('public.talktalk_bookings') IS NOT NULL
       AND to_regclass('public.toctoc_bookings') IS NULL THEN
        ALTER TABLE public.talktalk_bookings RENAME TO toctoc_bookings;
    END IF;
END;
$$;

DO $$
BEGIN
    IF to_regclass('public.talktalk_bookings_id_seq') IS NOT NULL
       AND to_regclass('public.toctoc_bookings_id_seq') IS NULL THEN
        ALTER SEQUENCE public.talktalk_bookings_id_seq RENAME TO toctoc_bookings_id_seq;
    END IF;
END;
$$;

DO $$
BEGIN
    IF to_regclass('public.idx_talktalk_student_id') IS NOT NULL
       AND to_regclass('public.idx_toctoc_student_id') IS NULL THEN
        ALTER INDEX public.idx_talktalk_student_id RENAME TO idx_toctoc_student_id;
    END IF;

    IF to_regclass('public.idx_talktalk_booking_date') IS NOT NULL
       AND to_regclass('public.idx_toctoc_booking_date') IS NULL THEN
        ALTER INDEX public.idx_talktalk_booking_date RENAME TO idx_toctoc_booking_date;
    END IF;

    IF to_regclass('public.idx_talktalk_status') IS NOT NULL
       AND to_regclass('public.idx_toctoc_status') IS NULL THEN
        ALTER INDEX public.idx_talktalk_status RENAME TO idx_toctoc_status;
    END IF;
END;
$$;

DO $$
BEGIN
    IF to_regclass('public.toctoc_bookings') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM pg_trigger
           WHERE tgrelid = 'public.toctoc_bookings'::regclass
             AND tgname = 'update_talktalk_updated_at'
       )
       AND NOT EXISTS (
           SELECT 1
           FROM pg_trigger
           WHERE tgrelid = 'public.toctoc_bookings'::regclass
             AND tgname = 'update_toctoc_updated_at'
       ) THEN
        ALTER TRIGGER update_talktalk_updated_at ON public.toctoc_bookings
            RENAME TO update_toctoc_updated_at;
    END IF;
END;
$$;

ALTER TABLE public.toctoc_bookings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.toctoc_bookings FROM PUBLIC;
REVOKE ALL ON TABLE public.toctoc_bookings FROM anon;
REVOKE ALL ON TABLE public.toctoc_bookings FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.toctoc_bookings TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.toctoc_bookings_id_seq TO service_role;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.arte_musical_application_period
        WHERE musical_name = 'toctoc'
    ) AND EXISTS (
        SELECT 1 FROM public.arte_musical_application_period
        WHERE musical_name = 'talktalk'
    ) THEN
        DELETE FROM public.arte_musical_application_period
        WHERE musical_name = 'talktalk';
    ELSE
        UPDATE public.arte_musical_application_period
        SET musical_name = 'toctoc'
        WHERE musical_name = 'talktalk';
    END IF;
END;
$$;

UPDATE public.reviews
SET musical_id = 'toctoc'
WHERE musical_id = 'talktalk';

UPDATE public.presale_access_keys
SET musical_id = 'toctoc'
WHERE musical_id = 'talktalk';

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
        WHEN 'toctoc' THEN v_table_name := 'toctoc_bookings';
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
