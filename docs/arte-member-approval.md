# 아르떼 부원 관리자 승인

2026-10-08 Supabase 프로젝트 `kwkhydnvbxvcfvhksxna`에 적용한 비파괴 기능이다. 기존 관리자·예약·리뷰의 데이터와 권한은 변경하지 않았다.

## 사용자 흐름

Google 로그인 → 이름·학번 등 프로필 저장 → 명단에 해당하면 **아르떼 부원인가요?** → **네, 승인 요청하기** → 기존 관리자 검토 → 승인 시 관리자 권한 부여.

부원 확인은 프로필에서 표시한다. 예약 중 프로필을 처음 등록한 경우 `/profile/membership?next=…`에서 확인하고 원래 예약 화면으로 돌아간다. 확인을 나중으로 미뤄도 사이트 이용은 가능하다. 이름·학번은 본인이 입력하는 정보이며 신원 증명이 아니다.

제공된 명단 22명을 `private.arte_member_roster`에 저장했다. 19명은 이름과 학번이 모두 일치해야 하며, 학번이 없는 구민찬·김보경·박동우는 이름으로 후보를 찾고 관리자에게 별도 본인 확인 경고를 표시한다. 명단 전체를 일반 사용자에게 내려주지 않는다.

## 기존 관리자 처리

프로필 → **관리자 · 공연 관리** → **부원 승인**에서 요청 당시 로그인 이메일·이름·학번·요청일을 확인한다. 실제 부원에게 로그인 이메일을 확인하고 **로그인 이메일과 실제 부원 정보를 확인했습니다**에 체크한 후 **승인**한다. 승인은 공연·사용자 관리 등 기존 관리자 권한 전체를 부여하므로 계정을 반드시 확인한다. **거절**은 권한을 부여하지 않는다.

대기 요청은 오래된 순서로 최대 100건씩 표시하며 처리 후 새로고침하면 다음 요청을 볼 수 있다. 승인받은 사용자는 프로필의 **승인 상태 새로고침**을 누르면 관리자 입구가 표시된다. 로그아웃·재로그인은 필요하지 않다.

## 저장 상태와 권한 경계

- `private.arte_admin_requests`: 계정별 1건, 요청 당시 이메일·이름·학번, 부원 ID, 상태, 검토자·검토시각. `declined → pending → approved/rejected`이며 미응답은 행이 없다.
- “아니요”는 저장되어 반복 질문하지 않으며 나중에 요청할 수 있다. 대기 요청 중복 전송은 같은 요청을 반환한다. 거절된 요청은 자동 재신청하지 않고 운영자에게 문의한다.
- 요청 이후 프로필 또는 로그인 이메일이 바뀌거나 인증 상태가 사라지면 승인을 차단한다. 다른 계정으로 이미 승인된 동일 부원은 재승인하지 않는다. 권한을 해제한 계정도 요청 재전송만으로 권한이 복구되지 않는다.
- API는 `auth.getUser()`로 검증한 세션의 사용자 ID만 사용한다. 일반 사용자는 다른 계정 ID·이름·학번·역할을 지정할 수 없고 요청 목록을 읽거나 승인할 수 없다. 쓰기는 교차 사이트 요청 차단·엄격한 입력 검증·사용자별 요청 제한을 적용한다. 응답은 모두 `private, no-store`다.
- 공개 RPC 4개는 `SECURITY INVOKER`이고 `service_role`만 실행할 수 있다. 승인 RPC는 거래 안에서 검토자의 현재 관리자 권한을 다시 확인하며, 계정·요청·명단 행 잠금으로 승인 기록과 역할 변경을 함께 처리한다. 본인 승인을 금지한다.
- `private.get_arte_member_email`은 확인된 이메일 1개만 읽고 승인 시 인증 행을 잠그는 비공개 `SECURITY DEFINER` 함수다. 빈 `search_path`, 명시적 스키마, server-only 실행 권한을 적용했다. `service_role`의 `auth.users` 직접 SELECT 권한은 새로 부여하지 않았다.
- 내부 테이블은 RLS를 활성화하고 `anon`/`authenticated` 권한을 제거했다. 일반 사용자용 정책을 만들지 않아 기본 거부한다. Supabase의 [RLS 정책 없음 INFO](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)는 이 서버 전용 설계에서 의도된 상태다.

## 적용 이력과 검증

원격 migration `20261008023305 / add_arte_member_admin_approval`에 대응하는 소스는 `database/changes/arte-member-approval.sql`이다. 후속 `20261008023652 / index_arte_member_request_reviewer`는 검토자 FK 인덱스를 추가한다. 이미 적용한 SQL을 다시 실행하지 않는다. `database/schema.snapshot.json` 및 `migrations.snapshot.json`은 2026-10-07 구조 정리 시점의 동결된 참고 자료다. 최신 공개 스키마 타입은 Supabase에서 다시 생성한 `types/database.generated.ts`, 앱 JSON 계약은 `types/supabase.ts`에 있다.

`database/tests/arte-member-approval.sql`은 단일 트랜잭션으로 테스트 계정을 만들고 ROLLBACK한다. 이름·학번 오매칭, 거절 응답, 중복 요청, 요청만으로 권한 미부여, 일반 계정의 승인 차단, 기존 관리자 승인, 승인 기록, 재처리 차단, 권한 해제 후 자동 복구 차단, 프로필 변경, 이름만 있는 후보와 중복 부원 승인, 거절, 공개 RPC 및 민감 열 접근 차단을 검증한다. 실제 사용자나 실제 승인 요청으로 테스트하지 않는다.

로컬 검사: `node scripts/test-arte-member-approval.mjs`, `node scripts/test-arte-member-ui.mjs`. UI 검사는 확인 체크박스·확인창 취소·승인/거절·오류·상태 표시·예약 중 가입 후 복귀까지 실제 컴포넌트 이벤트로 검증한다. 배포 Worker 검사는 `node scripts/test-sites.mjs`에 새 승인 API의 비로그인 차단 및 가입 확인 페이지를 포함한다.

Advisors의 기존 [GraphQL 발견 가능 경고](https://supabase.com/docs/guides/database/database-linter?lint=0027_pg_graphql_authenticated_table_exposed), [유출 비밀번호 보호 설정 경고](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [미사용 인덱스 INFO](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)는 이번 기능과 별개로 남아 있다. 전체 보안 문제가 해결됐다는 의미는 아니다.
