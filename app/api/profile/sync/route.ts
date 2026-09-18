import { type NextRequest, NextResponse } from "next/server"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
import { syncProfileFromAuth } from "@/lib/server/sync-profile"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { createServerClient } from "@/lib/server/supabase-admin"

export const dynamic = "force-dynamic"
export const revalidate = 0

const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createAuthServerClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ code: "AUTH_REQUIRED", error: "로그인이 필요합니다." }, { status: 401, headers })
    }

    const supabase = createServerClient()
    const rate = await enforceRateLimit(supabase, request, {
      bucket: "profile-sync",
      limit: 5,
      windowSeconds: 300,
    }, user.id)
    if (rate.unavailable) return NextResponse.json({ error: "Rate limiting is unavailable." }, { status: 503, headers })
    if (!rate.allowed) return NextResponse.json({ error: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요." }, { status: 429, headers })

    const result = await syncProfileFromAuth(user.id)
    return NextResponse.json(result, { headers })
  } catch {
    return NextResponse.json({ error: "프로필 동기화 중 오류가 발생했습니다." }, { status: 500, headers })
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405, headers })
}