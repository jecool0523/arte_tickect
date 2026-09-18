import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/server/supabase-admin"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { readJsonBody, RequestBodyError } from "@/lib/security/request"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const revalidate = 0

const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE_MY_ACCOUNT"),
})

export async function DELETE(request: NextRequest) {
  try {
    const authClient = await createAuthServerClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ code: "AUTH_REQUIRED", error: "로그인이 필요합니다." }, { status: 401, headers })
    }

    const body = await readJsonBody(request, deleteAccountSchema)
    if (body.confirmation !== "DELETE_MY_ACCOUNT") {
      return NextResponse.json({ error: "Invalid confirmation." }, { status: 400, headers })
    }

    const supabase = createServerClient()

    const rate = await enforceRateLimit(supabase, request, {
      bucket: "account-delete",
      limit: 3,
      windowSeconds: 3600,
    }, user.id)
    if (rate.unavailable) return NextResponse.json({ error: "Rate limiting is unavailable." }, { status: 503, headers })
    if (!rate.allowed) return NextResponse.json({ error: "Too many delete attempts. Try again later." }, { status: 429, headers })

    // 1) 프로필/연관 데이터 정리 RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc("delete_account", {
      p_user_id: user.id,
    })
    if (rpcError) {
      console.error("Delete account RPC failed", { code: rpcError.code })
      return NextResponse.json({ error: "Account deletion is unavailable." }, { status: 503, headers })
    }

    // 2) Supabase Admin API로 auth.users 삭제 (service_role로 서버에서만 가능)
    const adminClient = createServerClient()
    const { error: adminError } = await adminClient.auth.admin.deleteUser(user.id)
    if (adminError) {
      console.error("Admin delete user failed", { code: adminError.code, message: adminError.message })
      // RPC는 성공했지만 auth 삭제 실패 → 사용자에게 알림
      return NextResponse.json(
        { error: "계정 데이터는 정리되었으나 인증 계정 삭제에 실패했습니다. 관리자에게 문의하세요.", code: "AUTH_DELETE_FAILED" },
        { status: 500, headers }
      )
    }

    // 3) 세션 쿠키 삭제 (로그아웃)
    const response = NextResponse.json({ success: true, message: "계정이 완전히 삭제되었습니다." }, { headers })
    response.cookies.delete("sb-access-token")
    response.cookies.delete("sb-refresh-token")
    return response
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status, headers })
    console.error("Account deletion failed")
    return NextResponse.json({ error: "Account deletion failed." }, { status: 500, headers })
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405, headers })
}