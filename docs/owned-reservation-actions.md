# 내 예약 취소 / 재예매

프로필 → 내 예약 내역 보기에서 예약별 **예매 취소**, **취소 후 재예매** 버튼을 제공한다. 이미 취소된 예약에는 **재예매**가 표시된다. 내 티켓 상세에서도 같은 기능을 사용할 수 있다. 기존 보라색 UI와 포커스 관리가 있는 확인 레이어를 사용한다.

## 동작

- 취소는 해당 예약의 모든 좌석에 적용한다. 확인창을 열거나 닫는 것만으로는 취소되지 않는다. 실제 취소 성공 후 유효 티켓 링크가 사라지고 목록은 갱신된다.
- DB 행을 삭제하지 않고 `status='cancelled'`로 변경한다. 원래 예약 번호·이름·학번·좌석은 취소 내역으로 남긴다. 반복 취소는 성공한 동일 결과를 반환한다.
- 재예매는 **이전 예약 복구가 아니라 새로운 예매**다. 이름·학번만 미리 채우고 이전 좌석·등급·권한·동반인·메모는 복사하지 않는다. 작성 중인 해당 공연의 예매 초안은 초기화한다. 좌석을 새로 선택하고 예매 완료해야 새 티켓을 받는다. 이전 좌석을 보장하지 않는다.
- 유효 예약의 취소 후 재예매 요청은 DB에서 현재 예매 기간과 계정 선예매 권한을 먼저 확인한다. 닫힌 기간·조회 실패·선예매 권한 없음이면 원래 예약을 취소하지 않는다. 확인 이후 예매가 닫히거나 다른 사람이 좌석을 선점할 수 있으며, 최종 새 예매는 기존 `book_musical_seats`가 다시 검사한다.
- 취소된 예약은 팬 경험치 계산에서 제외된다. 취소 성공 시 활동 갱신 이벤트를 보내 표시를 갱신한다. 새 예약이 완료되면 새 예약 기준으로 다시 계산된다.
- 이전 공연(`legacy`)은 공연 ID/회차가 확실하지 않아 임의 재예매 경로를 만들지 않는다. 본인 취소는 지원하고 취소 후 새 공연 목록으로 안내한다.
- 별도 취소 마감일을 임의로 추가하지 않았다. 현재 `confirmed`/`completed`인 본인 예약을 취소할 수 있다. 취소 마감 정책이 필요하면 별도 요구에 따라 서버 규칙을 추가한다.

## 보안과 데이터 보호

`PATCH /api/profile/bookings/[sourceId]/[bookingId]`는 검증한 `auth.getUser()`의 ID만 사용하며 `{action:'cancel'|'rebook'}` 이외의 입력은 거부한다. 출처는 4개 예약 테이블의 고정 매핑, ID는 양의 안전한 정수만 허용한다. 교차 사이트 쓰기를 차단하고 사용자별 요청 제한을 적용한다. 응답은 `private, no-store`, `Vary: Cookie`다. 다른 계정의 예약과 존재하지 않는 예약은 모두 같은 404 결과다.

`cancel_owned_reservation`은 `SECURITY INVOKER`, 빈 `search_path`, `service_role` 전용 실행 권한을 사용한다. 기존 RLS·열 권한은 확대하지 않았다. DB에서도 `id`와 `user_id`를 함께 대조한다. 기존 예매 함수와 같은 `profile → period → booking-table` 잠금 순서를 사용하고 같은 `EXCLUSIVE` 테이블 잠금으로 취소와 좌석 확정을 직렬화한다. 잠금 대기 이후 `clock_timestamp()`로 재예매 기간을 검사한다.

원격 적용 이력:

- `20261008025056 / owned_reservation_cancellation`: `database/changes/owned-reservation-cancellation.sql`
- `20261008025133 / normalize_owned_cancellation_booking_ids`: `database/changes/owned-reservation-cancellation-id-types.sql`. 예전 테이블의 integer ID와 현재 bigint ID를 고정 bigint 변수로 받아 PL/pgSQL 실행 계획의 타입 충돌을 방지한다.

이미 적용된 SQL은 다시 실행하지 않는다. 공개 스키마 타입은 Supabase에서 생성한 `types/database.generated.ts`, 앱 JSON 계약은 `types/supabase.ts`에 기록한다.

## 검증

`database/tests/owned-reservation-cancellation.sql`은 하나의 트랜잭션에서 테스트 계정/예약과 임시 기간 설정을 사용하고 모두 ROLLBACK한다. 실제 예약을 취소하거나 기존 좌석을 덮어쓰지 않는다. 4개 출처별 본인 취소·외부 계정 거부·없는 예약·반복 취소·기록 보존·완료 상태·닫힌 예매·선예매 권한·취소된 기록 재예매 준비·팬 경험치를 확인한다. 실제로 빈 테스트 좌석을 선택해 기존 예약 충돌 → 취소 → 같은 좌석으로 **새 예약 번호 생성**까지 검증한다. sequence 번호 공백은 생길 수 있다.

`scripts/test-reservation-actions.mjs`는 API 인증·검증된 계정 ID 바인딩·위조 입력·출처/ID·CSRF·오류·응답 캐시·요청 제한을 검증한다. `scripts/test-reservation-actions-ui.mjs`는 실제 컴포넌트 이벤트로 확인/취소, 취소 성공, 티켓 링크 제거, 새 초안, 실패 시 기존 티켓 유지, 경험치 갱신, 이전 공연, 초기 상태를 검증한다. `scripts/test-reservations.mjs`와 배포 Worker 경로 검사도 새 동작을 포함한다.

Advisors 검사에는 이번 RPC의 새 보안 경고가 없고, 기존 [GraphQL 스키마 발견 가능 경고](https://supabase.com/docs/guides/database/database-linter?lint=0027_pg_graphql_authenticated_table_exposed), [유출 비밀번호 보호 설정 경고](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), 내부 테이블 RLS 정책 없음 및 미사용 인덱스 정보는 남아 있다. 전체 보안 문제가 해결됐다는 의미는 아니다.
