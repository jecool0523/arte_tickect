import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
import { createServerClient } from "@/lib/server/supabase-admin"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { calculateFanExperience, type FanActivity } from "@/lib/fan-experience"
import { readJsonBody, RequestBodyError } from "@/lib/security/request"

export const dynamic = "force-dynamic"
export const revalidate = 0
const headers = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Vary: "Cookie" }

async function activity(request: NextRequest, recordVisit: boolean) {
  try {
    const auth = await createAuthServerClient()
    const { data: { user }, error: authError } = await auth.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401, headers })
    if (recordVisit) {
      const origin = request.headers.get("origin")
      if ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site") {
        return NextResponse.json({ error: "Invalid origin." }, { status: 403, headers })
      }
    }
    // No user ID, points or date are accepted from the request.
    if (request.nextUrl.search) {
      return NextResponse.json({ error: "This endpoint does not accept activity fields." }, { status: 400, headers })
    }
    if (recordVisit) await readJsonBody(request, z.object({}).strict(), 1024)
    const supabase = createServerClient()
    if (recordVisit) {
      const rate = await enforceRateLimit(supabase, request, { bucket: "fan-visit", limit: 60, windowSeconds: 300 }, user.id)
      if (rate.unavailable) return NextResponse.json({ error: "방문 적립이 잠시 지연되고 있어요." }, { status: 503, headers })
      if (!rate.allowed) return NextResponse.json({ error: "잠시 후 다시 시도해주세요." }, { status: 429, headers })
    }
    const { data, error } = await supabase.rpc(recordVisit ? "record_account_fan_visit" : "get_account_fan_activity", { p_user_id: user.id })
    if (error || !data) return NextResponse.json({ error: "팬 경험치를 불러오지 못했어요." }, { status: 503, headers })
    return NextResponse.json({ experience: calculateFanExperience(data as unknown as FanActivity) }, { headers })
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status, headers })
    return NextResponse.json({ error: "팬 경험치를 불러오지 못했어요." }, { status: 503, headers })
  }
}
export function GET(request: NextRequest) { return activity(request, false) }
export function POST(request: NextRequest) { return activity(request, true) }
