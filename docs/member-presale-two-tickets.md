# 부원 기본 선예매 2장

2026-10-08 적용. 기존 부원 승인 절차를 유지하며, 기존 관리자가 본인 확인 후 승인하면 관리자 권한과 선예매 권한을 함께 부여한다. 승인된 부원 계정은 **공연별로 선예매 총 2장**을 사용할 수 있다. 예약 건수가 아니라 좌석 수를 합산하므로 1장씩 두 번 예매해도 세 번째 선예매는 차단한다.

이름·학번 일치, 자기 신고, 승인 대기만으로는 선예매 권한을 받지 않는다. 관리자 역할만 가진 계정을 부원으로 간주하지 않는다. 기존의 수동 선예매 권한은 유지하며, 승인된 부원에게는 2장 한도를 적용한다. 관리자가 선예매 권한을 해제하면 부원 승인 내역이 있어도 예매할 수 없으며 로그인·재신청으로 해제가 취소되지 않는다.

선예매 기간은 기존처럼 일반 예매 시작 전이며 종료 후에는 선예매 권한으로도 예매할 수 없다. 일반 예매 기간에는 부원 선예매 한도를 적용하지 않는다. 공연을 다시 사용하면서 동일 공연 ID를 유지하면 기존 선예매 사용량이 이어지므로, 별도 공연은 별도 ID와 예약 저장 구조를 사용해야 한다.

## 저장과 동시성

- `private.arte_admin_requests.status='approved'`를 검증된 부원 근거로 삼는다. 공개 프로필이나 요청 입력으로 한도를 변경할 수 없다.
- 세 공연 예약 테이블에 서버가 기록하는 `is_presale` 열을 추가했다. `confirmed` 및 `completed` 상태의 선예매 좌석만 합산하고 `cancelled`는 제외한다. 일반 예매는 합산하지 않는다.
- 기존 예약 522건은 보존한다. 과거 예약은 당시 선예매 여부가 기록되지 않아 임의로 사용량에 포함하지 않는다. 수정 가능한 예매 시작일로 과거 선예매를 추정하지 않는다.
- 예매 함수는 프로필·기간 행을 잠그고 해당 공연 예약 테이블의 EXCLUSIVE 잠금을 획득한 뒤 현재 시각과 누적 수량을 다시 확인한다. 한도 확인과 새 예약 생성이 같은 트랜잭션이므로 동시 요청도 한도를 우회할 수 없다.
- 취소는 같은 테이블 잠금으로 좌석과 사용량을 함께 반환한다. 취소 후 재예매는 기존 선예매를 취소하며 반환될 수량을 고려한다. 수량이 전혀 남지 않는 비선예매 예약의 재예매는 기존 예약을 취소하지 않고 거절한다. 이미 취소된 예약은 다시 한도를 반환하지 않는다.
- 공개 조회 RPC `get_account_presale_allowance`와 비공개 계산 함수 `private.arte_presale_allowance`는 빈 search_path의 SECURITY INVOKER이며 `service_role`만 실행 가능하다. API는 검증된 로그인 사용자 ID만 사용한다. 조회는 안내용이고 최종 판단은 예매 트랜잭션이 한다.

## 화면

부원 승인 안내·관리자 승인 확인창에 공연별 선예매 2장을 표시한다. 예매 화면에는 남은 수량을 표시하고 좌석 선택 화면도 해당 수량으로 제한한다. 초과 제출 시 입력과 선택 좌석을 보존하여 줄일 수 있게 한다. 한도가 소진되면 내 예약 내역으로 이동해 취소할 수 있다.

## 적용·검증

원격 migration `20261008031400 / member_presale_two_tickets`의 소스는 `database/changes/member-presale-two-tickets.sql`이다. 이미 적용한 SQL을 다시 실행하지 않는다. 공개 스키마 타입을 Supabase에서 재생성했다. 2026-10-07의 기존 스냅샷 파일은 동결된 참고 자료로 보존한다.

`database/tests/member-presale-two-tickets.sql`은 테스트 계정·예약·기간 수정을 한 트랜잭션에서 검사 후 모두 ROLLBACK한다. 실제 세 공연에서 승인 시 권한 부여, 승인 대기 차단, 공연별 독립 한도, 3장 요청 거절, 1+1장 누적 제한, 완료 예약의 사용량 유지, 취소 복원, 재예매, 중복 반환 방지, 관리자 권한 해제, 수동 권한 보존, 일반 예매, 브라우저 RPC·열 쓰기 권한 차단을 검증했다. 기존 승인·예약 취소 SQL 검사도 재실행했으며 실제 계정 1개·기존 예약 522건·실제 승인 요청 0건이 그대로 유지된다.

Supabase Advisors의 기존 [GraphQL 익명 발견 가능 경고](https://supabase.com/docs/guides/database/database-linter?lint=0026_pg_graphql_anon_table_exposed), [인증 계정 GraphQL 발견 가능 경고](https://supabase.com/docs/guides/database/database-linter?lint=0027_pg_graphql_authenticated_table_exposed), [유출 비밀번호 보호 경고](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)는 이번 변경과 별개로 남아 있다. [RLS 정책 없음 INFO](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)는 기존 서버 전용 저장소의 기본 거부 설정이다. [미사용 인덱스 INFO](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)도 유지되며 이번 변경의 새 보안 경고는 없다.
