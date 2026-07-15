BEGIN;

WITH codes(code) AS (
  VALUES
    ('최무규'),
    ('최유혁')
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
  VALUES
    ('최무규'),
    ('최유혁')
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

UPDATE public.presale_access_keys
SET
  label = '톡톡 선예매 - 박소은 (최대 3석)',
  starts_at = LEAST(COALESCE(starts_at, NOW()), NOW()),
  ends_at = NULL,
  max_uses = 1,
  max_seats_per_booking = 3,
  used_count = 0,
  is_active = TRUE
WHERE musical_id = 'toctoc'
  AND key_hash = extensions.crypt('박소은', key_hash);

-- All bookings were made before the public booking period. The other three
-- bookings match a consumed key within one second; this is the sole unmatched
-- booking after the Park Soeun key was reset.
UPDATE public.toctoc_bookings
SET
  status = 'cancelled',
  updated_at = NOW()
WHERE id = 3
  AND status = 'confirmed'
  AND booking_date = '2026-07-13 15:01:23.863556+00'::TIMESTAMPTZ;

-- A second booking was submitted immediately after the first reset and matched
-- the Park Soeun key consumption timestamp within one second.
UPDATE public.toctoc_bookings
SET
  status = 'cancelled',
  updated_at = NOW()
WHERE id = 5
  AND status = 'confirmed'
  AND booking_date = '2026-07-14 00:10:31.281735+00'::TIMESTAMPTZ;

UPDATE public.presale_access_keys
SET
  used_count = 0,
  max_seats_per_booking = 3,
  is_active = TRUE,
  updated_at = NOW()
WHERE musical_id = 'toctoc'
  AND key_hash = extensions.crypt('박소은', key_hash);

COMMIT;
