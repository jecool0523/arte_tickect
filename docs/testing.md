# 개발 검증 가이드

기준일: 2026-10-08. 로컬 회귀 검사, 타입/빌드, Worker 검사, 원격 DB 검사는 서로 다른 검증 단계입니다. 아래 명령은 저장소 루트에서 실행합니다.

## 로컬 회귀 검사 19개

의존성을 `pnpm install --frozen-lockfile`로 설치합니다. 아래 PowerShell 목록은 API·UI 이벤트·입력·보안·메타데이터 회귀를 실행하며 실패한 검사에서 중단합니다. 실행 중인 웹 서버나 운영 계정은 필요하지 않습니다.

```powershell
$arteRegressionTests = @(
  'test-profile-inputs', 'test-profile-form', 'test-profile-api',
  'test-profile-navigation', 'test-profile-guide', 'test-reservations',
  'test-admin-performances', 'test-fan-experience', 'test-database-structure',
  'security-regression', 'test-sites-settings', 'test-account-presale',
  'test-arte-member-approval', 'test-arte-member-ui',
  'test-reservation-actions', 'test-reservation-actions-ui', 'test-booking-ui',
  'test-support-inquiries', 'test-support-ui'
)
foreach ($arteTest in $arteRegressionTests) {
  node "scripts/$arteTest.mjs"
  if ($LASTEXITCODE -ne 0) { throw "검사 실패: $arteTest" }
}
```

개별 검사는 `node scripts/test-support-ui.mjs`처럼 실행합니다. 스크립트 추가 시 목록과 이 문서를 갱신합니다. 현재 `package.json`에는 전체 검사용 `test` 명령이 없습니다.

`test-sites-settings`의 의도적 실패 케이스는 누락된 환경 변수 **이름**을 출력할 수 있습니다. 마지막 통과 결과와 종료 코드를 확인합니다. 실제 비밀값을 출력하거나 공유하지 않습니다. DB 구조 검사는 10월 7일의 동결 메타데이터를 검사하므로 최신 원격 전체 스키마 검사로 해석하지 않습니다.

## 타입·린트·빌드

```bash
pnpm exec tsc --noEmit
pnpm exec eslint app components lib hooks types data --ext '.js,.jsx,.ts,.tsx'
pnpm build
```

각 명령은 순서대로 실행합니다. Next 빌드가 `.next/types`를 재생성하므로 타입 검사와 빌드를 동시에 실행하면 존재하지 않는 생성 파일 오류가 발생할 수 있습니다. 소스 문제인지 생성 중 충돌인지 구분합니다.

직접 린트는 소스 디렉터리를 지정합니다. 저장소 전체 `eslint .`는 `.open-next`·`dist` 등 생성 산출물까지 순회할 수 있어 사용하지 않습니다.

`pnpm lint`는 현재 `next lint` 레거시 명령이므로 위의 직접 ESLint 또는 Next 빌드 내 검사로 대체합니다. 빌드가 타입/린트 오류를 무시하도록 설정하지 않습니다. 기존 이미지·Hook 경고는 오류와 구분하고, 검증 결과에는 실패 여부와 미해결 경고를 따로 기록합니다.

## Sites Worker

현재 환경의 공개 빌드 값과 런타임 값을 맞춥니다. 특히 운영용 `NEXT_PUBLIC_SITE_URL`은 발행 도메인과 일치해야 합니다. 실제 DB 연결을 확인하는 `check:sites`와 아래 Worker 검사는 올바른 `.env.local`이 필요합니다.

```bash
pnpm check:sites
pnpm build:sites
pnpm preview:sites
```

별도 터미널에서 실행합니다.

```bash
node scripts/test-sites.mjs
```

프리뷰는 `http://127.0.0.1:8799`입니다. 현재 검사는 34개 경로/메서드, 미로그인 차단, 프로필 직접 표시, 종료된 코드 API, 정적 JS, 개인 응답 캐시 금지, 외부 OAuth 복귀 차단, 산출물의 비밀값 미포함을 확인합니다. 경로 추가 시 검사 목록도 갱신합니다. 모든 로그인 사용자 흐름이나 실제 브라우저 Google 인증을 대신하지 않습니다.

Worker를 시작한 사람이 사용 후 해당 서버만 종료합니다. 문서만 변경할 때는 기존 검증 기록을 새 빌드 결과로 표현하지 않으며 불필요한 재배포를 하지 않습니다. [배포 안내](sites-deployment.md).

## 원격 DB 검사

[DB 변경 관리](../database/README.md)의 SQL 검사를 권한 있는 연결에서 파일별 단일 트랜잭션으로 실행합니다. 운영 데이터·실제 요청을 대신 처리하는 테스트가 아니며 임시 계정/예약/문의는 ROLLBACK합니다. ROLLBACK을 제거하거나 파일을 나눠 COMMIT하지 않습니다. 잠금·기간 설정 영향과 sequence 공백을 확인합니다.

검사 전후 행 수, RLS·GRANT, RPC 실행 권한, advisors를 확인합니다. 원격 DB 변경/검사에는 해당 환경의 권한이 필요하며 일반 로컬 회귀 명령만으로 실행되지 않습니다.

## 계정으로 별도 확인할 흐름

- 미로그인 프로필 버튼 → 직접 프로필 로그인 UI → Google 인증 → 최초 정보 입력·이전 예약 연결.
- 본인 목록/티켓만 조회되는지, 좌석 충돌과 취소 확인, 재예매의 새 좌석 선택.
- 승인 요청만으로 권한이 생기지 않는지, 기존 관리자의 별도 본인 확인·승인, 선예매 1+1장 후 초과 차단·취소 반환.
- 문의 작성 실패 후 내용 보존·재시도, 관리자 답변, 본인 답변 조회와 타 계정 접근 차단.
- XP의 예약/리뷰/한국 날짜 방문 반영, 취소·삭제 제외, 안내 팝업 닫기·다시 보기.

테스트가 유료/실제 좌석 점유·운영 권한 변경·문의 전송을 수반하면 테스트 환경 또는 명시적으로 승인된 대상만 사용합니다.
