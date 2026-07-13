CREATE OR REPLACE FUNCTION public.validate_presale_access_key(
  p_musical_id TEXT,
  p_key TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT p_musical_id IS NOT NULL
    AND p_key IS NOT NULL
    AND BTRIM(p_key) <> ''
    AND EXISTS (
      SELECT 1
      FROM public.presale_access_keys
      WHERE musical_id = BTRIM(p_musical_id)
        AND is_active = TRUE
        AND key_hash = extensions.crypt(BTRIM(p_key), key_hash)
        AND (starts_at IS NULL OR NOW() >= starts_at)
        AND (ends_at IS NULL OR NOW() <= ends_at)
        AND (max_uses IS NULL OR used_count < max_uses)
    );
$$;

REVOKE ALL ON FUNCTION public.validate_presale_access_key(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_presale_access_key(TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_presale_access_key(TEXT, TEXT) TO service_role;
