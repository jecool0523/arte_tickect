-- Active booking flow indexes and statistics refresh.
-- Safe to run repeatedly.

CREATE INDEX IF NOT EXISTS idx_toctoc_status_booking_date
    ON public.toctoc_bookings (status, booking_date DESC);

CREATE INDEX IF NOT EXISTS idx_seat_status_booking_id
    ON public.seat_status (booking_id);

DO $$
BEGIN
    IF to_regclass('public.talktalk_bookings_pkey') IS NOT NULL
       AND to_regclass('public.toctoc_bookings_pkey') IS NULL THEN
        ALTER INDEX public.talktalk_bookings_pkey RENAME TO toctoc_bookings_pkey;
    END IF;
END
$$;

ANALYZE public.toctoc_bookings;
ANALYZE public.presale_access_keys;
ANALYZE public.seat_status;
