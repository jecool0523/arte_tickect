BEGIN;

WITH codes(code) AS (
  VALUES
    ('구민찬'),
    ('김보경'),
    ('김아린'),
    ('박동우'),
    ('최율하'),
    ('김우찬'),
    ('차예린'),
    ('김근우'),
    ('조경윤'),
    ('박근우'),
    ('곽승현'),
    ('김승현'),
    ('박소은')
)
UPDATE public.presale_access_keys AS access_key
SET
  label = '톡톡 선예매 - ' || codes.code || ' (최대 2석)',
  starts_at = LEAST(COALESCE(access_key.starts_at, NOW()), NOW()),
  ends_at = NULL,
  max_uses = 1,
  is_active = TRUE
FROM codes
WHERE access_key.musical_id = 'toctoc'
  AND access_key.key_hash = extensions.crypt(codes.code, access_key.key_hash);

WITH codes(code) AS (
  VALUES
    ('구민찬'),
    ('김보경'),
    ('김아린'),
    ('박동우'),
    ('최율하'),
    ('김우찬'),
    ('차예린'),
    ('김근우'),
    ('조경윤'),
    ('박근우'),
    ('곽승현'),
    ('김승현'),
    ('박소은')
)
INSERT INTO public.presale_access_keys (
  musical_id,
  key_hash,
  label,
  starts_at,
  ends_at,
  max_uses,
  used_count,
  is_active
)
SELECT
  'toctoc',
  extensions.crypt(codes.code, extensions.gen_salt('bf')),
  '톡톡 선예매 - ' || codes.code || ' (최대 2석)',
  NOW(),
  NULL,
  1,
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

SELECT
  label,
  starts_at,
  ends_at,
  max_uses,
  used_count,
  is_active
FROM public.presale_access_keys
WHERE musical_id = 'toctoc'
  AND label LIKE '톡톡 선예매 - % (최대 2석)'
ORDER BY label;
