BEGIN;

ALTER TABLE public.presale_access_keys
  ADD COLUMN IF NOT EXISTS max_seats_per_booking INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'presale_access_keys_max_seats_positive'
      AND conrelid = 'public.presale_access_keys'::regclass
  ) THEN
    ALTER TABLE public.presale_access_keys
      ADD CONSTRAINT presale_access_keys_max_seats_positive
      CHECK (max_seats_per_booking IS NULL OR max_seats_per_booking > 0);
  END IF;
END;
$$;

UPDATE public.presale_access_keys
SET max_seats_per_booking = 2
WHERE musical_id = 'toctoc'
  AND label LIKE '톡톡 선예매 - % (최대 2석)';

CREATE OR REPLACE FUNCTION public.get_presale_access_key_seat_limit(
  p_musical_id TEXT,
  p_key TEXT
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT max_seats_per_booking
  FROM public.presale_access_keys
  WHERE p_musical_id IS NOT NULL
    AND p_key IS NOT NULL
    AND BTRIM(p_key) <> ''
    AND musical_id = BTRIM(p_musical_id)
    AND is_active = TRUE
    AND key_hash = extensions.crypt(BTRIM(p_key), key_hash)
    AND (starts_at IS NULL OR NOW() >= starts_at)
    AND (ends_at IS NULL OR NOW() <= ends_at)
    AND (max_uses IS NULL OR used_count < max_uses)
  ORDER BY id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_presale_access_key_seat_limit(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_presale_access_key_seat_limit(TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_presale_access_key_seat_limit(TEXT, TEXT) TO service_role;

WITH codes(code) AS (
  VALUES
    ('이채현'),
    ('김지오'),
    ('조민서'),
    ('이하린'),
    ('전소현'),
    ('박재윤'),
    ('변제규'),
    ('진서윤'),
    ('오건우')
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
    ('이채현'),
    ('김지오'),
    ('조민서'),
    ('이하린'),
    ('전소현'),
    ('박재윤'),
    ('변제규'),
    ('진서윤'),
    ('오건우')
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
