# 로그인·계정 DB 구조

기준일: 2026-10-08. Google OAuth만 제공합니다. 학교 이메일 도메인 제한이나 이메일·비밀번호 가입/로그인은 앱에 없습니다. 이 문서는 현재 계정 흐름이며 이전 준비 기록은 [OAuth 준비 보고서](oauth-readiness.md)에 남겨 둡니다.

## 계정과 서비스 데이터

Supabase 사용자 UUID를 기준으로 프로필과 새 예약·리뷰·문의의 소유자를 연결합니다. 이름·학번은 사용자 입력 정보이며 신원이나 관리자 권한을 증명하지 않습니다.

| 위치 | 역할 |
| --- | --- |
| `auth.users`, `auth.identities` | Supabase가 관리하는 계정과 Google 로그인 연결 |
| `public.profiles` | 동일 UUID의 서비스 프로필, 관리자·선예매 플래그 |
| 공연별 예약 3개 및 `arte_musical_tickets.user_id` | 본인 예약·티켓 소유권 |
| `public.reviews.user_id` | 로그인 리뷰 소유권과 XP 집계 |
| `private.fan_visits` | 계정별 한국 날짜 방문, 하루 한 건 |
| `private.arte_admin_requests` | 후보 확인·관리자 승인 상태, 검토 기록 |
| `private.arte_support_inquiries` | 본인 문의·관리자 답변 |

`profiles`에는 `username`, `display_name`, `student_id`, `contact_number`, `profile_completed_at`, 이미지와 생성/수정 시각, 역할 플래그가 있습니다. DB의 초기 nullable 상태와 앱의 완료 프로필 필수 입력은 다릅니다. 아이디는 이메일 local part에서 영문·숫자만 남긴 기본값을 수정할 수 있으며 1~30자, 대소문자 구분 없는 중복 검사를 합니다. 이름·학번·연락처 검증은 [프로필 안내](profile-onboarding.md)와 `lib/profile.ts`를 기준으로 합니다.

## 로그인부터 프로필까지

1. Google 버튼이 `signInWithOAuth({ provider: 'google' })`를 호출합니다.
2. Google 인증 결과는 Supabase `/auth/v1/callback`으로 전달됩니다.
3. Supabase가 앱 `/auth/callback?code=...`으로 돌려보냅니다.
4. 앱 `exchangeCodeForSession`이 PKCE 일회용 코드를 교환하고 쿠키 세션을 설정합니다.
5. 안전한 내부 복귀 경로로 이동합니다. `/profile`에서는 사용자 상태별 로그인/등록/완료 화면을 직접 렌더링합니다.

Auth 사용자 생성 트리거가 같은 UUID로 프로필을 만듭니다. 로그인 메타데이터는 서비스의 수동 이름·학번이나 역할을 덮어쓰는 근거가 아닙니다. 미들웨어는 JWT 검증·세션 갱신을 수행하고 보호된 페이지/API는 `getUser()`로 실제 사용자를 확인합니다. 쿠키에 값이 있다는 사실이나 검증하지 않은 세션 객체만 믿지 않습니다.

## OAuth 등록 주소

| 등록 위치 | 주소 |
| --- | --- |
| Google Cloud 승인된 리디렉션 URI | `https://kwkhydnvbxvcfvhksxna.supabase.co/auth/v1/callback` |
| Supabase Redirect URLs — Next 개발 | `http://localhost:3000/auth/callback` |
| Supabase Redirect URLs — 운영 | `https://dimi-arte-ticket.gpt-class2-4.chatgpt.site/auth/callback` |

환경의 `NEXT_PUBLIC_SITE_URL`도 해당 앱 origin과 맞춰야 합니다. Worker 프리뷰 origin으로 실제 OAuth를 테스트한다면 그 환경 주소도 별도로 허용해야 합니다. Google callback과 앱 callback은 서로 대체할 수 없습니다. 키·Client Secret·쿠키를 로그나 문서에 붙여 넣지 않습니다. 실제 허용 목록과 계정 로그인 완료는 별도 운영 확인입니다.

## 이전 예약 연결과 본인 티켓

완료 프로필의 양끝 공백을 제거한 이름·학번으로 네 예약 출처에서 정확히 일치하는 `user_id IS NULL` 예약만 연결합니다. 다른 소유자가 있는 예약은 이동하지 않습니다. 이 방식은 사용자 요청에 따른 낮은 보증 수준의 연결이며 두 값을 아는 사람이 먼저 등록하는 위험을 제거하지 못합니다. 잘못된 연결 대응에는 운영자 확인이 필요합니다.

저장·로그인 callback·조회 시 연결을 재확인하며 완료 프로필의 연결 신원 변경은 제한합니다. 실제 예약을 일괄 연결하지 않습니다. `/profile/bookings`와 상세 티켓은 확인된 UUID 필터와 소유자 전용 SELECT RLS를 함께 사용합니다. 다른 계정 ID와 없는 ID는 구분해 공개하지 않습니다.

유효 예약 티켓만 표시하고 취소 내역은 보존합니다. 공연을 특정할 수 없는 레거시 예약의 공연 정보·재예매 주소를 추정하지 않습니다. [취소·재예매](owned-reservation-actions.md)를 참고하세요. 별도 공유 토큰 티켓은 세션 기반 본인 조회와 다른 접근 모델입니다.

## 권한 경계

프로필/예약 SELECT는 자기 행 RLS로 제한합니다. 프로필 저장·예약 연결·권한 변경·승인·문의 RPC는 일반 브라우저에서 직접 실행할 수 없으며 서버가 검증된 사용자 ID를 전달합니다. 관리자 공연 저장처럼 인증 세션의 관리자 RLS로 실행되는 경로도 있으므로 모든 RPC를 service-role 호출이라고 일반화하지 않습니다.

관리자는 `profiles.is_admin`, 선예매는 `is_presale_user`와 승인된 부원 기록을 DB에서 확인합니다. 자기 신고·명단 일치만으로 권한이 생기지 않습니다. 기존 관리자 승인 후 관리자·선예매 권한을 부여하고 부원은 공연별 누적 2장으로 제한합니다. [부원 승인](arte-member-approval.md), [선예매 규칙](member-presale-two-tickets.md).

문의는 로그인만으로 작성할 수 있고 프로필 미완료 상태에서도 지원합니다. 내용은 본인·현재 관리자만 볼 수 있습니다. 답변은 한 번 등록하며 외부 자동 알림은 없습니다. [문의 구조](profile-admin-inquiries.md).

## 계정 삭제와 변경 관리

Auth 삭제는 기존 서버 처리 경로로 수행합니다. 프로필·방문·본인 문의는 CASCADE로 삭제되며 예약/리뷰는 기록을 보존하면서 소유자 연결을 해제하고 기존 탈퇴 RPC로 개인정보를 익명화합니다. FK `SET NULL`만으로 익명화가 완료되는 것은 아닙니다. 답변한 관리자만 삭제되면 해당 답변은 남고 답변자 FK를 비웁니다.

서버 비밀 변수와 공개 키 구분은 [README](../README.md), 전체 관계·RPC는 [DB 구조](database-structure.md), 적용/검증 원칙은 [DB 변경 관리](../database/README.md)를 참고합니다. 과거 스냅샷의 계정/예약 행 수를 현재 수량으로 인용하지 않습니다.
