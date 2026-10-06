# 디미고 연극/뮤지컬 동아리 아르떼의 티켓팅 사이트입니다.

## 기능
아르떼의 모든 연극/뮤지컬을 확인하고 실시간으로 자리를 예매할 수 있습니다.

## 구조
1. 홈 : 공연들이 정렬되어있는 메인 화면
2. 공연 : 공연의 정보를 확인하고 자리를 예매할 수 있는 창
3. 아르떼 : 아르떼의 인원들과 활동 등 아르떼를 소개하는 창
4. 프로필 : 로그인·내 정보 관리·이전 예약 동기화·내 티켓 확인
                              
## - 구현된 기능
1. 공연 소개
2. 공연 예매 (좌석 선택 및 정보 입력)
3. 예매 정보 저장 (외부 DB)
4. 예매 조회 (학번 이름 이용)

## - 12.5일자 기준 추가된 기능
1. PR 머지
> 뮤지컬 티켓팅 시간 제한 적용
> 시간 외 예매시 시간이 아님 오류창 출력
> 로딩 스피너 삭제
> 예매 기간 관리 DB 생성
> 예매 기간 설정
2. 보안문제 해결
> app/api/bookings/route.ts 내부 GET 메서드에서 데이터 전송하는거 수정
> Service Role Key 사용 제한 - 권한 수정
> DB RLS 작동
> function_search_path_mutable 경고 해결
> vulnerable_postgres_version 경고 해결
3. 예매 오류 발생시 오류 콘솔 UI 표현
4. 구글, 네이버 검색엔진 최적화 설정
5. 메타데이터 수정
6. 모바일의 하단 탭바가 예약 버튼가리는 문제 수정
7. 한번에 좌석 예약 제한 100으로 늘림
8. ARTE info 창 생 및 배너 생성
9. 관람 후기 등록 기능 생성 (글 및 이미지)

## - 구현 예정
1. RENT의 설명
2. 아르떼 동아리 설명

## 2026-10-06 업데이트

- 하단 내비게이션을 홈 / 공연 / 아르떼 / 프로필로 통일했습니다.
- Google 로그인 후 아이디·이름·학번·연락처를 등록합니다. 아이디는 이메일의 @ 앞부분을 기본값으로 넣고 영문·숫자로 수정할 수 있습니다. 이메일 도메인 제한은 없습니다.
- 입력한 이름·학번과 모두 일치하는 미연결 이전 예약을 계정에 자동 연결합니다. 이미 다른 계정에 연결된 예약은 이동하지 않습니다. 이 대조 방식은 별도의 본인 인증을 의미하지 않습니다.
- 프로필·로그인·내 정보 등록 UI는 기존 공연/아르떼 화면과 같은 회색 배경, 흰색 헤더, 카드, 보라색 버튼 및 하단 내비게이션을 사용합니다.
- 홈 제목을 ‘아르떼’로 바꾸고 검색창·검색 버튼 및 긴 로그인 안내 문구를 제거했습니다. ‘내 예약 내역 보기’는 `/profile/bookings`로 연결되며 완료된 본인 예약에서 티켓·좌석 확인과 이미지 저장이 가능합니다.
- Sites 배포용 Worker 빌드, 환경 변수 검증, 개인 응답 캐시 금지 및 비밀키 노출 방지 검사를 추가했습니다. Supabase DB 변경 이력과 검증 절차도 문서화했습니다.

[전체 작업 정리](docs/work-summary-2026-10-06.md) · [프로필 및 예약 연결 규칙](docs/profile-onboarding.md) · [Sites 배포 및 설정](docs/sites-deployment.md)

### 실행과 확인

```bash
pnpm install --frozen-lockfile
pnpm dev
node scripts/test-profile-inputs.mjs
node scripts/test-profile-form.mjs
node scripts/test-profile-api.mjs
node scripts/test-profile-navigation.mjs
node scripts/test-reservations.mjs
node scripts/security-regression.mjs
node scripts/test-sites-settings.mjs
pnpm build:sites
```

환경 변수는 `.env.example`을 참고하여 `.env.local` 및 Sites 변수에 설정합니다. `.env.local`이나 서버 비밀키는 Git에 커밋하지 않습니다. 배포 및 원격 DB 테스트 절차는 위 문서를 참고하세요.
