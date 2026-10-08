# ARTE 코드 온보딩

기준일: 2026-10-08. 설치·환경 변수는 [README](../README.md), 검사는 [검증 가이드](testing.md), 운영 대응은 [유지보수 안내](../MAINTENANCE.md)를 먼저 확인합니다.

## 구조와 진입점

Next.js 15.5 App Router, React 18, TypeScript(strict), Tailwind/Radix UI, Supabase Auth·DB·Storage를 사용합니다. 현재 운영은 Sites OpenNext Worker이며 일반 Next 빌드는 별도로 유지합니다. `@/`는 저장소 루트 별칭입니다.

| 위치 | 역할 |
| --- | --- |
| `app/page.tsx`, `components/home-screen.tsx` | 홈 공연·동아리 소개와 내 예약 내역 입구 |
| `app/performances/`, `app/club/` | 공연 목록·상세, 동아리 소개 |
| `app/login/`, `app/auth/callback/route.ts` | Google OAuth, PKCE 코드 교환, 안전한 내부 복귀 경로 |
| `app/profile/`, `components/auth/` | 프로필 등록·안내 팝업·XP·부원 확인·본인 예약·문의 |
| `app/admin/`, `app/api/admin/` | 공연·사용자·예약·승인·문의 관리 |
| `components/booking-draft-provider.tsx`, `lib/booking-draft.ts` | 공연별 예매 초안과 sessionStorage 호환 |
| `components/booking-route-page.tsx`, `components/seat-selection-route-page.tsx` | 기간·권한 안내, 좌석 조회와 제출 |
| `lib/musical-config.ts`, `data/musicals.ts` | 고정 공연 ID↔테이블 매핑, 공연·출연진·좌석 등급 |
| `lib/seat-map.ts`, `lib/security/validation.ts` | 좌석 생성, 등급/형식/중복/최대 10석 검증 |
| `lib/profile.ts`, `lib/server/profile-onboarding.ts` | 필수 프로필 검증, 이전 예약 연결 |
| `lib/server/booking-access.ts` | 예매 시간·선예매 잔여 수량 안내용 사전 확인 |
| `lib/server/reservations.ts` | 본인 예약·티켓 조회와 출처 검증 |
| `lib/server/arte-membership-request.ts`, `lib/server/support-request.ts` | 부원 요청·문의 API 공통 처리 |
| `lib/server/supabase-auth.ts`, `lib/server/supabase-admin.ts` | 쿠키 세션과 서버 전용 DB 클라이언트 구분 |
| `middleware.ts`, `lib/server/supabase-middleware.ts` | 세션 검증·갱신 쿠키 및 캐시 헤더 전달 |
| `lib/security/request.ts`, `lib/server/rate-limit.ts` | 요청 검증, 쓰기 요청 보호 및 호출 제한 |
| `types/database.generated.ts`, `types/supabase.ts` | 생성된 공개 DB 타입, 앱의 RPC JSON 계약 |
| `database/changes/`, `database/tests/` | 적용된 변경 검토 소스와 ROLLBACK SQL 검사 |
| `scripts/` | 로컬 회귀·배포 검사, 과거 SQL 이력. 일괄 실행 금지 |

## 계정 흐름

`/profile`은 항상 직접 열립니다. 미로그인은 Google 로그인 카드, 미등록은 아이디·이름·학번·연락처 폼, 완료 계정은 프로필 기능을 렌더링합니다. 예매 중 미등록 사용자는 등록·필요한 부원 확인을 거쳐 원래 예매로 돌아옵니다. `/account`는 호환용 경로입니다.

계정의 기준은 이메일·이름·학번이 아니라 Supabase 사용자 UUID입니다. 서버 `getUser()`로 검증한 ID만 RPC에 넘깁니다. 수동 프로필 정보로 이전 미연결 예약을 찾는 기능은 본인 인증이 아니며 다른 소유자를 바꾸지 않습니다. [로그인 구조](login-db-structure.md), [프로필 동기화](profile-onboarding.md).

## 예매 파이프라인

공연 상세 → 예매 정보 → 좌석 선택 → API 제출 → 완료 화면 → 프로필 예약 목록. 초안/완료 화면 저장은 브라우저 상태이며 좌석 확정이나 권한 근거가 아닙니다. 선예매 코드는 제출하지 않습니다.

1. 공연 ID 화이트리스트 및 로그인 계정 확인.
2. 필수 프로필 완료와 요청 본문 검증. 신규 예약당 좌석 1~10개, 중복/등급 불일치 거부.
3. 서버 호출 제한과 `getBookingAccess` 사전 확인. 공개 예매 기간 GET도 계정별 선예매 안내를 반환할 수 있어 개인 응답으로 취급합니다.
4. `book_musical_seats`에 서버가 확인한 사용자 UUID 전달.
5. DB가 프로필 → 기간 → 공연 예약 테이블 순서로 잠근 뒤 잠금 대기 이후 시각, 현재 권한, 부원 누적 선예매 수량, 좌석 충돌을 다시 확인.
6. 동일 트랜잭션에서 소유자와 `is_presale`을 기록. 성공하면 예약 ID·일시·공유 토큰 등을 응답.

사전 조회는 최종 승인으로 취급하지 않습니다. 좌석 충돌과 선예매 한도 초과는 409이며 한도 초과 시 입력을 보존해 수량을 줄일 수 있게 합니다. 기간 종료·권한 없음은 403, 설정/DB 조회 실패는 안전하게 차단합니다.

승인된 부원의 2장 제한은 **공연별 유효 선예매 좌석 누적 수**입니다. 일반 예매는 제외하고 취소 시 반환합니다. 기존 수동 권한만 가진 비부원에게 부원 한도를 적용하지 않습니다. [선예매 상세](member-presale-two-tickets.md).

## API 지도

| 라우트 | 메서드 | 역할 |
| --- | --- | --- |
| `/api/booking-period/[musicalId]` | GET | 기간·계정별 선예매 안내 |
| `/api/seats/[musicalId]` | GET | 예약 좌석·통계 |
| `/api/bookings/[musicalId]` | POST | 새 예약. 목록 GET은 410 |
| `/api/profile` | PATCH | 본인 프로필 저장·예약 연결 |
| `/api/account/delete` | DELETE | 본인 확인 후 계정 탈퇴 |
| `/api/profile/sync` | POST | 로그인 메타데이터의 프로필 이미지 동기화 |
| `/api/profile/fan-experience` | GET/POST | 활동 집계 / 한국 날짜 방문 기록 |
| `/api/profile/arte-membership` | GET/POST | 본인 부원 후보·요청 상태 / 확인 응답 |
| `/api/profile/bookings/[sourceId]/[bookingId]` | PATCH | 본인 예약 취소·재예매 준비 |
| `/api/profile/inquiries` | GET/POST | 본인 문의 목록 / 새 문의 |
| `/api/admin/performances` | GET/PATCH | 관리자 공연 설정·기간 |
| `/api/admin/users`, `/api/admin/booking-stats` | GET | 관리자 사용자 목록·예약 통계 |
| `/api/admin/users/admin-status`, `/api/admin/users/presale-status` | PATCH | 권한 부여·해제 |
| `/api/admin/member-requests` | GET/PATCH | 관리자 승인 목록 / 승인·거절 |
| `/api/admin/inquiries` | GET/PATCH | 관리자 문의 목록 / 일회성 답변 |
| `/api/reviews`, `/api/reviews/[reviewId]`, `/api/reviews/media` | GET/POST, DELETE, POST | 리뷰·삭제 토큰·이미지 업로드 |
| `/api/presale-keys/validate` | POST | 종료된 코드 방식, 410 |

리뷰 생성 경로는 로그인/비로그인 호환을 구분하며 로그인 리뷰만 계정 XP에 반영합니다. 레거시 공개 이름·학번 예약 조회 API는 비활성화되어 있습니다. 관리자 리뷰 삭제의 미구현 RPC 경로를 정상 기능으로 오해하지 않습니다.

본인 티켓은 `/profile/bookings/[sourceId]/[bookingId]`에서 세션과 소유권으로 확인합니다. 별도 `/tickets/[shareToken]` 공유 경로는 HMAC·유효기간 검사 모델로 유지합니다. 두 접근 모델을 혼동하지 않습니다.

## 수정 시 경계

- 클라이언트는 OAuth 공개 클라이언트, 서버는 인증 클라이언트와 service-role 클라이언트를 구분합니다. `lib/server/*`를 클라이언트에 가져오지 않습니다.
- 역할은 DB의 `profiles`와 승인 기록에서 판정합니다. `user_metadata`, localStorage, 요청 본문의 사용자 ID·역할·XP를 권한 근거로 사용하지 않습니다.
- 개인 응답의 `private, no-store`를 유지합니다. 문의/승인/예약 액션 등의 쓰기 보호·입력 검증·호출 제한을 제거하지 않습니다.
- 취소 후 재예매는 좌석 교환 트랜잭션이 아닙니다. [예약 취소](owned-reservation-actions.md)의 기존 예약 보호 조건과 선예매 수량을 함께 확인합니다.
- 신규 공연은 관리자 UI에서 만들 수 없습니다. 정적 데이터·공연 매핑·예매 기간·새 저장 구조·RLS·예매/취소/조회/연결/탈퇴/XP/수량 RPC의 고정 매핑을 모두 검토한 새 migration과 테스트가 필요합니다. 과거 공연 추가 SQL을 복사·재실행하지 않습니다.
- 생성 DB 타입은 Supabase에서 재생성하고 앱 JSON 계약은 따로 갱신합니다. private 테이블 구조는 기능별 검토 SQL을 확인합니다.
- 적용된 SQL은 변경하지 않고 후속 migration을 추가합니다. 사용자 데이터와 키를 문서·스냅샷에 포함하지 않습니다. [DB 변경 관리](../database/README.md).
