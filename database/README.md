# ARTE DB 구조 및 변경 관리

2026-10-07 기준 Supabase 프로젝트 `kwkhydnvbxvcfvhksxna`의 실제 카탈로그를 확인했다. 이번 정리는 기존 예약·리뷰·계정·티켓 ID를 보존하는 비파괴 변경이다. 공연별 예약 테이블을 합치거나 이름을 바꾸지 않았다.

## 먼저 볼 파일

- [구조 설명과 운영 규칙](../docs/database-structure.md)
- [테이블·열·제약·인덱스·RPC 메타데이터](schema.snapshot.json): 데이터 행을 포함하지 않는 참고용 스냅샷
- [원격 적용 이력](migrations.snapshot.json): Supabase가 반환한 실제 버전/이름. SQL 실행기가 아니다.
- [이번 변경의 검토용 SQL](changes/schema-organization.sql)
- [ROLLBACK 전용 DB 검사](tests/structure.sql)
- [Supabase 생성 TypeScript 타입](../types/database.generated.ts)

## 적용 원칙

원격 `supabase_migrations.schema_migrations`가 적용 여부의 기준이다. 스냅샷이나 `scripts/*.sql` 전체를 한꺼번에 실행하지 않는다. 예전 스크립트에는 초기화·예약 변경·코드 발급용 일회성 작업도 있다. 기존 DB에 다시 실행하면 안 된다.

이번 변경은 원격 migration `20261007063616 / organize_database_structure`로 이미 적용했다. `changes/schema-organization.sql`은 이미 적용된 SQL의 검토용 소스이며 재실행용 설치 스크립트가 아니다. 변경 사항은 새 migration으로 추가하고 과거 적용 SQL은 수정하지 않는다. 로컬 Supabase migration이 필요하면 CLI `migration new`로 파일명을 생성하며, 여기의 검토용 SQL 파일명을 migration 버전으로 사용하지 않는다.

새 환경 재구축은 별도 작업이다. 이 폴더는 완전한 초기화/복원 패키지가 아니며 스냅샷에서 임의로 테이블이나 권한을 생성하지 않는다. 인증·Storage 스키마는 Supabase가 관리한다. 특히 `public."review-images"`와 Storage의 `review-images` 버킷은 다르다.

## 검사

```bash
node scripts/test-database-structure.mjs
node scripts/test-account-presale.mjs
node scripts/test-profile-api.mjs
node scripts/test-reservations.mjs
node scripts/test-admin-performances.mjs
node scripts/test-fan-experience.mjs
```

`tests/structure.sql`, `scripts/test-account-presale.sql`, `scripts/test-profile-onboarding.sql`, `scripts/test-supabase-readiness.sql`은 SQL 편집기 또는 Supabase 연결 도구에서 각각 실행한다. 테스트 트랜잭션은 ROLLBACK하며 sequence 번호의 공백은 생길 수 있다. 테스트를 분할하여 중간에 COMMIT하거나 ROLLBACK을 제거하지 않는다.

검사/변경 후에는 테이블별 정확한 행 수, 예약/리뷰 소유권 RLS, 권한 플래그 직접 UPDATE 차단, server-only RPC 실행 권한 및 advisors를 다시 확인한다. 스냅샷·타입에는 사용자 행·비밀값을 넣지 않는다.

## 되돌리기

테이블과 데이터는 삭제하지 않았으므로 데이터 복원이 필요한 변경은 없다. 구조를 되돌려야 한다면 새 migration으로 추가한 CHECK/FK/NOT NULL을 제거하고 기존 사용자 ID 인덱스를 먼저 복구한 뒤 새 복합 인덱스를 제거한다. 제거한 정확한 중복 인덱스는 복구할 필요가 없다. 이미 적용한 migration 이력을 삭제하거나 스키마를 reset하지 않는다.
