-- Additive structural cleanup. No row update/delete, table rename, merge, or table drop.
-- Applied through Supabase apply_migration; remote migration history is authoritative.
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Keep the constraint-owned unique index and the original review-owner index.
drop index public.arte_period_musical_unique;
drop index public.reviews_fan_user_id_idx;

-- Equality on owner, then booking-date order. The owner prefix also supports FK cleanup.
create index idx_arte_musical_tickets_owner_date on public.arte_musical_tickets (user_id, booking_date desc) where user_id is not null;
create index idx_dead_poets_society_bookings_owner_date on public.dead_poets_society_bookings (user_id, booking_date desc) where user_id is not null;
create index idx_rent_bookings_owner_date on public.rent_bookings (user_id, booking_date desc) where user_id is not null;
create index idx_toctoc_bookings_owner_date on public.toctoc_bookings (user_id, booking_date desc) where user_id is not null;
-- Superseded, non-unique indexes. No constraints depend on these six removed indexes.
drop index public.idx_arte_musical_tickets_user_id;
drop index public.idx_dead_poets_society_bookings_user_id;
drop index public.idx_rent_bookings_user_id;
drop index public.idx_toctoc_bookings_user_id;

-- Preflight found no null statuses/dates, unknown statuses, or empty/null-element seat arrays.
-- Preserve the historical booking with >10 seats; only NEW requests have the 10-seat limit.
do $$
declare t text;
begin
  foreach t in array array['arte_musical_tickets','dead_poets_society_bookings','rent_bookings','toctoc_bookings'] loop
    execute format('alter table public.%I alter column status set not null, alter column booking_date set not null', t);
    execute format('alter table public.%I add constraint %I check (status in (''confirmed'',''completed'',''cancelled'')) not valid', t, t||'_status_check');
    execute format('alter table public.%I validate constraint %I', t, t||'_status_check');
    execute format('alter table public.%I add constraint %I check (cardinality(selected_seats) > 0 and array_position(selected_seats, null) is null) not valid', t, t||'_seats_nonempty_check');
    execute format('alter table public.%I validate constraint %I', t, t||'_seats_nonempty_check');
  end loop;
end $$;

alter table public.arte_musical_application_period
  add constraint booking_period_time_order check (start_time < end_time) not valid;
alter table public.arte_musical_application_period validate constraint booking_period_time_order;
alter table public.performance_settings
  add constraint performance_settings_period_fkey foreign key (musical_id)
  references public.arte_musical_application_period(musical_name) on delete restrict not valid;
alter table public.performance_settings validate constraint performance_settings_period_fkey;

alter table public.reviews alter column rating set not null, alter column created_at set not null;
alter table public.reviews add constraint reviews_rating_range check (rating between 1 and 5) not valid;
alter table public.reviews validate constraint reviews_rating_range;

-- Describe lifecycle without moving tables, invalidating ticket IDs, or broadening grants.
comment on table public.profiles is 'ACTIVE: one-to-one auth.users profile, completed identity and DB-managed admin/presale flags. Browser cannot update role flags.';
comment on column public.profiles.is_admin is 'Managed by verified administrators through server-only RPC; never derived from user metadata.';
comment on column public.profiles.is_presale_user is 'Account-wide presale permission before public opening only; does not bypass booking end time.';
comment on table public.arte_musical_application_period is 'ACTIVE: unique musical_name with public booking start/end timestamps; settings reference this key.';
comment on table public.performance_settings is 'ACTIVE: public performance overrides; musical_id references booking-period musical_name. Admin-only writes.';
comment on table public.dead_poets_society_bookings is 'ACTIVE: dead-poets-society reservations. Existing IDs, seats and owner links are retained.';
comment on table public.rent_bookings is 'ACTIVE: rent reservations. Existing IDs, seats and owner links are retained.';
comment on table public.toctoc_bookings is 'ACTIVE: toctoc reservations. Existing IDs, seats and owner links are retained.';
comment on table public.arte_musical_tickets is 'LEGACY-COMPATIBLE: historical tickets still used by owner history, ticket display, profile sync and fan XP. Do not delete or renumber.';
comment on table public.reviews is 'ACTIVE: public review text; ownership and deletion-token hash are server-only. Anonymous reviews are not inferred as account-owned.';
comment on table public.api_rate_limits is 'INTERNAL: server-only request windows; subject_hash is not a raw address. RLS deny-by-default is intentional.';
comment on table private.fan_visits is 'INTERNAL: one visit per account per Korea-calendar day; profile FK cascades on account removal. Server-only access.';
comment on table public.presale_access_keys is 'RETIRED: historical code records retained. Current booking uses profiles.is_presale_user; code validation HTTP endpoint returns 410.';
comment on table public.bookings is 'RETIRED: unused predecessor booking model. Retained with seat_status dependencies; not part of account booking history.';
comment on table public.seat_status is 'RETIRED: predecessor seats linked to bookings; existing records retained. Current seats derive from musical-specific bookings.';
comment on table public."review-images" is 'RETIRED: unused predecessor metadata table, NOT the Storage review-images bucket. Storage files must remain untouched.';
