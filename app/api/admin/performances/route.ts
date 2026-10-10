import { NextResponse, type NextRequest } from "next/server"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
import { createServerClient } from "@/lib/server/supabase-admin"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { getLiveMusicals, invalidatePerformanceSettings } from "@/lib/server/performances"
import { performanceSaveSchema } from "@/lib/performance-settings"
import { readJsonBody, RequestBodyError } from "@/lib/security/request"

export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "private, no-store" }
async function authorize() {
  const client = await createAuthServerClient()
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return { denied: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401, headers }) }
  const { data, error: roleError } = await client.rpc("is_current_user_admin")
  if (roleError) return { denied: NextResponse.json({ error: "권한 확인이 지연되고 있어요." }, { status: 503, headers }) }
  if (!data) return { denied: NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403, headers }) }
  return { client, user }
}
export async function GET() {
  try {
    const auth = await authorize()
    if (auth.denied) return auth.denied
    const { data: periods, error } = await auth.client!.from("arte_musical_application_period").select("musical_name, start_time, end_time")
    if (error) throw error
    return NextResponse.json({ performances: await getLiveMusicals(true), periods }, { headers })
  } catch { return NextResponse.json({ error: "공연 정보를 불러오지 못했어요." }, { status: 503, headers }) }
}
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authorize()
    if (auth.denied) return auth.denied
    const rate = await enforceRateLimit(createServerClient(), request, { bucket: "admin-performance-save", limit: 20, windowSeconds: 60 }, auth.user!.id)
    if (rate.unavailable) return NextResponse.json({ error: "잠시 후 다시 시도해주세요." }, { status: 503, headers })
    if (!rate.allowed) return NextResponse.json({ error: "요청이 너무 많아요." }, { status: 429, headers })
    const body = await readJsonBody(request, performanceSaveSchema, 65536)
    const { error } = await auth.client!.rpc("save_admin_performance", { p_musical_id: body.musicalId, p_details: body.details, p_start: body.startTime, p_end: body.endTime })
    if (error) throw error
    invalidatePerformanceSettings()
    return NextResponse.json({ success: true }, { headers })
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: "입력한 공연 정보와 예매 기간을 확인해주세요." }, { status: error.status, headers })
    return NextResponse.json({ error: "저장하지 못했어요. 입력 내용은 유지됩니다." }, { status: 503, headers })
  }
}
