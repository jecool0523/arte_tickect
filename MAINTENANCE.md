# ARTE Ticketing Maintenance Notes

Last checked: 2026-07-13

## Project Shape

- Framework: Next.js 14 App Router, React 18, Tailwind CSS, shadcn-style UI primitives.
- Main screen/state coordinator: `app/page.tsx`.
- Core UI:
  - `components/home-screen.tsx`: performance list, verification entry, ARTE info entry.
  - `components/musical-detail.tsx`: performance detail, cast, reviews.
  - `components/booking-form.tsx`: attendee info and booking submit form.
  - `components/seat-selection-window.tsx`: manual seat map and selection.
  - `components/booking-verification.tsx`: lookup existing reservations.
  - `components/review-section.tsx`: Supabase-backed review/media feature.
- Data:
  - `data/musicals.ts`: static performance/cast/seat-grade metadata.
  - `types/musical.ts`: shared musical data types.
  - `lib/seat-map.ts`: shared floor/section/row/seat ID generation for desktop and mobile seat maps.
- Backend/API:
  - `app/api/bookings/[musicalId]/route.ts`: current musical-specific booking API using Supabase RPC.
  - `app/api/seats/[musicalId]/route.ts`: musical-specific unavailable seat API.
  - `app/api/bookings/verify/route.ts`: booking lookup.
  - Legacy/general APIs still exist at `app/api/bookings/route.ts` and `app/api/seats/route.ts`.
- Supabase project: `arte musical ticket` (`kwkhydnvbxvcfvhksxna`, ap-northeast-2).
- Database scripts live in `scripts/`; the current path depends on musical-specific booking tables plus `arte_musical_application_period` and the `book_musical_seats` RPC.
- Current musical-specific booking tables in app config: `dead_poets_society_bookings`, `rent_bookings`, and `toctoc_bookings`.
- Presale booking keys are stored in `presale_access_keys` through hashed values only. The app submits a key to `/api/bookings/[musicalId]`, and the server validates/consumes it through service-role-only RPCs.

## Local Setup

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Copy `.env.example` to `.env.local` and fill:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Supabase clients are created lazily in `lib/supabase.ts`, so importing route modules no longer fails just because build-time env vars are absent.

## Verification Baseline

The current maintenance baseline passes:

```bash
node_modules/.bin/tsc.CMD --noEmit
pnpm lint
pnpm build
```

Notes:

- `next.config.mjs` no longer suppresses TypeScript or ESLint failures.
- `.eslintrc.json` uses `next/core-web-vitals`.
- Legacy `/api/seats` is marked dynamic and no longer tries to fetch Supabase during static prerender.
- `package.json` pins previously `latest` dependencies to the versions already represented in the lockfile.
- Supabase client creation is typed with `types/supabase.ts`.
- Musical booking table names, seat availability aggregation, and seat-map generation are centralized in `lib/musical-config.ts` and `lib/seat-map.ts`.
- Review creation/deletion now goes through server API routes and the `create_review` / `delete_review_with_password` SQL functions.
- Presale booking before the public booking window goes through the `consume_presale_access_key` / `release_presale_access_key` SQL functions.

## Fixed In This Batch

1. Added ESLint config and required lint dependencies.
2. Re-enabled build-time type and lint validation.
3. Fixed TypeScript errors in navigation callbacks, review deletion, API response typing, and missing separator UI primitive.
4. Made Supabase browser/server clients lazy instead of creating clients at module import time.
5. Marked API routes that depend on request/database state as dynamic.
6. Added `.env.example` and updated `.gitignore` for local environment safety.
7. Reduced review-list exposure by no longer selecting stored review passwords when displaying reviews.

## Fixed In Second Batch

1. Added `types/supabase.ts` based on the current SQL scripts and API usage.
2. Replaced the temporary untyped Supabase client wrapper with `SupabaseClient<Database>`.
3. Added `lib/musical-config.ts` for performance-to-table mapping, seat grade normalization, unavailable-seat aggregation, and booking statistics.
4. Updated booking verification and seat APIs to use the shared musical/seat configuration.
5. Added `/api/reviews` and `/api/reviews/[reviewId]` so review writes and deletes run server-side with the service-role client.
6. Added `scripts/20260704-review-password-security.sql` to create/backfill `password_hash` and verify delete passwords with `pgcrypto`.

## Fixed In Third Batch

1. Applied the review password security SQL to the Supabase project `kwkhydnvbxvcfvhksxna`.
2. Backfilled 8 existing reviews into `password_hash`; follow-up verification showed 0 plaintext review passwords remaining.
3. Hardened review write/delete access by removing legacy public insert/delete policies and granting review RPC execution only to `service_role`.
4. Centralized seat ID/label/row generation in `lib/seat-map.ts` and updated desktop/mobile seat maps plus booking/verification displays to use it.
5. Restored Korean UI copy and performance metadata in the main user-facing screens and data files.

## Fixed In Fourth Batch

1. Added `scripts/20260707-presale-access-keys.sql` and applied it to Supabase project `kwkhydnvbxvcfvhksxna`.
2. Added the private `presale_access_keys` table with RLS enabled, no public table access, and hashed key storage using `pgcrypto`.
3. Added service-role-only RPCs: `create_presale_access_key`, `consume_presale_access_key`, and `release_presale_access_key`.
4. Updated `/api/bookings/[musicalId]` so booking is allowed when either the normal booking period is open or a valid presale key is supplied before the period starts.
5. Updated the not-in-period UI to accept a presale key and retry the existing booking flow without exposing validation logic to the browser.
6. Verified the DB path by creating, consuming, releasing, and deleting a temporary smoke-test key; `leftover_smoke_keys` returned 0.

## Fixed In Fifth Batch

1. Added the play `toctoc` (`< 톡톡 >`) to `data/musicals.ts`.
2. Added `toctoc_bookings` to `lib/musical-config.ts` and `types/supabase.ts`.
3. Added `scripts/20260708-add-toctoc.sql` for the `toctoc_bookings` table, service-role-only table access, booking period row, and `book_musical_seats` RPC mapping.
4. Applied the same SQL to Supabase project `kwkhydnvbxvcfvhksxna`; the first public-policy version was rejected by security review, so the live DB and script use service-role-only access for the new bookings table.

## Fixed In Sixth Batch

1. Renamed the existing `talktalk_bookings` database table and all related musical IDs to `toctoc` without deleting the existing bookings.
2. Removed the stale `your-lie-in-april` backend mapping because the performance is not present in the frontend and its database table is not present in Supabase.
3. Added musical ID validation to booking, seat, booking-period, verification, and review APIs so unknown IDs cannot fall back to another performance's table.
4. Removed missing `/toc-toc/*.png` cast image references so the detail page uses its built-in placeholder instead of requesting 404 assets.

## Presale Key Operations

Create a presale key from the Supabase SQL Editor or another trusted server-side context:

```sql
SELECT public.create_presale_access_key(
  'dead-poets-society',
  'CHANGE-THIS-KEY',
  'staff preview',
  NOW() - INTERVAL '1 day',
  NULL,
  30
);
```

Notes:

- Do not commit real presale keys to the repository.
- `max_uses` can be `NULL` for unlimited use, or a positive number for a capped key.
- Presale keys only bypass the start date. They do not allow booking after the normal booking period has ended.

## Remaining Maintenance Work

1. Consolidate legacy `arte_musical_tickets` APIs with the musical-specific table/RPC flow or remove the legacy endpoints after confirming they are unused.
2. Add a small smoke test for the booking flow: select performance, select seats, submit booking, verify booking, and load unavailable seats.
3. Review remaining Supabase advisor warnings outside the review-password task, especially legacy public tables/storage exposure and RPC `search_path` hardening.
4. Refresh Browserslist data when convenient; the build passes, but `caniuse-lite` reports as outdated.
