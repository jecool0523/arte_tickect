import "server-only"
import { type NextRequest, NextResponse } from "next/server"

export const membershipHeaders = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Vary: "Cookie" }

export function membershipResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: membershipHeaders })
}

export function invalidMembershipOrigin(request: NextRequest) {
  const origin = request.headers.get("origin")
  return !!((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site")
}

export function membershipFailure(code?: string) {
  const errors: Record<string, [number, string]> = {
    FORBIDDEN: [403, "관리자 권한이 필요합니다."],
    SELF_APPROVAL_FORBIDDEN: [403, "본인 요청은 승인할 수 없습니다."],
    NOT_FOUND: [404, "승인 요청을 찾을 수 없습니다."],
    PROFILE_INCOMPLETE: [403, "먼저 프로필 정보를 저장해주세요."],
    NOT_ELIGIBLE: [403, "등록된 부원 정보와 일치하지 않습니다. 운영자에게 문의해주세요."],
    EMAIL_UNVERIFIED: [403, "로그인 이메일을 확인할 수 없습니다. 다시 로그인해주세요."],
    ALREADY_REVIEWED: [409, "이미 처리된 요청입니다. 목록을 새로고침해주세요."],
    PROFILE_CHANGED: [409, "요청 이후 계정 정보가 변경되었습니다. 본인을 다시 확인해주세요."],
    MEMBER_ALREADY_APPROVED: [409, "같은 부원으로 이미 승인된 계정이 있습니다. 운영자에게 확인해주세요."],
  }
  const [status, error] = errors[code || ""] || [400, "요청을 처리하지 못했습니다."]
  return membershipResponse({ code, error }, status)
}
