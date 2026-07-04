# ARTE Ticketing Maintenance Notes

Last checked: 2026-07-04

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
- Backend/API:
  - `app/api/bookings/[musicalId]/route.ts`: current musical-specific booking API using Supabase RPC.
  - `app/api/seats/[musicalId]/route.ts`: musical-specific unavailable seat API.
  - `app/api/bookings/verify/route.ts`: booking lookup.
  - Legacy/general APIs still exist at `app/api/bookings/route.ts` and `app/api/seats/route.ts`.
- Database scripts live in `scripts/`; the current path appears to depend on musical-specific booking tables plus `arte_musical_application_period` and the `book_musical_seats` RPC.

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

## Fixed In This Batch

1. Added ESLint config and required lint dependencies.
2. Re-enabled build-time type and lint validation.
3. Fixed TypeScript errors in navigation callbacks, review deletion, API response typing, and missing separator UI primitive.
4. Made Supabase browser/server clients lazy instead of creating clients at module import time.
5. Marked API routes that depend on request/database state as dynamic.
6. Added `.env.example` and updated `.gitignore` for local environment safety.
7. Reduced review-list exposure by no longer selecting stored review passwords when displaying reviews.

## Remaining Maintenance Work

1. Generate Supabase database types and replace the temporary untyped Supabase client wrapper.
2. Consolidate legacy `arte_musical_tickets` APIs with the musical-specific table/RPC flow.
3. Centralize seat IDs, floors, grades, and labels so UI, APIs, verification, and database logic share one source.
4. Move review password verification into a safer database-side policy or RPC, and avoid plaintext review passwords if reviews remain editable/deletable.
5. Add a small smoke test for the booking flow: select performance, select seats, submit booking, verify booking, and load unavailable seats.
