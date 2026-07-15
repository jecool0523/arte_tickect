BEGIN;

WITH codes(code) AS (
  VALUES ('김규진')
)
UPDATE public.presale_access_keys AS access_key
SET
  label = '톡톡 선예매 - ' || codes.code || ' (최대 3석)',
  starts_at = LEAST(COALESCE(access_key.starts_at, NOW()), NOW()),
  ends_at = NULL,
  max_uses = 1,
  max_seats_per_booking = 3,
  is_active = TRUE
FROM codes
WHERE access_key.musical_id = 'toctoc'
  AND access_key.key_hash = extensions.crypt(codes.code, access_key.key_hash);

WITH codes(code) AS (
  VALUES ('김규진')
)
INSERT INTO public.presale_access_keys (
  musical_id,
  key_hash,
  label,
  starts_at,
  ends_at,
  max_uses,
  max_seats_per_booking,
  used_count,
  is_active
)
SELECT
  'toctoc',
  extensions.crypt(codes.code, extensions.gen_salt('bf')),
  '톡톡 선예매 - ' || codes.code || ' (최대 3석)',
  NOW(),
  NULL,
  1,
  3,
  0,
  TRUE
FROM codes
WHERE NOT EXISTS (
  SELECT 1
  FROM public.presale_access_keys AS access_key
  WHERE access_key.musical_id = 'toctoc'
    AND access_key.key_hash = extensions.crypt(codes.code, access_key.key_hash)
);

UPDATE public.toctoc_bookings
SET
  status = 'cancelled',
  updated_at = NOW()
WHERE (
    id = 2
    AND booking_date = '2026-07-13 14:51:50.897971+00'::TIMESTAMPTZ
  ) OR (
    id = 6
    AND booking_date = '2026-07-14 00:33:47.101649+00'::TIMESTAMPTZ
  );

WITH codes(code) AS (
  VALUES ('김보경'), ('박소은')
)
UPDATE public.presale_access_keys AS access_key
SET
  used_count = 0,
  is_active = TRUE,
  updated_at = NOW()
FROM codes
WHERE access_key.musical_id = 'toctoc'
  AND access_key.key_hash = extensions.crypt(codes.code, access_key.key_hash);

DO $$
DECLARE
  booking_result JSONB;
  target_seats TEXT[] := ARRAY[
    'F1-VIP-R01-C01',
    'F1-VIP-R01-C02',
    'F1-VIP-R01-C03',
    'F1-VIP-R01-C04'
  ];
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.toctoc_bookings
    WHERE status = 'confirmed'
      AND name = '선배'
      AND student_id = '0000'
      AND selected_seats @> target_seats
      AND target_seats @> selected_seats
  ) THEN
    RETURN;
  END IF;

  SELECT public.book_musical_seats(
    'toctoc',
    '선배',
    '0000',
    'VIP',
    target_seats,
    '관리자 지정 예약: 1열 중앙 1~4번'
  )
  INTO booking_result;

  IF NOT COALESCE((booking_result->>'success')::BOOLEAN, FALSE) THEN
    RAISE EXCEPTION 'center seat booking failed: %', booking_result;
  END IF;
END;
$$;

COMMIT;
