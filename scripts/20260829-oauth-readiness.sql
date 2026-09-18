-- OAuth ownership foundation. Safe to run repeatedly.
-- This migration does not claim existing tickets or delete legacy data.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 100),
  student_id TEXT CHECK (student_id IS NULL OR student_id ~ '^[A-Za-z0-9_-]{1,20}$'),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_student_id_unique
  ON public.profiles (student_id)
  WHERE student_id IS NOT NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (display_name, student_id, avatar_url) ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NULLIF(left(btrim(coalesce(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      ''
    )), 100), ''),
    NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.touch_profile_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_profile_updated_at ON public.profiles;
CREATE TRIGGER touch_profile_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_profile_updated_at();

REVOKE ALL ON FUNCTION public.touch_profile_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_profile_updated_at() TO service_role;

-- Keep the column nullable so pre-OAuth records continue to work.
ALTER TABLE IF EXISTS public.dead_poets_society_bookings
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.rent_bookings
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.toctoc_bookings
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.arte_musical_tickets
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.reviews
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'dead_poets_society_bookings',
    'rent_bookings',
    'toctoc_bookings',
    'arte_musical_tickets'
  ] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      -- Browser clients may only read rows they own. Writes continue through
      -- the existing server API, which uses service_role.
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I (user_id) WHERE user_id IS NOT NULL',
        'idx_' || table_name || '_user_id',
        table_name
      );
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated', table_name);
      EXECUTE format('DROP POLICY IF EXISTS "Users can read own bookings" ON public.%I', table_name);
      EXECUTE format(
        'CREATE POLICY "Users can read own bookings" ON public.%I FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id)',
        table_name
      );
    END IF;
  END LOOP;
END;
$$;

-- Quarantine legacy/public PII paths. The current application reads and writes
-- bookings and reviews through server-only API routes, so these grants are not
-- required by the browser. Keep the empty legacy tables for a later reviewed
-- cleanup migration instead of deleting them here.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'bookings',
    'seat_status',
    'reviews',
    'review-images'
  ] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
    END IF;
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Anyone can read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can read seat_status" ON public.seat_status;
DROP POLICY IF EXISTS "Anyone can read dead_poets_bookings" ON public.dead_poets_society_bookings;
DROP POLICY IF EXISTS "Anyone can insert dead_poets_bookings" ON public.dead_poets_society_bookings;
DROP POLICY IF EXISTS "Anyone can read rent_bookings" ON public.rent_bookings;
DROP POLICY IF EXISTS "Anyone can insert rent_bookings" ON public.rent_bookings;
DROP POLICY IF EXISTS "Public can read reviews" ON public.reviews;
DROP POLICY IF EXISTS "Deny public access" ON public.arte_musical_tickets;

-- The application period is public information, but it is read-only to browser
-- roles. Administrative changes continue through service_role.
REVOKE ALL ON TABLE public.arte_musical_application_period FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.arte_musical_application_period TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_reviews_user_id
  ON public.reviews (user_id)
  WHERE user_id IS NOT NULL;

COMMENT ON TABLE public.profiles IS 'Application profile keyed one-to-one to auth.users.';
COMMENT ON COLUMN public.profiles.student_id IS 'User-entered school identifier; do not use as proof of identity until separately verified.';

-- Backfill profiles if this migration is applied after users already exist.
INSERT INTO public.profiles (id, display_name, avatar_url)
SELECT
  id,
  NULLIF(left(btrim(coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', '')), 100), ''),
  NULLIF(raw_user_meta_data ->> 'avatar_url', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;
