import { type NextRequest, NextResponse } from "next/server"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
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
      bucket: "resend-confirmation",
      limit: 3,
      windowSeconds: 3600,
    }, user.id)
    if (rate.unavailable) return NextResponse.json({ error: "Rate limiting is unavailable." }, { status: 503, headers })
    if (!rate.allowed) return NextResponse.json({ error: "너무 많은 요청입니다. 1시간 후 다시 시도해주세요." }, { status: 429, headers })

    const callbackUrl = new URL("/auth/callback", request.nextUrl.origin)
    callbackUrl.searchParams.set("next", "/profile")

    const { error } = await authClient.auth.resend({
      type: "signup",
      email: user.email!,
      options: { emailRedirectTo: callbackUrl.toString() },
    })

    if (error) {
      console.error("Resend confirmation failed", { code: error.code, message: error.message })
      return NextResponse.json({ error: "인증 메일 발송에 실패했습니다.", code: error.code }, { status: 500, headers })
    }

    return NextResponse.json({ success: true, message: "인증 메일을 다시 보냈습니다. 메일함을 확인해주세요." }, { headers })
  } catch {
    return NextResponse.json({ error: "인증 메일 발송 중 오류가 발생했습니다." }, { status: 500, headers })
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405, headers })
}