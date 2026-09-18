# ARTE 소셜 로그인 DB 구조 가이드

> 작성 기준: 2026-09-03 · Supabase 프로젝트 `kwkhydnvbxvcfvhksxna`와 현재 저장소의 실제 구현

이 문서는 ARTE 티켓 사이트의 Google 로그인 정보가 어디에 저장되고, 로그인한 사용자와 프로필·예매 티켓이 어떻게 연결되는지를 설명한다. DB나 OAuth를 처음 접하는 사람도 이해할 수 있도록 먼저 쉬운 비유로 설명하고, 뒤에서 실제 테이블과 코드 흐름을 구체적으로 다룬다.

## 1. 먼저 한 문장으로 이해하기

**Supabase가 로그인 계정에 고유한 `UUID`를 발급하고, 프로필과 새 예매 티켓에 같은 UUID를 기록하여 “이 데이터가 누구 것인지” 판단한다.**

학교에 비유하면 다음과 같다.

| 실제 구성 | 쉬운 비유 | 역할 |
| --- | --- | --- |
| `auth.users` | 학교가 관리하는 학생 원부 | 로그인 계정의 기준 정보 |
| `auth.identities` | 학생증에 연결된 인증 수단 | 이 계정이 Google로 로그인한다는 연결 정보 |
| `public.profiles` | 학생이 수정할 수 있는 개인 카드 | 표시 이름, 학번, 프로필 사진 |
| 예매 테이블의 `user_id` | 티켓에 찍힌 학생 고유번호 | 티켓 소유자 표시 |
| 세션 쿠키 | 유효 시간이 있는 출입 손목띠 | 현재 브라우저가 로그인했음을 증명 |
| RLS | DB 앞에서 신분을 확인하는 문지기 | 자기 행만 읽거나 수정하도록 제한 |

여기서 가장 중요한 값은 사용자 UUID다. 예를 들어 Supabase가 사용자에게 아래 ID를 발급했다고 가정한다.

```text
8c63aef4-6a8c-4ad4-a1d5-c2bfec8ee310
```

이 값이 `auth.users.id`, `profiles.id`, 새 티켓의 `user_id`에 동일하게 들어간다. 이름이나 학번이 바뀌어도 UUID는 유지되므로 티켓 소유권이 흔들리지 않는다.

## 2. 전체 관계도

```mermaid
erDiagram
    AUTH_USERS ||--o{ AUTH_IDENTITIES : "로그인 수단 연결"
    AUTH_USERS ||--|| PROFILES : "같은 UUID로 1:1 연결"
    AUTH_USERS ||--o{ DEAD_POETS_BOOKINGS : "user_id 소유"
    AUTH_USERS ||--o{ RENT_BOOKINGS : "user_id 소유"
    AUTH_USERS ||--o{ TOCTOC_BOOKINGS : "user_id 소유"
    AUTH_USERS ||--o{ ARTE_MUSICAL_TICKETS : "레거시 user_id"
    AUTH_USERS ||--o{ REVIEWS : "향후 user_id 연결"

    AUTH_USERS {
        uuid id PK
        text email
        jsonb raw_user_meta_data
    }
    AUTH_IDENTITIES {
        uuid id PK
        uuid user_id FK
        text provider
    }
    PROFILES {
        uuid id PK_FK
        text display_name
        text student_id UK
        text avatar_url
        timestamptz created_at
        timestamptz updated_at
    }
    DEAD_POETS_BOOKINGS {
        bigint id PK
        uuid user_id FK
        text student_id
        text_array selected_seats
    }
    RENT_BOOKINGS {
        bigint id PK
        uuid user_id FK
        text student_id
        text_array selected_seats
    }
    TOCTOC_BOOKINGS {
        bigint id PK
        uuid user_id FK
        text student_id
        text_array selected_seats
    }
```

`PK`는 테이블 안에서 한 행을 고유하게 구분하는 기본 키, `FK`는 다른 테이블의 행을 가리키는 외래 키, `UK`는 같은 값의 중복을 막는 고유 키다.

## 3. 로그인과 직접 관련된 핵심 테이블

### 3.1 `auth.users`: 계정의 원본

`auth.users`는 Supabase Auth가 관리한다. Google 로그인이 성공하면 Supabase가 이 테이블에 사용자를 만들거나 기존 사용자를 찾아 로그인 시간을 갱신한다.

주요 값은 다음과 같다.

| 열 | 의미 |
| --- | --- |
| `id` | 계정의 영구 고유번호인 UUID |
| `email` | Google에서 전달된 이메일 |
| `raw_user_meta_data` | Google 이름, 프로필 이미지 등 공급자가 전달한 부가 정보 |
| `last_sign_in_at` | 마지막 로그인 시각 |
| `created_at` | 계정 생성 시각 |

이 테이블은 앱의 일반 데이터 테이블처럼 직접 수정하지 않는다. 사용자 생성·로그아웃·계정 삭제는 Supabase Auth API를 통해 처리해야 한다.

### 3.2 `auth.identities`: Google 계정 연결 정보

한 사용자가 어떤 로그인 공급자를 사용하는지 기록한다.

```text
auth.users.id ← auth.identities.user_id
                   auth.identities.provider = "google"
```

나중에 다른 소셜 공급자를 추가하면 한 `auth.users` 계정에 여러 identity가 연결될 수 있다. 현재 원격 DB에는 Google identity 1개가 있어 Google 로그인 연결이 실제로 성공한 상태다.

### 3.3 `public.profiles`: 서비스용 사용자 정보

`auth.users`는 Supabase가 관리하므로 서비스에서 자유롭게 다룰 정보는 별도 `profiles` 테이블에 저장한다.

| 열 | 필수 여부 | 설명 |
| --- | --- | --- |
| `id UUID` | 필수 | `auth.users.id`와 동일한 값이며 프로필의 기본 키 |
| `display_name TEXT` | 선택 | 화면에 표시할 이름, 1~100자 |
| `student_id TEXT` | 선택 | 영문·숫자·`_`·`-`만 허용, 최대 20자, 중복 불가 |
| `avatar_url TEXT` | 선택 | Google 등에서 받은 프로필 이미지 주소 |
| `created_at` | 필수 | 프로필 생성 시각 |
| `updated_at` | 필수 | 마지막 수정 시각, 수정할 때 트리거가 자동 갱신 |

`profiles.id`에는 아래 외래 키가 적용되어 있다.

```sql
id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
```

뜻을 나누어 보면 다음과 같다.

- `PRIMARY KEY`: 사용자마다 프로필이 하나만 존재한다.
- `REFERENCES auth.users(id)`: 실제 로그인 계정이 없는 가짜 프로필을 만들 수 없다.
- `ON DELETE CASCADE`: 계정을 완전히 삭제하면 그 계정의 프로필도 함께 삭제된다.

중요하게도 `student_id`는 보조 정보이지 로그인 증명이 아니다. 학번을 안다고 해서 그 사람의 계정이나 티켓에 접근할 수 있어서는 안 된다.

## 4. 로그인하면 프로필은 어떻게 만들어지는가

DB 트리거 `on_auth_user_created`가 이 작업을 자동으로 한다.

```text
Google 로그인 성공
        ↓
Supabase가 auth.users에 새 사용자 INSERT
        ↓
on_auth_user_created 트리거 실행
        ↓
handle_new_auth_user() 함수 실행
        ↓
같은 UUID로 public.profiles 행 생성
```

`handle_new_auth_user()`는 Google 메타데이터의 `full_name` 또는 `name`, `avatar_url`을 초기 프로필 값으로 복사한다. `ON CONFLICT DO NOTHING`도 있으므로 같은 ID의 프로필이 이미 있으면 중복 생성하지 않는다.

이 함수는 `SECURITY DEFINER`로 필요한 DB 권한을 가지고 실행되며 `search_path = ''`로 객체 경로를 명확히 고정했다. 일반 브라우저 사용자가 함수를 직접 호출할 권한은 철회되어 있다.

마이그레이션 적용 전에 가입한 사용자가 있더라도 마지막의 backfill 구문이 빠진 프로필을 만들어 준다.

## 5. Google 로그인 요청부터 세션 생성까지

로그인에는 서로 다른 콜백 주소 두 개가 등장한다. 이름이 비슷하지만 용도가 다르다.

1. 사용자가 `/login`에서 **Google로 계속하기**를 누른다.
2. 브라우저의 Supabase 클라이언트가 `signInWithOAuth({ provider: "google" })`를 호출한다.
3. Google 로그인·동의 화면으로 이동한다.
4. Google은 인증 결과를 Supabase 콜백으로 보낸다.
5. Supabase는 앱의 `/auth/callback?code=...`으로 사용자를 돌려보낸다.
6. 앱은 `exchangeCodeForSession(code)`로 일회용 코드를 세션으로 교환한다.
7. 암호화된 세션 정보가 브라우저 쿠키에 저장되고 `/account` 또는 원래 요청한 페이지로 이동한다.

두 콜백의 실제 역할은 다음과 같다.

| 등록 위치 | 콜백 주소 | 역할 |
| --- | --- | --- |
| Google Cloud의 승인된 리디렉션 URI | `https://kwkhydnvbxvcfvhksxna.supabase.co/auth/v1/callback` | Google → Supabase |
| Supabase Redirect URLs | `http://localhost:3000/auth/callback` 및 운영 도메인의 `/auth/callback` | Supabase → 우리 앱 |

Google Cloud에 두 번째 주소를 넣거나 첫 번째 주소를 빠뜨리면 `400 redirect_uri_mismatch`가 발생한다.

PKCE 방식에서 URL의 `code`는 비밀번호나 영구 토큰이 아니라 짧게 유효하고 한 번만 교환할 수 있는 임시 교환권이다. 실제 교환 코드는 [`app/auth/callback/route.ts`](../app/auth/callback/route.ts)에 있다.

## 6. 로그인 상태를 서버가 믿을 수 있는 이유

쿠키에 값이 있다고 무조건 로그인으로 인정하지 않는다.

- 미들웨어는 요청마다 `getClaims()`를 호출해 JWT 서명을 확인하고, 필요하면 만료된 세션을 갱신한다.
- 보호된 페이지와 예매 API는 `getUser()`로 Supabase Auth 서버가 확인한 최신 사용자 정보를 가져온다.
- 예매 API는 검증된 `user.id`만 DB에 넘긴다.

즉 브라우저가 요청 본문에 임의의 `user_id`를 넣어도 소유자가 될 수 없다. 브라우저가 보낸 ID를 믿지 않고 서버가 세션에서 직접 꺼낸 ID를 사용하기 때문이다.

관련 코드는 [`lib/server/supabase-middleware.ts`](../lib/server/supabase-middleware.ts), [`lib/server/require-auth.ts`](../lib/server/require-auth.ts), [`app/api/bookings/[musicalId]/route.ts`](../app/api/bookings/%5BmusicalId%5D/route.ts)에서 확인할 수 있다.

## 7. 예매 티켓과 로그인 사용자의 연결

현재 실제 예매에 사용하는 핵심 테이블은 세 개다.

| 공연 | 테이블 |
| --- | --- |
| 죽은 시인의 사회 | `dead_poets_society_bookings` |
| RENT | `rent_bookings` |
| TOC TOC | `toctoc_bookings` |

세 테이블은 공통으로 다음 구조를 사용한다.

| 열 | 설명 |
| --- | --- |
| `id` | 예매 건의 고유번호 |
| `user_id` | 로그인 계정 UUID, `auth.users.id`를 참조 |
| `name` | 예매자 입력 이름 |
| `student_id` | 예매자가 입력한 학번 |
| `seat_grade` | VIP, R, S 등의 좌석 등급 |
| `selected_seats` | 선택한 좌석 코드 배열 |
| `special_request` | 선택 입력 요청사항 |
| `status` | `confirmed` 등 예매 상태 |
| `booking_date` | 예매 시각 |
| `created_at`, `updated_at` | 생성·수정 시각 |

`user_id`에는 아래 관계가 적용되어 있다.

```sql
user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
```

계정을 삭제할 때 프로필은 같이 지우지만 티켓 기록은 지우지 않고 `user_id`만 `NULL`로 바꾼다. 공연 운영·좌석 정산 기록을 보존하면서 삭제된 계정과의 연결은 끊기 위한 선택이다.

### 새 예매가 저장되는 과정

```text
로그인 사용자
   ↓ 예매 정보 전송 (user_id는 보내지 않음)
Next.js 예매 API
   ↓ getUser()로 세션 검증
   ↓ 검증된 user.id를 p_user_id로 추가
service_role 전용 book_musical_seats RPC
   ↓ 입력값·좌석 형식 검사
   ↓ 테이블 잠금 후 좌석 중복 검사
예매 테이블에 user_id와 티켓 저장
```

`book_musical_seats` 함수는 `p_user_id`가 없으면 저장을 거부하며, 브라우저 역할인 `anon`과 `authenticated`는 이 함수를 직접 실행할 수 없다. 서버의 `service_role`만 실행할 수 있다.

테이블 잠금은 거의 동시에 두 사람이 같은 좌석을 누른 경우에도 한 명만 성공하도록 좌석 확인과 저장을 한 덩어리로 처리하기 위한 장치다.

## 8. RLS가 자기 데이터만 보여주는 방법

RLS(Row Level Security)는 같은 테이블에서도 사용자별로 볼 수 있는 **행**을 제한하는 PostgreSQL 보안 기능이다.

예매 테이블에는 아래와 같은 정책이 있다.

```sql
CREATE POLICY "Users can read own bookings"
ON public.rent_bookings
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);
```

`auth.uid()`는 현재 로그인한 사용자의 UUID다.

- Alice의 UUID가 `aaa...`이고 티켓의 `user_id`도 `aaa...`이면 조회된다.
- Bob의 UUID가 `bbb...`이면 Alice의 티켓은 조건이 거짓이라 결과에서 빠진다.
- 로그인하지 않은 사용자는 `authenticated` 역할이 아니므로 이 정책을 사용할 수 없다.
- 예전 티켓처럼 `user_id`가 `NULL`이면 어느 로그인 사용자에게도 자동으로 보이지 않는다.

프로필도 같은 원리로 `auth.uid() = profiles.id`인 자기 행만 읽고 수정할 수 있다. 사용자는 `display_name`, `student_id`, `avatar_url`만 수정할 수 있고 `id`, 생성 시각 등은 바꿀 수 없다.

### `GRANT`와 RLS의 차이

두 장치는 함께 작동한다.

- `GRANT`: 건물 입구 통과 권한. 예를 들어 `authenticated`에게 `SELECT` 자체를 허용한다.
- RLS 정책: 건물 안에서 열 수 있는 서랍을 제한한다. `SELECT`가 가능해도 자기 행만 보인다.

둘 중 하나라도 막으면 데이터에 접근할 수 없다. 반대로 `service_role`은 서버 관리 작업용 강한 권한이므로 RLS를 우회할 수 있다. 이 키를 브라우저 코드나 `NEXT_PUBLIC_*` 환경 변수에 절대 넣으면 안 된다.

## 9. 현재 DB 데이터 상태

2026-09-03에 개인정보 값은 읽지 않고 행 수와 소유권 연결 상태만 다시 확인했다.

| 대상 | 전체 행 | 로그인 계정에 연결된 행 | 해석 |
| --- | ---: | ---: | --- |
| `auth.users` | 1 | - | 테스트 로그인 계정 생성됨 |
| `auth.identities` | 1 | Google 1 | Google OAuth 연결 성공 |
| `profiles` | 1 | 학번 입력 1 | 프로필 자동 생성 및 보완 성공 |
| `dead_poets_society_bookings` | 39 | 0 | 모두 로그인 도입 전 티켓 |
| `rent_bookings` | 134 | 0 | 모두 로그인 도입 전 티켓 |
| `toctoc_bookings` | 199 | 0 | 모두 로그인 도입 전 티켓 |
| `arte_musical_tickets` | 150 | 0 | 레거시 티켓, 현재 계정 화면 미사용 |
| `reviews` | 8 | 0 | 후기 소유권 연결은 아직 미완료 |

현재 `/account`의 **내 티켓**은 핵심 예매 테이블 세 개에서 로그인 사용자의 `user_id`가 기록된 행만 읽는다. 따라서 기존 핵심 티켓 372건은 보존되어 있지만 계정 화면에는 나타나지 않는다.

기존 티켓을 이름과 학번만 비교해 자동 연결하면 안 된다. 두 값을 아는 다른 사람이 티켓을 탈취할 수 있기 때문이다. 기존 티켓 연결이 필요하면 아래 중 하나를 별도 기능으로 구현하는 것이 안전하다.

1. 티켓별 일회용 인증 코드
2. 기존에 발급된 서명된 공유 토큰 검증
3. 학교 이메일 또는 다른 신뢰 가능한 수단 검증
4. 운영자 확인 후 수동 연결

## 10. 핵심·보조·정리 후보 테이블

| 분류 | 테이블 | 현재 판단 |
| --- | --- | --- |
| 로그인 핵심 | `auth.users`, `auth.identities`, `profiles` | 유지. 계정·공급자·서비스 프로필의 기준 |
| 예매 핵심 | `dead_poets_society_bookings`, `rent_bookings`, `toctoc_bookings` | 유지. 현재 공연별 예매와 내 티켓에 사용 |
| 운영 핵심 | `arte_musical_application_period`, `presale_access_keys`, `api_rate_limits` | 유지. 예매 기간·사전예매·요청 제한에 사용 |
| 기능 핵심 | `reviews` | 유지. 후기에 사용하지만 로그인 `user_id` 저장은 추가 구현 필요 |
| 레거시 후보 | `arte_musical_tickets` | 데이터 150건이 있어 즉시 삭제 금지. 레거시 `/api/seats` 의존성 제거 후 보관·이관 검토 |
| 미사용 후보 | `bookings`, `seat_status`, `review-images` | 현재 주요 앱 흐름에서 사용하지 않음. 행·외래 키·운영 의존성·백업 확인 후 별도 마이그레이션으로 정리 |

테이블 삭제는 로그인 구현과 분리해야 한다. 특히 데이터가 있는 `arte_musical_tickets`는 “지금 화면에서 안 쓴다”는 이유만으로 삭제해서는 안 된다.

장기적으로 공연별 예매 테이블 세 개를 `performances`와 단일 `bookings` 구조로 합치면 새 공연을 추가할 때 테이블을 매번 만들지 않아도 된다. 다만 이는 데이터 이관과 회귀 테스트가 필요한 별도 프로젝트다.

## 11. 환경 변수와 키 관리

| 환경 변수 | 브라우저 노출 | 용도 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 가능 | Supabase 프로젝트 주소 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 가능 | 브라우저용 공개 키 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 가능 | 기존 프로젝트 호환용 공개 키 대체값 |
| `NEXT_PUBLIC_SITE_URL` | 가능 | 운영 사이트 주소와 리디렉션 기준 |
| `SUPABASE_SERVICE_ROLE_KEY` | **절대 불가** | 서버 전용 관리자 권한 |
| `TICKET_SHARE_SECRET` | **절대 불가** | 티켓 공유 토큰 서명·검증용 비밀값 |

공개 키는 이름 그대로 브라우저에 노출될 수 있다. 공개 키만으로 개인정보가 보이지 않도록 RLS와 권한이 반드시 켜져 있어야 한다. 반면 `service_role`은 RLS를 우회할 수 있어 서버에서만 사용한다.

## 12. 현재 완료된 범위와 다음 작업

### 완료

- Google OAuth 로그인과 PKCE 콜백 처리
- 쿠키 기반 서버 세션 생성·갱신
- 로그인 계정 생성 시 `profiles` 자동 생성
- 프로필 본인 조회·수정 RLS
- 예매 테이블에 nullable `user_id`와 외래 키·인덱스 추가
- 새 예매 시 서버가 검증한 `user.id` 저장
- 로그인 사용자의 내 티켓 조회
- 공개 예매 개인정보 조회·삽입 권한 제거
- 이름+학번만으로 티켓을 찾던 레거시 조회 API 비활성화

### 다음 우선순위

1. **로그인 상태로 새 테스트 예매 1건 생성**: 해당 행에 `user_id`가 들어가고 `/account`에만 표시되는지 확인한다.
2. **기존 티켓 claim 정책 결정**: 자동 매칭하지 말고 일회용 코드·서명 토큰·운영자 승인 중 하나를 선택한다.
3. **후기 로그인 연결**: 후기 생성 API가 검증된 `user.id`를 `reviews.user_id`에 저장하게 한다. 기존 삭제 토큰은 레거시 후기 호환용으로 유지할 수 있다.
4. **운영 OAuth 주소 점검**: 운영 도메인의 `/auth/callback`을 Supabase Redirect URLs에 넣고, Google Cloud에는 Supabase callback을 정확히 유지한다.
5. **계정 삭제 정책 구현**: 프로필은 자동 삭제되고 티켓은 익명 기록으로 남는 현재 정책이 개인정보 처리방침과 운영 요구에 맞는지 확정한다.
6. **레거시 테이블 정리**: 백업과 참조 조사를 마친 뒤에만 별도 마이그레이션으로 삭제하거나 이관한다.

## 13. 자주 발생하는 문제

### `400 redirect_uri_mismatch`

Google Cloud의 승인된 리디렉션 URI에 아래 주소가 글자 하나까지 정확히 등록되었는지 확인한다.

```text
https://kwkhydnvbxvcfvhksxna.supabase.co/auth/v1/callback
```

### Google 로그인은 끝났는데 앱 로그인 페이지로 돌아온다

Supabase Authentication의 Redirect URLs에 현재 사이트의 `/auth/callback`이 등록되었는지 확인한다. 로컬 테스트 주소는 `http://localhost:3000/auth/callback`이다.

### 로그인은 됐는데 내 티켓이 비어 있다

기존 티켓이면 `user_id`가 `NULL`일 가능성이 가장 높다. 새 예매라면 예매 행의 `user_id`가 현재 `auth.users.id`와 같은지 확인한다.

### 계정은 있는데 프로필이 없다

`on_auth_user_created` 트리거와 `handle_new_auth_user()` 함수 상태를 확인하고, `auth.users.id`로 `profiles` backfill을 실행한다. 원인을 고치지 않은 채 브라우저에 광범위한 `INSERT` 권한을 주면 안 된다.

### 예매 API가 401을 반환한다

로그인 쿠키가 없거나 만료되었거나 서버 검증에 실패한 상태다. 다시 로그인한 뒤 요청하고, 미들웨어가 Supabase가 갱신한 쿠키를 응답에 전달하는지 확인한다.

## 14. 보안 규칙 요약

- 계정의 기준은 이름이나 학번이 아니라 `auth.users.id`다.
- 브라우저가 보낸 `user_id`는 신뢰하지 않는다.
- 권한 판단에는 검증되지 않은 세션 객체나 `user_metadata`를 사용하지 않는다.
- `SUPABASE_SERVICE_ROLE_KEY`와 `TICKET_SHARE_SECRET`은 서버 밖으로 노출하지 않는다.
- 모든 브라우저 접근 테이블은 최소 권한과 RLS를 함께 적용한다.
- 기존 티켓을 이름+학번만으로 계정에 자동 연결하지 않는다.
- 레거시 데이터는 백업·의존성 확인 없이 삭제하지 않는다.

## 15. 관련 파일과 공식 문서

프로젝트 구현:

- [OAuth 및 DB 보안 마이그레이션](../scripts/20260829-oauth-readiness.sql)
- [로그인 사용자 예매 소유권 RPC](../scripts/20260831-booking-owner-rpc.sql)
- [OAuth 앱 콜백](../app/auth/callback/route.ts)
- [Google 로그인 버튼](../components/auth/oauth-login-button.tsx)
- [서버 Auth 클라이언트](../lib/server/supabase-auth.ts)
- [세션 갱신 미들웨어](../lib/server/supabase-middleware.ts)
- [예매 API](../app/api/bookings/%5BmusicalId%5D/route.ts)
- [내 계정·내 티켓 화면](../app/account/page.tsx)
- [기존 OAuth 준비 보고서](./oauth-readiness.md)

Supabase 공식 문서:

- [Next.js 사용자 관리와 서버 인증](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
- [PKCE 인증 흐름](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [사용자 데이터 관리와 프로필 트리거](https://supabase.com/docs/guides/auth/managing-user-data)
- [Postgres Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

## 16. 용어 사전

| 용어 | 쉬운 설명 |
| --- | --- |
| OAuth | 비밀번호를 우리 사이트에 주지 않고 Google을 통해 본인을 확인하는 방식 |
| UUID | 다른 사용자와 사실상 겹치지 않는 긴 고유번호 |
| 세션 | 로그인 성공 후 일정 기간 로그인 상태를 유지하는 정보 |
| 쿠키 | 브라우저가 서버 요청마다 함께 보내는 작은 데이터 |
| JWT | 사용자 ID와 만료 시간 등을 담고 서명된 토큰 |
| PKCE | 로그인 중간 코드를 가로채도 쉽게 악용하지 못하도록 하는 OAuth 보호 방식 |
| RLS | 사용자가 접근할 수 있는 DB 행을 사용자별로 제한하는 기능 |
| 정책(Policy) | RLS가 어떤 행을 허용할지 정한 조건 |
| 트리거 | 특정 DB 변경이 발생하면 자동으로 실행되는 동작 |
| RPC | 앱이 호출할 수 있도록 DB에 만든 함수 |
| `service_role` | RLS를 우회할 수 있는 서버 전용 강한 권한 |
| 레거시 | 과거 기능에서 사용했지만 현재 구조로 교체 중인 데이터나 코드 |
