import { type NextRequest } from "next/server"
import { z } from "zod"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
import { createServerClient } from "@/lib/server/supabase-admin"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { readJsonBody, RequestBodyError } from "@/lib/security/request"
import { invalidMembershipOrigin, membershipFailure, membershipResponse } from "@/lib/server/arte-membership-request"

export const dynamic = "force-dynamic"
export const revalidate = 0
const reviewSchema = z.object({ requestId: z.string().uuid(), approve: z.boolean(), identityConfirmed: z.boolean() })
  .strict().refine(value => !value.approve || value.identityConfirmed, { message: "로그인 이메일과 실제 부원 정보를 먼저 확인해주세요." })

async function memberRequests(request: NextRequest, review: boolean) {
  try {
    const auth = await createAuthServerClient()
    const { data: { user }, error: authError } = await auth.auth.getUser()
    if (authError || !user) return membershipResponse({ error: "로그인이 필요합니다." }, 401)
    const { data: isAdmin, error: adminError } = await auth.rpc("is_current_user_admin")
    if (adminError) return membershipResponse({ error: "관리자 권한을 확인하지 못했습니다." }, 503)
    if (isAdmin !== true) return membershipFailure("FORBIDDEN")
    if (review && invalidMembershipOrigin(request)) return membershipResponse({ error: "Invalid origin." }, 403)
    if (request.nextUrl.search) return membershipResponse({ error: "Query fields are not allowed." }, 400)
    const supabase = createServerClient()
    if (review) {
      const body = await readJsonBody(request, reviewSchema, 2048)
      const rate = await enforceRateLimit(supabase, request, { bucket: "arte-membership-review", limit: 20, windowSeconds: 60 }, user.id)
      if (rate.unavailable) return membershipResponse({ error: "잠시 후 다시 시도해주세요." }, 503)
      if (!rate.allowed) return membershipResponse({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, 429)
      // The database rechecks the reviewer's CURRENT admin role inside the transaction.
      const { data, error } = await supabase.rpc("review_arte_admin_request", { p_admin_id: user.id, p_request_id: body.requestId, p_approve: body.approve })
      if (error || !data) return membershipResponse({ error: "승인 요청을 처리하지 못했습니다." }, 503)
      if (!data.success) return membershipFailure(data.code)
      return membershipResponse({ success: true, status: data.status })
    }
    const { data, error } = await supabase.rpc("list_arte_admin_requests", { p_admin_id: user.id })
    if (error || !data) return membershipResponse({ error: "승인 요청을 불러오지 못했습니다." }, 503)
    if (!data.success) return membershipFailure(data.code)
    return membershipResponse({ requests: data.requests, total: data.total })
  } catch (error) {
    if (error instanceof RequestBodyError) return membershipResponse({ error: error.message }, error.status)
    return membershipResponse({ error: "승인 요청을 처리하지 못했습니다." }, 503)
  }
}
export function GET(request: NextRequest) { return memberRequests(request, false) }
export function PATCH(request: NextRequest) { return memberRequests(request, true) }
