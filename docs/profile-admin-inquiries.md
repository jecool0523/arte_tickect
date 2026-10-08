# 프로필 관리자 문의

프로필 하단의 **관리자에게 문의**에서 내용을 보내고 **내 문의 내역 · 답변 확인**으로 접수 상태와 답변을 확인한다. 관리자는 프로필 → 관리자 · 공연 관리 → **사용자 문의**에서 답변한다. 문의는 사이트 내부에 저장되며 이메일·외부 메신저·자동 알림을 발송하지 않는다.

로그인만 하면 프로필 정보 등록 전에도 문의할 수 있다. 로그인하지 않은 이용자는 문의 페이지에서 Google 로그인을 해야 한다. 입력은 최대 2,000자이며 문의 내용은 본인과 관리자만 볼 수 있다. 관리자는 문의 접수 시점의 표시 이름·학번을 볼 수 있다. 이 정보는 사용자 입력이며 신원 확인에 사용하지 않는다. 비밀번호나 민감한 개인정보를 적지 않도록 안내한다.

## 저장과 접근

- `private.arte_support_inquiries`는 RLS를 활성화하고 일반 브라우저 역할의 모든 권한을 제거한 서버 전용 테이블이다. `service_role`에 필요한 SELECT·INSERT·UPDATE만 부여한다. 민감 내용을 공개 스키마나 GraphQL에 노출하지 않는다.
- 세 공개 RPC는 SECURITY INVOKER, 빈 search_path, server-only 실행 권한이다. 사용자의 조회는 검증된 로그인 UID로 제한하고 관리자 조회·답변은 데이터베이스의 현재 관리자 역할도 검사한다. 답변 시 역할 행과 문의 행을 잠그므로 권한 해제나 동시 답변이 기존 답변을 덮어쓰지 않는다.
- 문의 생성은 계정별 request key로 중복을 방지한다. 요청 결과를 못 받은 사용자가 같은 문의를 다시 보내도 한 건만 저장한다. 같은 키로 다른 내용을 보내면 거절한다. 브라우저는 실패 시 내용과 키를 보존하고 성공한 경우만 초기화한다.
- POST·PATCH는 엄격한 입력, 본문 크기 제한, 교차 사이트 요청 차단, 계정별 전송 제한을 적용한다. 사용자 ID·관리자 여부·답변 내용을 문의 작성 요청에 끼워 넣을 수 없다. GET은 offset만 허용한다. 모든 응답은 `private, no-store`와 `Vary: Cookie`다.
- 사용자 목록은 최신순, 관리자 목록은 답변 대기 우선으로 20건씩 페이지를 나눈다. 관리자 답변은 한 번 등록하면 이 창구에서 덮어쓰지 못한다. 추가 문의는 새 문의로 보낸다.
- 계정 삭제 시 그 사용자의 문의·답변은 함께 삭제된다. 답변한 관리자 계정만 삭제된 경우 문의와 답변은 유지하며 관리자 FK는 비운다. 사용자·답변자 FK와 목록 순서에 맞춘 인덱스를 추가했다.
- 사용자 입력은 React 텍스트로 렌더링한다. HTML·스크립트·Markdown을 실행하거나 링크로 변환하지 않는다.

## 적용 이력과 검증

2026-10-08 Supabase 원격 migration `20261008033907 / profile_admin_inquiries`에 적용했다. 소스는 `database/changes/profile-admin-inquiries.sql`이며 이미 적용한 SQL은 재실행하지 않는다. 공개 스키마 타입은 Supabase에서 재생성했고, 이전의 동결된 스키마 스냅샷은 유지했다.

`database/tests/profile-admin-inquiries.sql`은 테스트 계정과 문의·답변을 만들고 모두 ROLLBACK한다. 본인/다른 계정 문의 분리, 관리자 역할·해제 검사, 답변 확인, 중복 제출, 입력 길이, 답변 덮어쓰기 차단, 페이지 처리, 직접 RPC·테이블 권한 차단, 계정 삭제 시 문의 삭제를 검증한다. 검사 후 실제 프로필 1개와 문의 0건을 확인했다. 실제 관리자를 대신해 문의나 답변을 보내지 않았다.

`scripts/test-support-inquiries.mjs`는 세션 UID 바인딩·관리자 검증·CSRF·입력·요청 제한·오류 응답을 검사한다. `scripts/test-support-ui.mjs`는 실제 컴포넌트의 문의/답변 이벤트, 실패 후 입력 보존, 재시도 키, 중복 클릭, 안전한 텍스트, 답변 상태, 페이지 이동, 프로필 하단 연결을 검사한다. Worker 검사의 새 문의 페이지와 네 API 인증 차단은 `scripts/test-sites.mjs`에 포함했다.

Advisors의 새 [RLS 정책 없음 INFO](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)는 문의 테이블의 의도된 기본 거부 설정이다. 기존 [GraphQL 익명 발견 가능 경고](https://supabase.com/docs/guides/database/database-linter?lint=0026_pg_graphql_anon_table_exposed), [인증 계정 GraphQL 발견 가능 경고](https://supabase.com/docs/guides/database/database-linter?lint=0027_pg_graphql_authenticated_table_exposed), [유출 비밀번호 보호 경고](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)는 별도로 남아 있다. 새 문의 저장소는 이 GraphQL 경고 대상이 아니다. [미사용 인덱스 INFO](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)는 조회 사용 통계가 쌓이기 전 발생할 수 있어 기능에 필요한 인덱스를 삭제하지 않았다.
