import "server-only"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
import { createServerClient } from "@/lib/server/supabase-admin"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { readJsonBody, RequestBodyError } from "@/lib/security/request"

const headers = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Vary: "Cookie" }
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers })
const content = z.string().trim().min(1).max(2000)
const inquirySchema = z.object({ requestKey: z.string().uuid(), content }).strict()
const replySchema = z.object({ inquiryId: z.string().uuid(), reply: content }).strict()
const failures: Record<string, [number, string]> = {
  FORBIDDEN: [403, "관리자 권한이 필요합니다."],
  NOT_FOUND: [404, "문의 정보를 찾을 수 없습니다."],
  INVALID_INPUT: [400, "문의 내용을 확인해주세요."],
  REQUEST_CHANGED: [409, "문의 내용이 변경되었습니다. 다시 보내주세요."],
  ALREADY_ANSWERED: [409, "다른 관리자가 이미 답변했습니다. 새로고침해주세요."],
}

export async function handleSupportRequest(request: NextRequest, admin: boolean, write: boolean) {
  try {
    const auth = await createAuthServerClient()
    const { data: { user }, error: authError } = await auth.auth.getUser()
    if (authError || !user) return json({ error: "로그인이 필요합니다." }, 401)
    if (admin) {
      const { data: isAdmin, error } = await auth.rpc("is_current_user_admin")
      if (error) return json({ error: "관리자 권한을 확인하지 못했습니다." }, 503)
      if (isAdmin !== true) return json({ error: "관리자 권한이 필요합니다." }, 403)
    }
    const params = request.nextUrl.searchParams
    if ([...params.keys()].some(key => write || key !== "offset") || params.getAll("offset").length > 1)
      return json({ error: "허용되지 않은 조회 항목입니다." }, 400)
    const offsetValue = params.get("offset") ?? "0"
    if (!/^(0|[1-9][0-9]{0,6})$/.test(offsetValue) || Number(offsetValue) > 1000000)
      return json({ error: "페이지를 확인해주세요." }, 400)
    const origin = request.headers.get("origin")
    if (write && ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site"))
      return json({ error: "Invalid origin." }, 403)
    const client = createServerClient()
    let data, error
    if (!write) {
      ({ data, error } = await client.rpc("list_support_inquiries", { p_user_id: user.id, p_admin: admin, p_offset: Number(offsetValue) }))
    } else {
      const body = admin ? await readJsonBody(request, replySchema, 10_240) : await readJsonBody(request, inquirySchema, 10_240)
      const rate = await enforceRateLimit(client, request, {
        bucket: admin ? "support-reply" : "support-submit", limit: admin ? 20 : 5, windowSeconds: admin ? 60 : 300,
      }, user.id)
      if (rate.unavailable) return json({ error: "잠시 후 다시 시도해주세요." }, 503)
      if (!rate.allowed) return json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, 429)
      // The reply RPC rechecks the administrator's current database role under a row lock.
      if ("reply" in body) ({ data, error } = await client.rpc("reply_support_inquiry", {
        p_admin_id: user.id, p_inquiry_id: body.inquiryId, p_reply: body.reply,
      }))
      else ({ data, error } = await client.rpc("submit_support_inquiry", {
        p_user_id: user.id, p_request_key: body.requestKey, p_content: body.content,
      }))
    }
    if (error || !data) return json({ error: write ? "처리 결과를 확인하지 못했습니다. 잠시 후 다시 시도하거나 문의 내역을 확인해주세요." : "문의 내역을 불러오지 못했습니다." }, 503)
    if (!data.success) {
      const [status, message] = failures[data.code || ""] || [400, "문의 요청을 처리하지 못했습니다."]
      return json({ error: message, code: data.code }, status)
    }
    return json(data)
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status)
    return json({ error: "문의 요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요." }, 503)
  }
}
