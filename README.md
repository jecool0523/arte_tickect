# ARTE 티켓팅

디미고 연극·뮤지컬 동아리 아르떼의 공연 소개, 좌석 예매, 내 티켓 및 리뷰 서비스입니다.

[운영 사이트](https://dimi-arte-ticket.gpt-class2-4.chatgpt.site/) · [개발 문서 목차](docs/README.md) · [운영 안내](MAINTENANCE.md)

## 현재 기능

- 홈 · 공연 · 아르떼 · 프로필 하단 내비게이션과 공연 상세·좌석 선택.
- Google 로그인과 최초 프로필 등록: 이메일 앞부분을 기본값으로 하는 수정 가능한 영문·숫자 아이디, 이름, 학번, 연락처. 이메일·비밀번호 가입/로그인은 제공하지 않습니다.
- 이름·학번이 정확히 일치하는 미연결 이전 예약 동기화. 다른 계정의 예약 소유권은 변경하지 않습니다. 이 연결은 본인 인증이 아닙니다.
- 내 예약 목록에서 본인 티켓 확인·이미지 저장·예약 취소·재예매. 재예매는 새 좌석을 선택하는 새 예약이며 이전 좌석을 보장하지 않습니다.
- 팬 경험치: 유효 예약(`confirmed`/`completed`) 1건 100점, 계정에 연결된 리뷰 1개 50점, 로그인 방문 한국 날짜 하루 1회 10점. 새싹 팬·단골 팬·열성 팬·아르떼 서포터의 시작 점수는 각각 0·200·500·1,000점입니다.
- 최초 프로필 기능 설명 레이어 팝업, 프로필 하단 관리자 문의와 답변 내역.
- 관리자: 기존 공연 정보·일반 예매 기간, 사용자 권한, 예약, 부원 승인 요청, 문의 답변 관리.
- 명단 후보는 부원 확인 후 승인 요청. 기존 관리자가 신원을 확인해 승인하면 관리자·선예매 권한을 부여합니다. 자기 신고만으로 승격되지 않습니다.
- 승인된 부원은 공연별 선예매 총 2장. 취소된 선예매는 수량을 반환하며 일반 예매에는 이 한도를 적용하지 않습니다. 이전 선예매 코드 방식은 종료했습니다.

## 로컬 시작

Node.js와 pnpm을 준비한 뒤 저장소 루트에서 실행합니다. 의존성 버전은 `package.json`과 `pnpm-lock.yaml`을 기준으로 합니다.

```bash
pnpm install --frozen-lockfile
```

[.env.example](.env.example)을 `.env.local`로 복사하고 프로젝트 값을 채웁니다. 로컬 Next 개발 서버는 `NEXT_PUBLIC_SITE_URL=http://localhost:3000`을 사용합니다.

```bash
pnpm dev
```

`http://localhost:3000`을 엽니다. Google 로그인에는 Supabase Redirect URLs에 해당 환경의 `/auth/callback` 등록이 필요합니다. [로그인·계정 구조](docs/login-db-structure.md)를 참고하세요. 이 저장소는 새 Supabase 프로젝트를 자동 초기화하는 패키지가 아닙니다.

## 설정과 기술 구성

Next.js 15.5 App Router · React 18 · TypeScript(strict) · Tailwind/shadcn 스타일 UI · Supabase Auth/DB/Storage · Sites OpenNext Worker.

| 환경 변수 | 용도 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 주소 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 브라우저용 공개 키. 기존 `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 호환 대체값 |
| `NEXT_PUBLIC_SITE_URL` | 현재 환경의 기준 origin 및 OAuth 복귀 주소 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 DB 접근 키 |
| `RATE_LIMIT_SECRET` | 서버 전용 요청 제한 식별자 해시 키 |
| `TICKET_SHARE_SECRET` | 서버 전용 공유 티켓 서명 키. 기존 키를 임의로 교체하지 않음 |
| `TICKET_SHARE_TTL_SECONDS` | 공유 티켓 유효기간(초), 기본 2,592,000초(30일) |
| `ARTE_DEPLOY_TARGET` | Sites 빌드·런타임에서는 `sites`, 일반 Next 개발에서는 비워 둠 |

`.env.local`, 비밀키, 사용자 데이터, 생성된 빌드 산출물은 커밋하지 않습니다. 서버 키를 `NEXT_PUBLIC_*`에 넣지 않습니다. 사용자 ID는 서버가 검증한 세션에서 얻고, 관리자·선예매 권한은 DB에서 확인합니다.

## 검증 및 배포

```bash
pnpm exec tsc --noEmit
node scripts/security-regression.mjs
node scripts/test-database-structure.mjs
```

전체 21개 로컬 회귀 검사와 DB·Worker 검사 방법은 [검증 가이드](docs/testing.md)에 있습니다. 타입 검사와 Next 빌드는 `.next/types` 생성 충돌을 피하기 위해 동시에 실행하지 않습니다.

일반 Next 빌드는 `pnpm build`, Sites 배포용 빌드는 `pnpm build:sites`, 로컬 Worker는 `pnpm preview:sites`(`http://127.0.0.1:8799`)입니다. 배포 전 공개 빌드 설정과 런타임 origin을 일치시켜야 합니다. [Sites 배포 안내](docs/sites-deployment.md)를 확인하세요. GitHub push만으로 Sites 게시본이 갱신되는 것은 아닙니다.

## 개발 참여

[코드 온보딩](docs/code-onboarding.md)부터 읽고, 수정한 기능의 회귀 검사를 실행한 뒤 커밋합니다. DB 변경은 [변경 관리 규칙](database/README.md)에 따라 새 migration으로 추가합니다. 이미 적용된 SQL이나 `scripts/*.sql`을 일괄 재실행하지 않습니다. 과거 스키마 스냅샷은 기준일이 명시된 참고 자료이며 최신 원격 적용 이력을 대신하지 않습니다.
