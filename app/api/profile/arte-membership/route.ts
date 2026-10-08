import { type NextRequest } from "next/server"
import { z } from "zod"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
import { createServerClient } from "@/lib/server/supabase-admin"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { readJsonBody, RequestBodyError } from "@/lib/security/request"
import { invalidMembershipOrigin, membershipFailure, membershipResponse } from "@/lib/server/arte-membership-request"

export const dynamic = "force-dynamic"
export const revalidate = 0
const answerSchema = z.object({ isMember: z.boolean() }).strict()

async function membership(request: NextRequest, submit: boolean) {
  try {
    const auth = await createAuthServerClient()
    const { data: { user }, error: authError } = await auth.auth.getUser()
    if (authError || !user) return membershipResponse({ error: "로그인이 필요합니다." }, 401)
    if (submit && invalidMembershipOrigin(request)) return membershipResponse({ error: "Invalid origin." }, 403)
    if (request.nextUrl.search) return membershipResponse({ error: "Query fields are not allowed." }, 400)
    const body = submit ? await readJsonBody(request, answerSchema, 1024) : null
    const supabase = createServerClient()
    if (submit) {
      const rate = await enforceRateLimit(supabase, request, { bucket: "arte-membership-request", limit: 10, windowSeconds: 300 }, user.id)
      if (rate.unavailable) return membershipResponse({ error: "잠시 후 다시 시도해주세요." }, 503)
      if (!rate.allowed) return membershipResponse({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, 429)
      // Identity is bound to the verified session, never to client-supplied profile fields.
      const { data, error } = await supabase.rpc("submit_arte_membership_request", { p_user_id: user.id, p_is_member: body!.isMember })
      if (error || !data) return membershipResponse({ error: "승인 요청을 저장하지 못했습니다." }, 503)
      if (!data.success) return membershipFailure(data.code)
      return membershipResponse({ state: data.state })
    }
    const { data, error } = await supabase.rpc("get_arte_membership_state", { p_user_id: user.id })
    if (error || !data) return membershipResponse({ error: "부원 승인 상태를 확인하지 못했습니다." }, 503)
    return membershipResponse({ state: data })
  } catch (error) {
    if (error instanceof RequestBodyError) return membershipResponse({ error: error.message }, error.status)
    return membershipResponse({ error: "부원 승인 상태를 확인하지 못했습니다." }, 503)
  }
}
export function GET(request: NextRequest) { return membership(request, false) }
export function POST(request: NextRequest) { return membership(request, true) }
