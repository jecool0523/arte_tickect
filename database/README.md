# ARTE DB 구조 및 변경 관리

현재 안내 기준: 2026-10-08. Supabase 프로젝트 `kwkhydnvbxvcfvhksxna`의 기존 예약·리뷰·계정·티켓 ID를 보존합니다. 공연별 예약 테이블 통합이나 새 환경 초기화는 별도 작업입니다.

## 파일의 역할

- [현재 구조 설명](../docs/database-structure.md): 기본 구조 및 10월 8일 추가 기능.
- [구조 스냅샷](schema.snapshot.json), [이력 스냅샷](migrations.snapshot.json): **2026-10-07 동결 자료**. 데이터 행은 없으며 이후 변경이나 최신 전체 스키마를 나타내지 않습니다.
- [기본 구조 정리 SQL](changes/schema-organization.sql): 원격 `20261007063616 / organize_database_structure`로 적용된 변경의 검토 소스.
- [생성 타입](../types/database.generated.ts): Supabase public/GraphQL 스키마 타입. private 내부 테이블은 기능별 검토 SQL에서 확인합니다.
- [앱 타입](../types/supabase.ts): 생성 타입을 재사용하고 RPC JSON 응답 계약을 보완합니다.

## 2026-10-08 추가 적용 이력

| 원격 버전 / 이름 | 검토용 소스 | 기능 안내 |
| --- | --- | --- |
| `20261008023305 / add_arte_member_admin_approval` | [arte-member-approval.sql](changes/arte-member-approval.sql) | [부원 승인](../docs/arte-member-approval.md) |
| `20261008023652 / index_arte_member_request_reviewer` | [arte-member-approval-reviewer-index.sql](changes/arte-member-approval-reviewer-index.sql) | 승인 검토자 FK 인덱스 |
| `20261008025056 / owned_reservation_cancellation` | [owned-reservation-cancellation.sql](changes/owned-reservation-cancellation.sql) | [취소·재예매](../docs/owned-reservation-actions.md) |
| `20261008025133 / normalize_owned_cancellation_booking_ids` | [owned-reservation-cancellation-id-types.sql](changes/owned-reservation-cancellation-id-types.sql) | legacy integer / bigint ID 처리 보완 |
| `20261008031400 / member_presale_two_tickets` | [member-presale-two-tickets.sql](changes/member-presale-two-tickets.sql) | [부원 선예매 2장](../docs/member-presale-two-tickets.md) |
| `20261008033907 / profile_admin_inquiries` | [profile-admin-inquiries.sql](changes/profile-admin-inquiries.sql) | [관리자 문의](../docs/profile-admin-inquiries.md) |

이 표는 당시 적용 결과를 문서화한 것이며 실행기가 아닙니다. 실제 환경의 적용 여부는 원격 `supabase_migrations.schema_migrations`에서 확인합니다.

## 적용 원칙

스냅샷이나 `scripts/*.sql` 전체를 실행하지 않습니다. 과거 스크립트에는 초기화·예약 변경·선예매 코드 발급용 일회성 작업도 있습니다. `changes/*.sql`은 이미 적용된 SQL의 검토 소스이지 재실행용 설치 스크립트가 아닙니다.

변경은 새 migration으로 추가하고 적용된 SQL과 이력을 수정하지 않습니다. 로컬 Supabase migration이 필요하면 CLI `migration new`로 파일명을 생성하며 검토 SQL 이름을 migration 버전으로 사용하지 않습니다. DDL은 해당 프로젝트의 정상 migration 경로로 적용하고 변경 범위·권한·데이터 보존을 검토합니다.

이 폴더는 완전한 초기화/복원 패키지가 아닙니다. 동결 스냅샷에서 임의로 테이블·권한을 생성하지 않습니다. Auth·Storage 스키마는 Supabase가 관리합니다. `public."review-images"` 메타데이터 테이블과 Storage의 `review-images` 버킷은 별개입니다.

## 검사

로컬 회귀 명령은 [검증 가이드](../docs/testing.md)에 모았습니다. 원격 SQL 검사는 다음 파일을 각각 **전체 트랜잭션**으로 실행하며 실제 사용자 데이터로 검사하지 않습니다.

- [기본 구조](tests/structure.sql)
- [부원 승인](tests/arte-member-approval.sql)
- [취소·재예매](tests/owned-reservation-cancellation.sql)
- [선예매 수량](tests/member-presale-two-tickets.sql)
- [문의·답변](tests/profile-admin-inquiries.sql)
- [프로필 연결](../scripts/test-profile-onboarding.sql), [계정 선예매](../scripts/test-account-presale.sql), [기본 RPC 준비](../scripts/test-supabase-readiness.sql)

ROLLBACK을 제거하거나 중간 COMMIT하지 않습니다. 테스트 중 잠금/임시 기간 변경이 있으므로 공유 운영 환경에서는 실행 계획을 확인합니다. 트랜잭션 롤백 후에도 sequence 번호 공백은 생길 수 있습니다.

검사/변경 전후 정확한 행 수, 소유권 RLS, 역할 플래그 직접 수정 차단, server-only RPC 권한, advisors를 확인합니다. 타입·문서·스냅샷에 사용자 행·비밀값을 넣지 않습니다. 정책 없음 INFO는 서버 전용 deny-by-default 설계와 구분해서 판단합니다.

## 복구

변경 종류에 맞는 후속 migration을 설계합니다. 10월 7일 제약/인덱스 정리를 되돌리는 경우와 10월 8일 기능을 되돌리는 경우는 다릅니다. 기능 테이블/열을 삭제해 문의·승인·예약 표식을 잃지 않도록 앱 호환성과 데이터를 먼저 검토합니다.

기본 구조 정리만 되돌린다면 추가 CHECK/FK/NOT NULL의 영향을 검토하고 기존 소유자 인덱스를 복구한 뒤 새 복합 인덱스를 제거합니다. 완전 중복 인덱스는 복구할 필요가 없습니다. 적용 이력 삭제·스키마 reset·과거 SQL 재실행은 하지 않습니다. 실제 데이터 복원이 필요하면 검증된 백업과 별도 복구 절차를 사용합니다.
