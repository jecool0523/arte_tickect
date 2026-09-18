# ARTE 티켓팅 코드 온보딩

> 작성 기준: 2026-09-17 (작업 브랜치 `main`, OAuth 관련 커밋 전 워킹 트리 기준)

## 1. 프로젝트 한눈에 보기

- **무엇인가**: 디미고 연극/뮤지컬 동아리 ARTE의 공연 소개 · 실시간 좌석 예매 · 내 티켓 조회 · 공연 후기 사이트.
- **스택**: Next.js 15.5 (App Router) + React 18 + TypeScript(strict) + Tailwind + shadcn/ui(Radix) + Supabase(DB·Auth·Storage) + Vercel 배포.
- **패키지 매니저**: pnpm (`pnpm install --frozen-lockfile`).
- **인증**: Google OAuth(Supabase, PKCE). 로그인 없이는 예매·내 티켓 접근 불가.
- **핵심 규칙**: 공연별 예매 테이블이 분리되어 있고, 브라우저에서는 절대 DB에 직접 쓰지 않는다. 모든 쓰기는 서버 API가 `service_role`로 RPC를 호출한다.

## 2. 로컬 실행 및 검증 명령

```bash
pnpm install --frozen-lockfile   # 의존성 설치 (pnpm 필수)
pnpm dev                         # 개발 서버 (http://localhost:3000)
node_modules/.bin/tsc.CMD --noEmit   # 타입 검사 (현재 통과)
pnpm lint                        # ESLint (next/core-web-vitals, 경고 1개 허용)
pnpm build                       # 프로덕션 빌드 (타입+린트 포함, 현재 통과)
```

### 환경 변수 (`.env.example` → `.env.local`)

| 변수 | 용도 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 브라우저용 공개 키 (`NEXT_PUBLIC_SUPABASE_ANON_KEY`는 레거시 호환용) |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용. RLS 우회. 절대 브라우저 노출 금지 |
| `NEXT_PUBLIC_SITE_URL` | OAuth 리다이렉트 등 기준 URL |
| `TICKET_SHARE_SECRET` | 티켓 공유 토큰 서명 키 (32자 이상) |
| `TICKET_SHARE_TTL_SECONDS` | 공유 토큰 유효기간(초), 기본 30일 |

주의: Supabase 클라이언트는 지연 생성(lazy)이라 빌드 시 env가 없어도 모듈 임포트가 깨지지 않지만, 서버 API 동작에는 위 값이 반드시 필요하다.

## 3. 디렉터리 지도

```
app/                        # App Router 라우트 (아래 상세)
  page.tsx                  # 홈 → components/home-screen 렌더
  login/                    # Google OAuth 로그인 (서버: 로그인 시 next로 redirect)
  auth/callback/route.ts    # OAuth PKCE 코드 교환 콜백
  account/                  # /profile로 redirect하는 호환용
  profile/                  # 로그인 후 프로필 + 내 티켓 (requireAuthUser 서버 가드)
  club/                     # 동아리 소개
  performances/             # 공연 목록
  performances/[musicalId]/ # 공연 상세 (SSG: generateStaticParams)
    booking/                # 예매 정보 입력 (로그인 가드)
    booking/seats/          # 좌석 선택 (로그인 가드)
    booking/complete/       # 예매 완료 (로그인 가드)
  tickets/[shareToken]/     # HMAC 서명된 공유 티켓 뷰 (이름·학번 마스킹)
  api/                      # 서버 API (아래 표)
components/                 # 클라이언트 컴포넌트 (route-page_* 는 페이지별 상태 조율)
  home-screen.tsx           # 홈: 공연 카드 목록
  performance-list.tsx      # 공연 목록 그리드
  performance-detail-page.tsx
  musical-detail.tsx        # 상세: 캐스터/후기 포함
  booking-route-page.tsx    # 예매 기간 확인 + 폼 + 제출 + 완료 저장
  seat-selection-route-page.tsx  # 좌석상태 폴링(5초) + 선택 로직
  booking-complete-route-page.tsx
  booking-draft-provider.tsx     # 예매 임시상태 Context (sessionStorage)
  booking-form.tsx / booking-ticket.tsx / booking-verification.tsx
  mobile-seat-map.tsx / mobile-seat-selector.tsx / seat-selection-window.tsx
  review-section.tsx        # 후기 목록/작성/삭제
  arte-info.tsx / app-bottom-nav.tsx / theme-provider.tsx
components/ui/              # shadcn/ui 프리미티브 (Button, Card, Toast 등)
components/auth/            # 프로필 폼, 로그아웃, 구글 로그인 버튼
lib/
  musical-config.ts         # ★ 공연ID↔DB테이블 매핑, 좌석등급, 통계 (수정 최빈 파일)
  seat-map.ts               # ★ 좌석 ID/행/블록 생성 (F1-VIP-R01-L01 형식)
  booking-draft.ts          # 예매 임시상태 타입/정규화
  ticket-share-token.ts     # 서버 전용 HMAC 토큰 생성/검증
  supabase.ts               # 브라우저용 Supabase 클라이언트 (지연 생성)
  utils.ts                  # cn() 등
  security/request.ts       # readJsonBody: JSON 파싱+zod 검증 래퍼
  security/validation.ts    # ★ zod 스키마 모음 (예매/후기/선예매)
  server/supabase-admin.ts  # service_role 클라이언트 (싱글턴)
  server/supabase-auth.ts   # 쿠키 기반 auth 클라이언트 (서버 컴포넌트/API용)
  server/supabase-middleware.ts # 미들웨어 세션 갱신
  server/require-auth.ts    # 페이지용 로그인 가드 (미로그인 시 /login 리다이렉트)
  server/rate-limit.ts      # check_rate_limit RPC 래퍼 (IP 해시 기반)
data/musicals.ts            # ★ 공연 정적 데이터 (포스터/일정/좌석등급) — 공연 추가 시 필수 수정
types/musical.ts            # MusicalInfo 등 프론트 타입
types/supabase.ts           # DB 스키마 타입 (수동 생성, SQL 변경 시 갱신)
hooks/use-toast.ts          # shadcn 토스트 훅
scripts/                    # Supabase SQL 마이그레이션 (날짜_목적.sql 명명)
docs/                       # DB/OAuth 상세 문서
middleware.ts               # 전 경로 세션 쿠키 갱신
```

`@`는 경로 별칭(프로젝트 루트)이다 (`tsconfig.json` paths).

## 4. 예매 도메인 이해 (가장 중요)

### 4.1 상태 흐름

```
[공연 상세] → [예매 정보(/booking)] → [좌석 선택(/booking/seats)] → [예매 제출] → [완료(/booking/complete)]
                    │                                                        │
                    └── /api/booking-period/[id] 로 open/closed 판정          └── sessionStorage에 완료 티켓 저장
```

- 예매 3단계 페이지는 모두 `requireAuthUser`로 로그인 가드 (`app/performances/[musicalId]/booking*/page.tsx`).
- 예매 임시 상태(이름·학번·좌석·선예매코드)는 `BookingDraftProvider`(components/booking-draft-provider.tsx)가 `sessionStorage` 키 `arte-booking-drafts:v1`에 공연별로 보관한다. 새로고침하면 유지되지만 브라우저를 닫으면 사라진다.
- 좌석 선택 화면(components/seat-selection-route-page.tsx:30)은 `/api/seats/[musicalId]`를 **5초마다 폴링**해 예약된 좌석을 비활성화한다.

### 4.2 예매 제출 파이프라인 (app/api/bookings/[musicalId]/route.ts:19)

1. `isKnownMusicalId`로 공연 ID 검증 (404)
2. `createAuthServerClient().auth.getUser()`로 로그인 검증 (401)
3. `readJsonBody(request, bookingRequestSchema)`로 zod 검증 — 좌석 ID가 좌석맵과 등급 일치하는지까지 검사
4. `enforceRateLimit` — IP당 5분/5회 (429)
5. `arte_musical_application_period`에서 기간 조회 — 종료 후 403, 시작 전이면 `presaleKey` 필수
6. 선예매면 `consume_presale_access_key` RPC로 키 소비 (실패 시 예매도 중단, 성공 후 실패 시 `release_presale_access_key`로 롤백)
7. `book_musical_seats` RPC — DB에서 좌석 충돌 검사(409 + conflictSeats) 후 INSERT
8. 성공 시 `createTicketShareToken`으로 공유 토큰 발급, 응답 `{ success, bookingId, shareToken }`

클라이언트(components/booking-route-page.tsx:145)는 409 충돌 좌석을 선택 목록에서 제거하고 좌석 화면으로 되돌린다.

### 4.3 DB 구조 요약

- 공연별 예매 테이블: `dead_poets_society_bookings`, `rent_bookings`, `toctoc_bookings` (구조 동일, 매핑은 lib/musical-config.ts:5)
- `arte_musical_application_period`: 공연별 예매 시작/종료 시각 (유일하게 anon 읽기 허용)
- `presale_access_keys`: 선예매 코드 해시 저장. 관련 RPC는 전부 service_role 전용
- `profiles`: 로그인 사용자 표시 정보 (`id = auth.users.id`)
- `reviews` + Storage 버킷 `review-images`
- `api_rate_limits`: rate limit RPC 백엔드
- 레거시 `arte_musical_tickets`: 루트 `/api/seats`만 참조, 통합 대상

### 4.4 서버/브라우저 클라이언트 구분 (실수 잦은 지점)

| 상황 | 사용 |
| --- | --- |
| API 라우트에서 쓰기·RLS 우회 | `createServerClient()` (lib/server/supabase-admin.ts) |
| 서버 컴포넌트/API에서 로그인 사용자 컨텍스트 | `createAuthServerClient()` (lib/server/supabase-auth.ts) |
| 페이지 로그인 가드 | `requireAuthUser(redirectTo)` (lib/server/require-auth.ts) |
| 브라우저에서 읽기 (profiles 등) | `getSupabaseBrowserClient()` (lib/supabase.ts) |

service_role 키는 브라우저 번들에 절대 들어가면 안 된다. `lib/server/*`와 `lib/ticket-share-token.ts`는 `import "server-only"`로 보호 중이므로 클라이언트 컴포넌트에서 임포트하면 빌드가 실패한다(의도된 안전장치).

### 4.5 공유 티켓 토큰

`/tickets/[shareToken]`은 `lib/ticket-share-token.ts`의 HMAC-SHA256 토큰(`base64url(payload).base64url(sig)`)을 검증해 confirmed 예매만 보여주고 이름·학번을 마스킹한다. 서명 시크릿은 `TICKET_SHARE_SECRET`(없으면 SERVICE_ROLE_KEY 파생). 토큰 형식을 바꾸려면 TOKEN_VERSION을 올려 기존 링크를 무효화해야 한다.

## 5. API 라우트 요약

| 라우트 | 메서드 | 역할 |
| --- | --- | --- |
| `/api/booking-period/[musicalId]` | GET | 예매 기간 판정 (`isOpen`) |
| `/api/seats/[musicalId]` | GET | 예약 좌석 + 통계 (테이블 없으면 `needsSetup: true`로 빈 좌석 반환) |
| `/api/bookings/[musicalId]` | POST | 예매 제출 (§4.2 파이프라인), GET은 410 |
| `/api/presale-keys/validate` | POST | 선예매 코드 유효성 + 좌석 한도 확인 |
| `/api/reviews` | GET/POST | 후기 목록 / 생성(`create_review` RPC) |
| `/api/reviews/[reviewId]` | DELETE | 삭제 토큰 기반 삭제 (`delete_review_with_token`) |
| `/api/reviews/media` | POST | 후기 이미지 업로드(10MB, 화이트리스트 MIME) → Storage `review-images` |
| `/api/bookings` · `/api/bookings/verify` · `/api/seats` · `/booking/verify` | — | 레거시. 410 또는 리다이렉트. 손대지 말 것 |
| `/auth/callback` | GET | OAuth 코드 교환 후 `next` 파라미터로 리다이렉트 |

공통 관례: 동적 API는 `export const dynamic = "force-dynamic"` + `Cache-Control: no-store` 헤더. 응답은 `{ success, ... }` 또는 `{ error, code? }` 형태.

## 6. 공연 추가 절차 (체크리스트)

예시: `lemmings` 공연 추가

1. `data/musicals.ts`에 공연 데이터 추가 (id, 포스터, 일정, 좌석등급)
2. `lib/musical-config.ts`의 `MUSICAL_DATABASE_CONFIG`에 `{ "lemmings": { bookingTable: "lemmings_bookings" } }` 추가
3. `types/supabase.ts`에 `lemmings_bookings` Row/Insert/Update 타입 추가
4. Supabase SQL 작성 — `scripts/20260708-add-toctoc.sql`을 템플릿으로 복제: 테이블 + RLS(공개 접근 차단) + 예매 기간 row + `book_musical_seats` RPC에 테이블 분기 추가 (`scripts/20260831-booking-owner-rpc.sql`의 CASE 절)
5. SQL을 Supabase SQL Editor에서 실행 후 앱에서 예매/조회 스모크 테스트

주의: RPC와 zod 검증이 좌석 ID 형식(`F1-VIP-R01-L01`)을 하드코딩 검증한다(`scripts/20260831-booking-owner-rpc.sql:51`, lib/security/validation.ts:7). 좌석맵 구조를 바꾸면 양쪽 + `lib/seat-map.ts`를 함께 갱신해야 한다.

## 7. 작업 시 주의점 (병목·함정)

- **프론트 100석 vs 서버 10석 불일치**: 좌석 선택 UI는 최대 100석까지 허용하지만 zod 스키마와 RPC는 10석으로 제한한다(lib/security/validation.ts:5, booking-owner-rpc.sql:38). 제한을 바꿀 때는 반드시 세 곳(UI, 스키마, SQL)을 함께 수정.
- **공연 ID는 화이트리스트**: 모든 API가 `isKnownMusicalId`로 검증한다. ID 추가 없이 다른 공연 테이블로 폴백되는 일은 없어야 한다.
- **미들웨어가 전 경로를 순회**한다(middleware.ts). 세션 쿠키를 다루는 로직을 추가할 때는 이 파일과의 충돌 확인.
- **`types/supabase.ts`는 자동 생성이 아니다.** SQL을 바꾸면 손으로 갱신해야 하며, 누락되면 `BookingRow` 타입 오류로 빌드가 깨진다.
- **SQL 스크립트는 되돌리기 어렵다.** scripts/의 새 SQL은 실제 Supabase 프로젝트(`arte musical ticket`)에 적용된 이력 문서이기도 하다. 수정이 아니라 새 날짜 파일을 추가하는 관례.
- **환경**: Windows + PowerShell. `pnpm build`/`dev` 시 `C:\Users\seocheon\package-lock.json` 때문에 workspace root 경고가 뜨지만 무해하다.
- **커밋 금지 사항**: `.env.local`, 실제 선예매 코드, 운영 DB 덤프.
