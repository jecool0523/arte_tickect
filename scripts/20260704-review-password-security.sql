-- Review password hardening.
-- Run this in Supabase SQL editor before deploying the review API changes.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.reviews (
    id BIGSERIAL PRIMARY KEY,
    musical_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    password TEXT,
    password_hash TEXT,
    content TEXT NOT NULL,
    image_url TEXT,
    rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS password_hash TEXT;

UPDATE public.reviews
SET password_hash = extensions.crypt(password, extensions.gen_salt('bf'))
WHERE password_hash IS NULL
  AND password IS NOT NULL
  AND password <> '';

UPDATE public.reviews
SET password = NULL
WHERE password_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_musical_created_at
ON public.reviews (musical_id, created_at DESC);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read reviews" ON public.reviews;
CREATE POLICY "Public can read reviews"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public can insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public can delete reviews" ON public.reviews;

CREATE OR REPLACE FUNCTION public.create_review(
    p_musical_id TEXT,
    p_user_name TEXT,
    p_password TEXT,
    p_content TEXT,
    p_rating INTEGER,
    p_image_url TEXT DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    musical_id TEXT,
    user_name TEXT,
    content TEXT,
    image_url TEXT,
    rating INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    INSERT INTO public.reviews (musical_id, user_name, password_hash, content, rating, image_url)
    VALUES (
        p_musical_id,
        p_user_name,
        extensions.crypt(p_password, extensions.gen_salt('bf')),
        p_content,
        LEAST(GREATEST(p_rating, 1), 5),
        p_image_url
    )
    RETURNING
        reviews.id,
        reviews.musical_id,
        reviews.user_name,
        reviews.content,
        reviews.image_url,
        reviews.rating,
        reviews.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_review_with_password(
    p_review_id BIGINT,
    p_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    DELETE FROM public.reviews
    WHERE id = p_review_id
      AND password_hash = extensions.crypt(p_password, password_hash);

    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.create_review(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_review_with_password(BIGINT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_review(TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_review_with_password(BIGINT, TEXT) TO service_role;
