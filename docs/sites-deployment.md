# Sites 배포 설정

현재 안내 기준: 2026-10-08. 일반 Next 빌드는 `pnpm build`로 유지한다. Sites는 정적 내보내기가 아닌 OpenNext Worker로 로그인·프로필·예매 API를 실행한다. GitHub push와 Sites 발행은 별개이며 문서만 수정할 때는 재배포하지 않는다.

## 현재 검증 기준

[21개 로컬 회귀 검사](testing.md)를 실행하고 타입 검사와 빌드를 순서대로 실행한다. Worker 검사는 현재 34개 경로/메서드와 정적 파일·캐시·callback·비밀값을 확인한다. 미로그인 `/profile`, `/profile/bookings`, `/profile/inquiries`는 200 로그인 UI이며 본인 정보나 문의 내용을 노출하지 않는다. 예매 및 보호된 상세 화면은 로그인 가드를 유지한다. 새 API는 미인증 401을 확인한다.

부원 승인, 본인 취소·재예매, 공연별 선예매 2장, 문의·답변에 필요한 DB 변경은 [적용 이력](../database/README.md)을 확인한다. 스냅샷이나 SQL 전체 실행으로 배포 전 설정을 대신하지 않는다. 빌드 성공·Worker 검사·Sites 발행 성공은 각각 별도로 확인하고 기존 사이트 접근 범위를 유지한다.

## 환경 변수

`.env.local`은 Git에 넣지 않는다. Sites 런타임 환경 변수에도 같은 값을 등록한다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 또는 기존 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`: `https://dimi-arte-ticket.gpt-class2-4.chatgpt.site`
- `ARTE_DEPLOY_TARGET`: `sites` (Vercel에는 설정하지 않는다)
- `SUPABASE_SERVICE_ROLE_KEY`, `RATE_LIMIT_SECRET`: Sites **비밀 변수**
- 기존 `TICKET_SHARE_SECRET`, `TICKET_SHARE_TTL_SECONDS`가 있다면 그대로 유지한다. 서명 키를 변경하면 기존 티켓 공유 링크가 무효화된다.

공개 환경 변수는 빌드에 포함되므로 변경 시 다시 빌드한다. 런타임 값이 빌드와 다르거나 서버 키가 없으면 Worker는 개인정보를 노출하지 않고 503 안내를 표시한다.

## Supabase 인증

[URL Configuration](https://supabase.com/dashboard/project/kwkhydnvbxvcfvhksxna/auth/url-configuration)의 Redirect URLs에 아래 주소를 추가한다. 기존 Vercel/개발 주소는 제거하지 않는다.

`https://dimi-arte-ticket.gpt-class2-4.chatgpt.site/auth/callback`

Google 공급자를 활성화한다. Google Cloud에 등록하는 주소는 앱 주소가 아니라 Supabase가 안내하는 `/auth/v1/callback`이다. [공식 리디렉션 안내](https://supabase.com/docs/guides/auth/redirect-urls).

## 확인 및 빌드

PowerShell:

```powershell
$env:NEXT_PUBLIC_SITE_URL='https://dimi-arte-ticket.gpt-class2-4.chatgpt.site'
pnpm check:sites
node scripts/security-regression.mjs
node scripts/test-sites-settings.mjs
pnpm build:sites
pnpm preview:sites
# 다른 터미널에서:
node scripts/test-sites.mjs
```

검사는 키의 권한 구분, 인증/공개 데이터 연결, Google 활성화를 확인한다. Redirect URLs 허용 목록과 실제 Google 로그인 완료는 별도로 확인한다. 빌드는 `dist/server/index.js`, `dist/client`, `dist/.openai/hosting.json`을 생성하고 배포 파일에서 서버 비밀키를 검사한다. `dist`, `.open-next`, `.sites-runtime`은 생성 파일이며 커밋하지 않는다.

Windows 디렉터리 링크 호환 처리는 생성된 `.next/standalone`과 `.open-next`에만 적용한다. [OpenNext의 Windows 지원 한계](https://opennext.js.org/cloudflare#Windows-support) 때문에 배포 전 실제 Worker로 확인한다. `--skip-next-build`는 앱 소스와 공개 환경 변수가 바뀌지 않았고 Next 빌드가 이미 성공했을 때만 사용한다.

프로필/예매/관리자/로그인/티켓 및 세션 쿠키가 있는 응답은 `private, no-store`로 처리한다. 로그인하지 않은 사용자의 프로필·예매 API 접근도 확인한다. 실제 Google 로그인 완료 및 프로필 저장은 허용 URL 등록 뒤 계정으로 별도 확인해야 한다.

DB 설정 스크립트를 일괄 실행하지 않는다. 레거시 정리나 특정 사용자 관리자 지정은 이 배포의 범위가 아니다. 기존 사용자 데이터와 권한은 유지한다.

## 2026-10-06 설정 점검

아래 날짜별 섹션은 당시 점검 기록이다. 서버 키 오류·미배포·프로필 307 등은 이후 수정 전 상태이며 위의 현재 기준을 우선한다. 실제 사용자 Google 로그인과 Dashboard 허용 목록은 여전히 별도 확인 대상이다.

- 중지된 Supabase 프로젝트를 복구했고 Auth/공개 데이터 연결 및 Google 활성화를 확인했다.
- `profile_features_sites_readiness` 마이그레이션으로 기존 프로필 기능 SQL을 등록했다. 데이터 삭제나 관리자 지정은 실행하지 않았다. 프로필 수정/계정 정리/이메일 확인 RPC는 service_role 전용이다.
- 로컬 Worker에서 홈/공연/아르떼/로그인 200, 프로필·예매 화면 307, 미인증 프로필 수정·예매 API 401을 확인했다.
- 서버 비밀값은 OpenNext의 기본 환경 파일에서 제거한다. Workers의 계산된 JSON manifest 로딩은 알려진 빌드 파일과 Node 내장 모듈에만 한정한다. 공개/서버 번들의 비밀값 검사를 모두 통과했다.
- 현재 로컬 `SUPABASE_SERVICE_ROLE_KEY`는 `401 Unregistered API key`로 거부된다. [Project Settings → API Keys](https://supabase.com/dashboard/project/kwkhydnvbxvcfvhksxna/settings/api-keys)에서 활성 서버 Secret key를 확인해 `.env.local`과 Sites 비밀 변수를 교체해야 한다. 키를 채팅에 붙여넣거나 커밋하지 않는다. 서버 키 검사가 실패하면 빌드/배포를 중단한다.
- Redirect URLs 추가와 실제 Google 로그인 완료는 사용자 확인이 필요하다. 현재 결과물은 미배포다.

## 2026-10-06 직접 DB 점검

- Supabase 관리 연결로 DB에 직접 접근했다. 프로필 함수 3개와 본인 소유 행에 한정된 SELECT/UPDATE RLS를 확인했다. 프로필 함수의 `anon`/`authenticated` 실행은 차단되어 있으며, 앱 서버가 인증한 사용자 ID로 호출한다.
- `review_token_rpc_sites_readiness` 원격 마이그레이션을 적용했다. 기존 `create_review`는 `p_password`를 받아 앱의 `p_deletion_token` 호출과 맞지 않았다. 기존 함수를 `create_review_with_password_legacy`로 보존하고, 현재 인자에 맞는 작성 함수와 누락된 `delete_review_with_token`을 등록했다.
- 새 삭제 토큰은 SHA-256 해시만 저장한다. 앱이 생성하는 고엔트로피 토큰 전용이며 사람이 정하는 비밀번호용 해시가 아니다. 기존 리뷰/비밀번호 해시/사용자 데이터에는 변경이나 백필을 하지 않았다. 기존 비밀번호 삭제 함수도 유지했다.
- 새 함수는 `SECURITY INVOKER`, 빈 `search_path`, `service_role` 전용 실행 권한을 사용한다. 리뷰 테이블은 계속 RLS 활성화 및 일반 클라이언트 직접 접근 금지 상태다.
- `scripts/test-supabase-readiness.sql`을 실제 DB에서 실행해 토큰 기반 작성·삭제, 잘못된/빈 토큰 거부, 입력 검증, 프로필 검증, RPC 권한과 RLS를 확인했다. 테스트 트랜잭션은 롤백했다. 리뷰 ID 시퀀스는 테스트로 한 값이 소비될 수 있다.
- 보안 Advisor의 수정 전후 항목은 동일하다. 서버 전용 테이블의 [RLS 정책 없음 안내](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), 앱에서 사용하는 공개/소유자 테이블의 [GraphQL 스키마 가시성 경고](https://supabase.com/docs/guides/database/database-linter?lint=0027_pg_graphql_authenticated_table_exposed), [유출 비밀번호 보호 비활성화](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)가 남아 있다. 기존 앱을 깨뜨리는 일괄 권한 회수나 Auth 설정 변경은 하지 않았다.
- 관리자/사전 예매 권한용 레거시 SQL은 일괄 실행하지 않았다. 관련 누락 RPC는 이 프로필/리뷰 변경으로 구현된 것이 아니며, 특정 계정을 관리자 또는 사전 예매 사용자로 지정하지 않았다.
- 이 연결의 도구는 DB SQL/마이그레이션 및 공개 API 키 조회를 지원하지만 Secret key 발급·조회나 Auth Redirect URLs 수정은 지원하지 않는다. DB 접속 성공이 앱의 서버 키 유효성을 의미하지 않으며, 해당 관리 설정이 완료되기 전에는 배포하지 않는다.

## 2026-10-06 사용자 설정 완료 후 재검증

- 사용자가 활성 서버 키 교체와 Redirect URLs 등록을 완료했다고 알렸다. 재검사에서 Auth/공개 데이터/서버 키 연결이 모두 성공했고 Google 공급자 활성화를 확인했다. 위의 `401 Unregistered API key` 차단 사유는 해소되었다.
- 승인된 `SUPABASE_SERVICE_ROLE_KEY`와 `RATE_LIMIT_SECRET`만 읽어 Sites 비밀 변수로 반영했다. 값은 소스나 사용자 답변에 포함하지 않았다.
- 검증 중 `/api/admin/users`가 인증 확인 전에 서버 RPC를 호출하는 문제를 확인했다. 먼저 사용자 인증과 관리자 여부를 확인하도록 보완했고, 목록 RPC는 사용자 인증 컨텍스트를 유지하도록 했다. 누락된 관리자 SQL을 일괄 실행하거나 관리자 권한을 부여하지 않았으며, 권한 함수가 없으면 403으로 차단한다.
- 실제 Google 로그인 완료와 로그인 후 프로필 저장은 계정으로 별도 확인해야 한다. Redirect URLs 등록 완료는 사용자 보고이며 관리 허용 목록을 직접 조회한 것은 아니다.
- 이 사이트는 기존 소유자 전용 접근 범위를 유지해 발행한다. 원본 GitHub 원격 저장소는 변경하지 않는다. 최종 발행 여부와 URL은 Sites의 배포 성공 결과를 기준으로 한다.
- Windows에서는 Next의 standalone 빌드와 OpenNext 포장을 별도 프로세스로 실행한다. Next가 생성한 전방 참조 디렉터리 링크가 완성된 뒤 호환 처리를 실행하므로, 전체 빌드 뒤 포장 단계의 디렉터리 접근 오류를 방지한다. 이번 검증에서도 성공한 Next 빌드와 별도 포장 실행으로 확인했다.
- 최종 로컬 Worker 검사 전체가 통과했다: 홈/공연/아르떼/로그인 200, 프로필·예매 화면 307, 미인증 프로필 수정·예매·관리자 목록 API 401, 리뷰·좌석 API 200. 정적 JS 로딩, 개인 응답 캐시 금지, 외부 URL로 향하는 인증 콜백 차단, 배포 번들의 서버 비밀값 미포함도 확인했다.
- 최초 Sites 배포는 성공했으나, 실제 성공 응답 URL은 `https://dimi-arte-ticket.gpt-class2-4.chatgpt.site`로 이전 예상 주소와 달랐다. 실제 주소에 맞춰 공개 빌드 설정 및 Sites 런타임 설정을 다시 맞춘다. Supabase에도 위의 실제 `/auth/callback` 주소가 허용되어야 한다. 이전 주소는 허용 목록에 남겨도 되지만 실제 주소 등록을 대신하지 않는다.
- 공식 Sites 포장 도구를 Windows에서 실행할 때는 설치된 Git Bash를 PATH 앞에 두고 `TAR_OPTIONS=--force-local`을 설정한다. GNU tar가 `C:` 경로를 원격 주소로 오인하지 않도록 하는 실행 환경 설정이며, WSL 설치나 원본 파일 삭제는 필요 없다.
