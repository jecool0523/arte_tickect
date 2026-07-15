BEGIN;

WITH codes(code) AS (
  VALUES
    ('권재현'),
    ('김단아'),
    ('김현호'),
    ('이태인')
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
    ('권재현'),
    ('김단아'),
    ('김현호'),
    ('이태인')
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

COMMIT;
