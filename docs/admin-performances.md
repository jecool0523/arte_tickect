# 관리자 공연 관리

Google 로그인 후 프로필의 ‘관리자 · 공연 관리’ 또는 `/admin`으로 이동한다. 관리자 권한은 DB의 `profiles.is_admin`으로 확인하며 사용자 편집 가능한 Auth metadata나 브라우저 값을 신뢰하지 않는다. 최초 관리자 지정은 사용자가 지정한 기존 Google 계정 한 개에만 적용했다. 이메일 자동 승격 규칙은 만들지 않았다.

기존 3개 공연(톡톡, RENT, 죽은 시인의 사회)의 공연명, 부제, 장르, 안내, 관람 시간/등급, 장소, 날짜/시간, 포스터 경로 또는 HTTPS 주소, 줄거리와 일반 예매 기간을 수정할 수 있다. 기간 입력은 한국 시간이며 기존 초 단위를 보존한다. 저장한 정보는 홈, 공연 목록/상세, 예매 화면과 티켓에 반영된다. 신규 공연 추가/삭제와 좌석 배치 변경은 이 작업에 포함되지 않는다.

`performance_settings`에는 공개 공연 정보만 저장한다. 기존 코드의 출연진·좌석 설정은 보존하며 DB 조회 실패나 유효하지 않은 저장 정보에는 기존 공연 정보를 표시한다. 예매 기간은 기존 `arte_musical_application_period`를 사용하므로 실제 일반 예매 허용 시간에도 반영된다. 기존 예약 데이터는 유지한다. 선예매는 코드가 아닌 계정 권한 방식이며 사용자 관리에서 권한을 부여·해제한다. 자세한 관계/권한은 [현재 DB 구조](database-structure.md)를 참고한다.

## 권한과 검증

Supabase 원격 migration `admin_performance_management`의 소스는 `scripts/admin-performance-schema.sql`이다. 공연 정보와 예매 기간은 세션 클라이언트의 SECURITY INVOKER RPC로 하나의 트랜잭션에서 저장된다. SELECT는 공개 정보에만 허용하고 INSERT/UPDATE는 관리자 RLS로 제한한다. 일반 사용자는 profiles를 직접 수정할 수 없으며 관리자 지정 함수는 service_role 전용이다. 관리자 사용자 목록은 관리자 확인이 있는 private 스키마 함수와 invoker 래퍼로 제공한다.

DB에서 관리자 저장·사용자 목록, 일반 사용자 수정 거부 및 자기 권한 승격 차단을 검사했다. 테스트 변경은 모두 ROLLBACK했다. `scripts/test-admin-performances.mjs`는 API의 401/403, 입력 검증, 권한 위조, 세션 RPC, 오류/호출 제한 및 한국 시간 변환을 검사한다. 기존 프로필/예약 회귀 검사도 유지한다.

보안 검사에는 공개 공연 정보 테이블의 GraphQL 발견 가능 경고가 남는다. 이 테이블은 의도적으로 공개 정보만 포함하며 수정은 관리자 RLS로 보호한다. 기존 본인 전용 프로필/예약 RLS와 서버 전용 테이블의 정책 없음 정보 알림은 보존한다. [GraphQL 노출 검사 설명](https://supabase.com/docs/guides/database/database-linter?lint=0026_pg_graphql_anon_table_exposed).
