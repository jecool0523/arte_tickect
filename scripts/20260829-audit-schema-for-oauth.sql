-- Read-only inventory to run in the Supabase SQL editor before dropping anything.
-- estimated_rows comes from PostgreSQL statistics and may be approximate.

WITH expected(table_name, classification, reason) AS (
  VALUES
    ('dead_poets_society_bookings', 'core', 'Referenced by MUSICAL_DATABASE_CONFIG'),
    ('rent_bookings', 'core', 'Referenced by MUSICAL_DATABASE_CONFIG'),
    ('toctoc_bookings', 'core', 'Referenced by MUSICAL_DATABASE_CONFIG'),
    ('arte_musical_application_period', 'core', 'Booking API checks the sale window'),
    ('reviews', 'core', 'Review API reads and writes this table'),
    ('presale_access_keys', 'core', 'Presale RPCs depend on this table'),
    ('api_rate_limits', 'infrastructure', 'Server APIs use check_rate_limit'),
    ('profiles', 'oauth-foundation', 'One-to-one application profile for auth.users'),
    ('arte_musical_tickets', 'legacy-candidate', 'Only the legacy /api/seats route references it'),
    ('bookings', 'unused-candidate', 'Only an obsolete setup script references it'),
    ('seat_status', 'unused-candidate', 'Runtime derives occupancy from booking arrays'),
    ('your_lie_in_april_bookings', 'unused-candidate', 'No musical config or runtime reference'),
    ('talktalk_bookings', 'unused-candidate', 'Pre-rename table; replaced by toctoc_bookings')
)
SELECT
  e.classification,
  e.table_name,
  to_regclass(format('public.%I', e.table_name)) IS NOT NULL AS exists,
  coalesce(s.n_live_tup, 0) AS estimated_rows,
  pg_size_pretty(coalesce(pg_total_relation_size(to_regclass(format('public.%I', e.table_name))), 0)) AS total_size,
  e.reason
FROM expected e
LEFT JOIN pg_stat_user_tables s
  ON s.schemaname = 'public' AND s.relname = e.table_name
ORDER BY e.classification, e.table_name;

-- Review every policy affecting the application tables.
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Confirm OAuth ownership columns and constraints after applying the migration.
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name = 'profiles' OR column_name = 'user_id')
ORDER BY table_name, ordinal_position;

-- Check for views and foreign keys that could block a future legacy-table drop.
SELECT dependent_ns.nspname AS dependent_schema,
       dependent_view.relname AS dependent_view,
       source_ns.nspname AS source_schema,
       source_table.relname AS source_table
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class source_table ON pg_depend.refobjid = source_table.oid
JOIN pg_namespace dependent_ns ON dependent_view.relnamespace = dependent_ns.oid
JOIN pg_namespace source_ns ON source_table.relnamespace = source_ns.oid
WHERE source_ns.nspname = 'public'
  AND source_table.relname IN ('arte_musical_tickets', 'bookings', 'seat_status', 'your_lie_in_april_bookings', 'talktalk_bookings')
  AND dependent_view.relkind IN ('v', 'm');

SELECT
  tc.table_name,
  tc.constraint_name,
  ccu.table_name AS referenced_table
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
 AND ccu.constraint_schema = tc.constraint_schema
WHERE tc.constraint_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name IN ('arte_musical_tickets', 'bookings', 'seat_status', 'your_lie_in_april_bookings', 'talktalk_bookings')
       OR ccu.table_name IN ('arte_musical_tickets', 'bookings', 'seat_status', 'your_lie_in_april_bookings', 'talktalk_bookings'))
ORDER BY tc.table_name, tc.constraint_name;
