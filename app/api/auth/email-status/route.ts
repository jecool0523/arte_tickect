import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/server/supabase-admin"
import { createAuthServerClient } from "@/lib/server/supabase-auth"

export const dynamic = "force-dynamic"
export const revalidate = 0

const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

export async function GET(request: NextRequest) {
  try {
    const authClient = await createAuthServerClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ code: "AUTH_REQUIRED", error: "로그인이 필요합니다." }, { status: 401, headers })
    }

    const supabase = createServerClient()
    const { data, error } = await supabase.rpc("get_user_email_status", {
      p_user_id: user.id,
    })

    if (error) {
      console.error("Get email status RPC failed", { code: error.code })
      return NextResponse.json({ error: "Email status unavailable." }, { status: 503, headers })
    }

    return NextResponse.json(data, { headers })
  } catch {
    return NextResponse.json({ error: "Email status check failed." }, { status: 500, headers })
  }
}