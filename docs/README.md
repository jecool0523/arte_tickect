# 개발 문서 목차

현재 구현 기준: 2026-10-08. 기능 설명은 코드·검토용 SQL과 함께 갱신합니다. 실행 중인 DB의 적용 여부는 원격 migration 이력이 기준입니다.

## 시작과 운영

- [프로젝트 README](../README.md): 기능, 설치, 환경 변수, 개발 참여.
- [코드 온보딩](code-onboarding.md): 모듈 지도, 예매 파이프라인, API, 변경 주의점.
- [검증 가이드](testing.md): 21개 로컬 회귀 검사, 타입·빌드, DB 및 Worker 검사.
- [유지보수 안내](../MAINTENANCE.md): 관리자 운영, 장애 확인, 배포·복구 원칙.
- [Sites 배포](sites-deployment.md): 빌드/런타임 환경, OAuth 주소, Worker 확인, 발행 구분.

## 계정과 기능

- [로그인·계정 DB 구조](login-db-structure.md): Google OAuth, 세션, 소유권과 권한 경계.
- [프로필과 이전 예약 동기화](profile-onboarding.md): 필수 입력, 프로필 이동, 연결 한계, 본인 티켓.
- [관리자 공연 관리](admin-performances.md): 기존 공연 수정, 한국 시간 예매 기간, 권한 검사.
- [아르떼 부원 승인](arte-member-approval.md): 명단 후보 확인, 기존 관리자 검토, 권한 부여.
- [부원 선예매 2장](member-presale-two-tickets.md): 공연별 누적 수량, 동시성, 취소 복원.
- [본인 예약 취소·재예매](owned-reservation-actions.md): 상태 보존, 새 예약, 소유권 검증.
- [프로필 관리자 문의](profile-admin-inquiries.md): 접수·답변·재시도·접근 제한.

팬 경험치와 최초 프로필 안내 팝업은 [README](../README.md)의 기준 및 각각 `scripts/test-fan-experience.mjs`, `scripts/test-profile-guide.mjs`를 함께 확인합니다.

## 데이터베이스

- [현재 DB 구조](database-structure.md): 테이블 역할, 관계, 권한, 10월 8일 추가 구조.
- [DB 변경 관리](../database/README.md): 적용 이력, 검토용 SQL, ROLLBACK 검사, 재실행 금지.
- [공개 스키마 생성 타입](../types/database.generated.ts), [앱 RPC 계약](../types/supabase.ts).

`database/schema.snapshot.json` 및 `database/migrations.snapshot.json`은 **2026-10-07에 동결한 참고 자료**입니다. 이후 부원 승인·예약 취소·선예매 수량·문의 변경은 포함하지 않습니다. 최신 전체 스냅샷이나 초기화/복원 패키지로 사용하지 않습니다.

## 과거 점검·작업 기록

아래 문서의 수량·미완료 항목은 해당 날짜의 기록입니다. 현재 동작은 위의 기능 문서를 우선합니다.

- [OAuth 준비 보고서 — 2026-08](oauth-readiness.md)
- [작업 정리 — 2026-10-06](work-summary-2026-10-06.md)
- [작업 정리 — 2026-10-07](work-summary-2026-10-07.md)

새 기능을 추가하면 해당 기능 문서와 이 목차를 갱신하고 API/DB 변경 시 온보딩·구조·검증 안내도 함께 확인합니다.
