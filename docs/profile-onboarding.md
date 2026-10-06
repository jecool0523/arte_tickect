# 프로필 등록과 이전 예약 동기화

Sites의 기존 소유자 전용 사이트에 적용하며 Google 로그인을 그대로 사용한다. 학교 이메일 도메인 제한은 없다.

- 최초 로그인 후 `/profile/setup`에서 아이디·이름·학번·연락처를 필수 입력한다. 기존 로그인 사용자도 네 필드 등록이 필요하다.
- 아이디 기본값은 이메일 local part이다. 영문·숫자만 허용하므로 점·더하기 등은 기본값에서 제외한다. 1~30자, 대소문자 구분 없는 중복 검사를 한다. 로그인 방식 자체는 Google OAuth이다.
- 연락처는 구분 기호를 제거하여 저장하며 숫자 9~15자리와 국제번호 `+`를 허용한다. 전화번호 인증을 의미하지 않는다.
- 입력한 이름·학번을 양끝 공백 제거 후 정확히 대조한다. 이메일/Google 이름을 본인 인증 근거로 사용하지 않는다.
- `dead_poets_society_bookings`, `rent_bookings`, `toctoc_bookings`, `arte_musical_tickets`의 `user_id IS NULL`인 일치 예약만 연결한다. 기존 소유 계정은 바꾸지 않는다. 제목을 특정할 수 없는 마지막 테이블은 ‘아르떼 이전 공연’으로 표시한다.
- 완료 저장, 로그인 callback, 프로필 조회에서 연결을 재확인한다. 프로필 행 잠금과 고유 인덱스로 동시 저장을 직렬화한다. 이미 연결된 예약이 있는 완료 프로필의 이름·학번 변경은 제한하고 아이디·연락처 변경은 허용한다. 최초 정보 등록은 기존 소유 예약이 있어도 허용한다.
- 좌석·예매 상태·예매일은 유지한다. 연결 UPDATE에 기존 updated_at 트리거가 적용된다. 탈퇴 정리는 레거시 테이블까지 익명화한다.
- 브라우저에는 본인 프로필·티켓만 SELECT 허용한다. 저장/연결 RPC는 service_role 전용이며 API에서 검증된 로그인 UID만 전달한다. 미등록 사용자의 신규 예매 API는 403이다.

## 본인 확인 한계

이 방식은 사용자가 입력한 이름·학번을 신뢰하는 낮은 보증 수준의 연결이다. 두 값을 아는 다른 사람이 먼저 등록하면 잘못 연결될 수 있다. 소유 계정 보호, 중복 학번 방지, 연결 후 이름·학번 변경 제한은 이 위험을 없애는 본인 인증 수단이 아니다. 정확한 본인 확인이 필요하면 운영자 확인이나 별도 증빙 절차를 추가해야 한다.

## 원격 DB 변경 이력

Supabase 연결 도구로 다음 마이그레이션을 적용했다. 로컬 임의 타임스탬프 마이그레이션 파일은 만들지 않았으며 원격 history가 기준이다.

1. `profile_onboarding_and_legacy_booking_sync`: profiles 필드/검증/아이디 고유 인덱스/완료 신원 고유 인덱스, 서버 전용 저장 및 연결 RPC, Auth metadata가 수동 입력 이름을 덮어쓰지 않는 트리거.
2. `profile_legacy_booking_account_cleanup`: 탈퇴 시 레거시 티켓도 익명화.
3. `profile_first_setup_existing_ticket_identity`: 이미 예약한 기존 계정도 최초 정보 등록 가능.

기존 `profiles_student_id_unique` 인덱스와 기존 RLS는 보존했다. 서로 다른 계정에서 같은 학번을 사용할 수 없는 기존 제한도 유지된다.

검증: `scripts/test-profile-onboarding.sql`의 임시 사용자/예약 트랜잭션은 항상 ROLLBACK한다. 실제 예약은 일괄 연결하지 않았다. 사용자 동작 시에만 연결된다. `scripts/test-profile-inputs.mjs`는 기본값·필수 입력·연락처 정규화·안전한 다음 경로를 검증한다.

Supabase advisors에서 기존 GraphQL 테이블 노출 경고와 유출 비밀번호 보호 비활성화 경고가 남아 있다. 이번 필드는 profiles의 본인 전용 SELECT RLS 적용 대상이며 다른 이용자의 연락처는 노출되지 않는다. [GraphQL 권한 점검](https://supabase.com/docs/guides/database/database-linter?lint=0027_pg_graphql_authenticated_table_exposed), [유출 비밀번호 보호 설정](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

실제 Google 계정의 최종 로그인 성공 여부는 사용자 로그인이 필요하다. Supabase Auth Redirect URLs에는 `https://dimi-arte-ticket.gpt-class2-4.chatgpt.site/auth/callback`이 허용되어야 한다.
