# Supabase OAuth 준비 보고서

## 확인 범위

2026-08-30에 저장소의 SQL·생성 타입·API 데이터 접근 경로와 원격 Supabase 프로젝트 `arte musical ticket`(`kwkhydnvbxvcfvhksxna`)을 함께 확인했다. 원격 프로젝트는 정상 상태였고 `auth.users`와 모든 `public` 테이블의 행 수는 0이었다.

원격 DB에는 `oauth_readiness_and_pii_hardening`, `oauth_readiness_grant_cleanup`, `remove_redundant_arte_ticket_policy` 마이그레이션을 적용하고 재검증했다. `scripts/20260829-audit-schema-for-oauth.sql`은 이후 운영 감사용으로 유지한다.

2026-08-31에는 `require_booking_owner` 마이그레이션을 추가 적용했다. 예약 RPC는 이제 검증된 사용자 UUID를 필수로 받고 `user_id`에 저장하며, 소유자 없는 호출은 데이터 변경 없이 거부한다.

## 테이블 분류

| 분류 | 테이블 | 판단 근거 |
| --- | --- | --- |
| 핵심 | `dead_poets_society_bookings`, `rent_bookings`, `toctoc_bookings` | 현재 공연 설정과 예매/좌석/조회 API에서 사용 |
| 핵심 | `arte_musical_application_period` | 예매 가능 기간 판정에 사용 |
| 핵심 | `reviews` | 후기 조회·생성·삭제에 사용 |
| 핵심 | `presale_access_keys` | 사전예매 코드 RPC에서 사용 |
| 인프라 | `api_rate_limits` | 예매·조회·후기 API 요청 제한에 사용 |
| OAuth 기반 | `auth.users`, `profiles` | Supabase 인증 원본과 앱 전용 사용자 프로필 |
| 레거시 후보 | `arte_musical_tickets` | 루트 `/api/seats`만 참조하고 공연별 흐름은 사용하지 않음 |
| 미사용 후보 | `bookings`, `seat_status` | 초기 SQL에만 있고 현재 타입/공연별 API에서는 사용하지 않음 |
| 미사용 후보 | `review-images` | Storage 버킷과 이름이 같지만 실제로는 열이 `id`, `created_at`뿐인 빈 DB 테이블이며 앱은 참조하지 않음 |
| 원격 DB에 없음 | `your_lie_in_april_bookings`, `talktalk_bookings` | 현재 스키마에는 존재하지 않음 |

삭제 후보는 감사 SQL에서 존재 여부, 행 수, 뷰, 외래키를 확인하고 백업한 뒤 별도 마이그레이션으로 제거한다. 이번 준비 작업은 데이터를 삭제하지 않는다.

## 채택한 사용자 모델

- 인증 정보의 원본은 Supabase가 관리하는 `auth.users`다.
- 앱 정보는 `profiles.id = auth.users.id`인 1:1 테이블에 둔다.
- 공연별 예매와 후기에 nullable `user_id`를 추가한다. 기존 비회원 데이터는 그대로 유지되고 새 로그인 예매부터 소유자를 기록할 수 있다.
- 로그인 사용자는 RLS를 통해 `user_id = auth.uid()`인 자신의 예매만 직접 읽을 수 있다.
- `student_id`는 사용자가 입력하는 식별자일 뿐 본인 확인 수단이 아니다. 기존 티켓 자동 연결은 하지 않는다.
- 예약·후기 작성은 현재와 같이 서버 API의 `service_role` 경로만 허용한다. 기존 예약 테이블의 공개 읽기/삽입 정책과 브라우저 권한은 철회했다.
- `arte_musical_application_period`만 공개 정보로서 `anon`/`authenticated`에 `SELECT` 권한을 유지한다.

기존 티켓을 계정에 연결하려면 운영자 승인, 학교 이메일 검증, 또는 별도 일회성 코드처럼 신뢰 가능한 검증 절차가 필요하다. 이름+학번만 일치한다고 자동 연결하면 다른 학생의 티켓을 탈취할 수 있다.

## Supabase Dashboard 선행 설정

1. Authentication > URL Configuration에서 Site URL을 운영 주소로 설정한다.
2. Redirect URLs에 아래 주소를 등록한다.
   - `http://localhost:3000/auth/callback`
   - `https://arte-tickecting.vercel.app/auth/callback`
   - 실제 프리뷰 도메인을 쓸 경우 해당 callback URL
3. Authentication > Providers에서 사용할 공급자(우선 Google 권장)를 활성화하고 공급자 Client ID/Secret을 입력한다.
4. 공급자 콘솔에도 Supabase가 안내하는 callback URL을 정확히 등록한다. 앱의 `/auth/callback`과 공급자의 Supabase callback은 서로 다른 단계다.
5. 적용된 `scripts/20260829-oauth-readiness.sql`과 Supabase Security Advisor 결과를 배포 전 다시 확인한다.
6. 운영 환경 변수에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`을 설정한다. 기존 `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 호환용으로만 지원한다. Service Role Key는 브라우저에 노출하지 않는다.

## 다음 구현 단계

완료된 구현:

1. `/login`의 Google OAuth 버튼과 PKCE `/auth/callback` 코드 교환
2. 쿠키 세션 갱신 미들웨어와 서버의 `auth.getUser()` 검증
3. `/account` 프로필 보완, 로그아웃, RLS 기반 내 티켓 조회
4. 예매 화면 보호, 예약 API 401 방어, RPC의 `user_id` 저장
5. `@supabase/ssr` 0.12.5와 `supabase-js` 2.112.4 정확한 버전 고정 및 캐시 방지 헤더 전달
6. 이름+학번만으로 조회하던 레거시 API를 410으로 비활성화하고 `/booking/verify`를 `/account`로 전환

남은 운영 작업:

1. Supabase Dashboard에서 Google Provider를 활성화하고 Google Client ID/Secret을 입력한다.
2. Google Cloud OAuth 클라이언트에 Supabase callback URL을 등록하고 Supabase Redirect allow list를 확인한다.
3. 후기 생성도 로그인 사용자 ID를 저장하고, 기존 삭제 토큰은 레거시 후기 호환용으로 유지한다.
4. 운영 데이터 검증이 끝난 뒤 공연별 예매 테이블을 하나의 `bookings` 테이블과 `performances` 테이블로 통합하는 별도 마이그레이션을 검토한다.
