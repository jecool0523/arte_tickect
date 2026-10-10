# 현재 DB 구조와 변경 이력

현재 안내 기준: 2026-10-08. 아래 10월 7일 구조 정리 기록에 10월 8일 부원 승인·취소/재예매·선예매 수량·문의 구조를 추가했다. 수량과 advisors 검증 결과는 해당 날짜의 기록이며 이번 문서 갱신에서 원격 DB를 다시 조회하거나 변경하지 않았다.

기준일: 2026-10-07(한국 시간). 원격 Supabase 카탈로그, 사용 코드와 정확한 행 수를 확인했다. 기존 예약 **522건**, 리뷰 **8건**, 과거 선예매 코드 **34건**을 보존했다. 수량은 확인 시점의 값이며 이후 정상 이용으로 바뀔 수 있다. 테이블 목록의 추정 `rows=0`을 빈 테이블의 근거로 사용하지 않았다.

## 테이블 역할

| 구분 | 테이블 | 현재 용도와 보존 이유 |
| --- | --- | --- |
| 계정 | `auth.users`, `auth.identities` | Supabase Auth 관리. 앱에서 스키마를 변경하지 않음 |
| 운영 | `public.profiles` | 계정 UUID, 아이디·이름·학번·연락처, 관리자/선예매 권한 |
| 운영 | `public.arte_musical_application_period` | 공연별 일반 예매 시작·종료 시각. `musical_name` 고유 |
| 운영 | `public.performance_settings` | 공개 공연 정보 덮어쓰기. `musical_id`가 예매 기간의 공연 키를 참조 |
| 운영 | `public.dead_poets_society_bookings` | 죽은 시인의 사회 예약 39건 |
| 운영 | `public.rent_bookings` | RENT 예약 134건 |
| 운영 | `public.toctoc_bookings` | 톡톡 예약 199건 |
| 이전 예약 호환 | `public.arte_musical_tickets` | 이전 티켓 150건. 예약 내역·동기화·티켓·팬 XP에서 계속 사용 |
| 운영 | `public.reviews` | 리뷰와 계정 연결, 서버 전용 삭제 토큰 해시 |
| 내부 | `public.api_rate_limits` | API 요청 제한. 브라우저 직접 접근 차단 |
| 내부 | `private.fan_visits` | 계정별 한국 날짜 방문 기록, 하루 한 건 |
| 내부 | `private.arte_member_roster` | 부원 후보 명단. 일반 사용자에게 전체 명단을 공개하지 않음 |
| 내부 | `private.arte_admin_requests` | 계정별 부원 확인·승인 요청, 검토자와 신원 스냅샷 |
| 내부 | `private.arte_support_inquiries` | 본인 문의·관리자 답변, 재시도 키와 답변자 |
| 보존/종료 | `public.presale_access_keys` | 이전 코드 기록. 현재 예매 권한 판정에는 사용하지 않음 |
| 보존/종료 | `public.bookings`, `public.seat_status` | 예전 예약 모델. bookings는 0건이지만 seat_status는 28건이라 자동 삭제하지 않음 |
| 보존/종료 | `public."review-images"` | 예전 메타데이터 테이블. 실제 Storage 버킷/파일과 별개 |

모든 앱 테이블은 RLS를 유지했다. `ACTIVE`/`INTERNAL`/`LEGACY-COMPATIBLE`/`RETIRED` 설명을 DB table comment에도 기록했다. `RETIRED`는 삭제했다는 뜻이 아니다. 나중에 테이블을 합치려면 공연별 중복 예약 ID, 기존 티켓 URL, 공유 토큰, RLS, 원자적 좌석 검증, 예약 연결 및 XP 집계를 함께 이관해야 한다.

## 관계와 삭제 규칙

```text
auth.users.id
  ├─ profiles.id                         1:1, 계정 삭제 시 프로필 CASCADE
  │   ├─ private.fan_visits.user_id       프로필 삭제 시 방문 CASCADE
  │   ├─ private.arte_admin_requests     신청자 삭제 CASCADE, 검토자 삭제 SET NULL
  │   └─ private.arte_support_inquiries  문의자 삭제 CASCADE, 답변자 삭제 SET NULL
  ├─ 공연별 예약.user_id                  계정 삭제 시 SET NULL
  ├─ arte_musical_tickets.user_id         계정 삭제 시 SET NULL
  └─ reviews.user_id                     계정 삭제 시 SET NULL

arte_musical_application_period.musical_name (고유)
  └─ performance_settings.musical_id      공연 기간 삭제 RESTRICT
```

예약과 리뷰는 계정 탈퇴 RPC의 기존 익명화 규칙을 유지한다. SET NULL만으로 이름·학번 등 개인정보가 익명화되는 것은 아니다. 탈퇴는 기존 서버 처리 경로를 사용한다.

## 적용한 구조 변경

원격 migration: **`20261007063616 / organize_database_structure`**. [검토용 SQL](../database/changes/schema-organization.sql).

1. `arte_period_musical_unique`와 `reviews_fan_user_id_idx` 두 개의 완전 중복 인덱스를 제거했다. 제약에 연결된 `arte_musical_application_period_musical_name_key`와 기존 `idx_reviews_user_id`는 유지했다. 다른 unused-index 알림은 조회 빈도가 낮다는 이유만으로 삭제하지 않았다.
2. 예약 네 테이블의 단일 `user_id` 인덱스를 `(user_id, booking_date DESC) WHERE user_id IS NOT NULL`로 교체했다. 계정별 최신 예약 조회와 FK/소유자 조회를 함께 지원한다. 작은 현 데이터에서 성능 배수를 주장하지 않는다.
3. 예약 `status`와 `booking_date`를 NOT NULL로 맞췄다. 상태는 `confirmed`/`completed`/`cancelled`, 좌석 배열은 비어 있거나 NULL 원소를 포함할 수 없도록 제약을 추가·검증했다. 과거 10석 초과 예약 한 건은 보존했다. 10석 제한은 새 예매 API/RPC에서 적용하며 과거 데이터의 CHECK로 강제하지 않는다.
4. 예매 기간에 `start_time < end_time`을 추가했다. 공연 설정의 `musical_id`를 기간의 고유 공연 키에 FK로 연결하고 삭제는 RESTRICT로 제한했다.
5. 리뷰 `rating`/`created_at`을 NOT NULL로 맞추고 별점 1~5 CHECK를 검증했다.
6. 테이블/권한 열의 역할을 comment로 남겼다. 테이블 이동·통합·이름 변경, 실제 데이터 UPDATE/DELETE, Auth·Storage 설정 변경, 권한 확대는 하지 않았다.

추가 전 NULL/잘못된 상태/비어 있는 좌석/잘못된 별점/기간 및 연결 누락을 확인했다. 검토용 변경에는 짧은 잠금 제한을 넣어 이용 중 잠금이 길어지면 중단하도록 했다.

## 권한과 주요 RPC

| 호출 경로 | 주요 함수 | 권한 |
| --- | --- | --- |
| 사용자 세션 | `is_current_user_admin`, `admin_get_all_users`, `save_admin_performance` | 검증된 로그인 세션 및 관리자 확인/RLS |
| 서버 | `book_musical_seats` | 검증된 계정 ID, DB의 시간/선예매 권한 재검사, 좌석 동시성 잠금 |
| 서버 | `save_profile_and_sync_bookings`, `sync_legacy_bookings` | 수동 이름·학번과 미연결 예약만 연결. 기존 다른 소유권은 이동하지 않음 |
| 서버 | `set_user_admin_status`, `set_user_presale_status` | 서버가 확인한 요청자 ID를 넘기고 DB에서 관리자 여부 확인 |
| 서버 | `create_review`, `create_account_review`, `delete_review_with_token` | 토큰 해시 검증, 로그인 리뷰는 실제 계정 소유권 연결 |
| 서버 | `get_account_fan_activity`, `record_account_fan_visit` | 예약/리뷰 집계, 한국 날짜 방문 기록. 클라이언트가 XP/날짜 지정 불가 |
| 서버 | `get_arte_membership_state`, `submit_arte_membership_request`, `list_arte_admin_requests`, `review_arte_admin_request` | 후보 확인·승인 요청, 현재 관리자 확인과 신원 재검사, 자기 승인 차단 |
| 서버 | `cancel_owned_reservation` | 소유자 검증, 기록 보존 취소, 재예매 기간·권한·수량 사전 확인 |
| 서버 | `get_account_presale_allowance` | 공연별 선예매 사용량 안내. 최종 예매 트랜잭션에서 재검사 |
| 서버 | `submit_support_inquiry`, `list_support_inquiries`, `reply_support_inquiry` | 본인 문의, 관리자 목록·일회성 답변, 요청 키 중복 방지 |
| 서버 | `delete_account`, `get_user_email_status`, `check_rate_limit` | 기존 제한과 서비스 역할 접근 유지 |

브라우저는 관리자·선예매 권한 열이나 예약 테이블을 직접 수정할 수 없다. 자기 프로필/예약 SELECT RLS는 그대로 유지한다. 내부 테이블의 RLS 정책 없음 알림은 의도한 deny-by-default다.

예전 코드/암호 기반 리뷰 RPC는 과거 기록과 함께 보존했지만 현재 앱에서는 호출하지 않는다. 코드를 계정 권한으로 자동 변환하지 않았다. 관리자가 사용자 관리에서 계정에 권한을 부여한다.

## 파일과 타입 정리

- [이력 스냅샷](../database/migrations.snapshot.json), [구조 스냅샷](../database/schema.snapshot.json)은 2026-10-07에 동결한 메타데이터만 담는다. 이후 변경이나 최신 전체 구조를 나타내지 않는다.
- [생성 타입](../types/database.generated.ts)은 public/GraphQL 스키마의 열·관계·RPC를 Supabase에서 생성한 원본이며 10월 8일 문의 기능까지 갱신했다. private 내부 구조는 기능별 `database/changes/` 검토 SQL을 확인한다.
- [앱 타입](../types/supabase.ts)은 기존 API JSON 계약을 유지하며 실제 생성된 예약·프로필·리뷰·과거 코드 Row 타입을 재사용한다. 존재하지 않는 미사용 `admin_get_booking_stats`/`is_current_user_presale` 계약을 제거했다. 리뷰 RPC의 실제 set-returning 반환은 배열로 수정했다.
- [로그인 DB 설명](login-db-structure.md)은 현재 계정·소유권 흐름으로 갱신했다. 실제 적용 여부와 권한은 원격 카탈로그·migration 이력으로 확인한다.

## 2026-10-08 추가 구조

- 부원 명단과 계정별 승인 요청은 private 스키마의 RLS 기본 거부 테이블이다. 기존 관리자가 확인 후 승인하면 `is_admin`과 `is_presale_user`를 부여한다. 명단 일치·대기·자기 신고는 권한 근거가 아니다. [부원 승인](arte-member-approval.md).
- 본인 예약 취소는 네 출처의 상태를 `cancelled`로 바꾸고 행을 보존한다. 레거시 integer 예약 ID와 현대 bigint ID는 고정 bigint 변수로 처리한다. 재예매는 새 예약이며 이전 좌석을 보장하지 않는다. [예약 동작](owned-reservation-actions.md).
- 세 공연별 예약 테이블에 `is_presale BOOLEAN NOT NULL DEFAULT false`를 추가했다. 승인된 부원은 `confirmed`/`completed` 선예매 좌석을 공연별 누적 2장까지 사용한다. 취소는 반환하며 일반 예매는 제외한다. 과거 예약을 수정 가능한 기간으로 추정해 선예매 표식에 백필하지 않았다. [선예매 수량](member-presale-two-tickets.md).
- 문의는 private 테이블에 계정별 재시도 키, 문의 당시 표시 정보, 내용·답변·시각을 보관한다. 본인 조회와 현재 관리자 답변을 서버 전용 RPC로 제한하며 기존 답변 덮어쓰기를 차단한다. 이메일·외부 알림은 없다. [문의 구조](profile-admin-inquiries.md).

검토 SQL, 여섯 원격 migration 버전과 ROLLBACK 검사 목록은 [DB 변경 관리](../database/README.md)에 모았다. 과거 적용 SQL이나 동결 스냅샷은 덮어쓰지 않았다.

알려진 기존 불일치: 사용하지 않는 `/api/admin/reviews` 경로의 `admin_delete_review` RPC는 실제 DB에 없다. 앱 타입의 역사적 계약에만 남았고 호출은 현재 성공하지 않는다. 이번 작업에서 권한 확인 없는 삭제 함수를 새로 만들어 활성화하지 않았다. 관리자 리뷰 삭제 기능은 별도 인증/권한 처리와 함께 구현해야 한다.

## 검증과 남은 알림

아래는 2026-10-07 기본 구조 정리 당시 검증 기록이다. 10월 8일 기능별 검증은 각 기능 문서와 [전체 검증 가이드](testing.md)에 따로 정리했다. 현재 로컬 회귀 검사는 21개이며 이번 문서 갱신이 새로운 DB 검사 결과를 의미하지 않는다.

`database/tests/structure.sql`로 잘못된 상태·빈/NULL 좌석·NULL 상태·잘못된 기간·별점·참조된 기간 삭제를 거부하고, 과거 대량 예약 허용과 권한 보존을 검사했다. 테스트 데이터는 모두 ROLLBACK했다. 선예매·프로필 예약 연결·리뷰 삭제 토큰의 기존 DB 테스트도 통과했다. 로컬 회귀 검사 12개와 TypeScript 검사도 통과했으며 테스트 후 예약 522건·리뷰 8건·계정 1개·과거 코드 34건·레거시 좌석 28건을 다시 확인했다.

[중복 인덱스 알림](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index)은 정리 후 사라졌다. 낮은 사용량의 [unused-index 정보 알림](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) 17개, 의도된 내부 테이블 정책 없음 정보, 기존 [GraphQL 발견 가능 경고](https://supabase.com/docs/guides/database/database-linter?lint=0027_pg_graphql_authenticated_table_exposed), [유출 비밀번호 보호 설정 경고](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)는 남아 있다. 전체 보안 문제가 해결됐다는 의미로 해석하지 않는다. 공개 공연 데이터와 본인 전용 RLS의 목적을 보존한다.

적용 순서·재실행 금지·복구 방법은 [DB 운영 안내](../database/README.md)를 참고한다. 이번 변경은 기존 게시본과 호환되며 화면/API 실행 코드나 배포 환경은 변경하지 않는다.
