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

const setPresaleSchema = z.object({
  targetUserId: z.string().uuid(),
  isPresaleUser: z.boolean(),
})

export async function PATCH(request: NextRequest) {
  try {
    const authClient = await createAuthServerClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ code: "AUTH_REQUIRED", error: "로그인이 필요합니다." }, { status: 401, headers })
    }

    const body = await readJsonBody(request, setPresaleSchema)
    const supabase = createServerClient()

    const rate = await enforceRateLimit(supabase, request, {
      bucket: "admin-user-presale-toggle",
      limit: 20,
      windowSeconds: 60,
    }, user.id)
    if (rate.unavailable) return NextResponse.json({ error: "Rate limiting is unavailable." }, { status: 503, headers })
    if (!rate.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers })

    const { data, error } = await supabase.rpc("set_user_presale_status", {
      p_target_user_id: body.targetUserId,
      p_is_presale: body.isPresaleUser,
      p_by_admin_id: user.id,
    })

    if (error) {
      console.error("Admin set user presale status RPC failed", { code: error.code })
      return NextResponse.json({ error: "Failed to update presale status." }, { status: 503, headers })
    }

    const result = data as { success: boolean; error?: string; code?: string; is_presale_user?: boolean }
    if (!result.success) {
      const status = result.code === "FORBIDDEN" ? 403 : result.code === "USER_NOT_FOUND" ? 404 : 400
      return NextResponse.json({ error: result.error, code: result.code }, { status, headers })
    }

    return NextResponse.json({ success: true, isPresaleUser: result.is_presale_user }, { headers })
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status, headers })
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid request body." }, { status: 400, headers })
    console.error("Admin toggle presale status failed")
    return NextResponse.json({ error: "Failed to update presale status." }, { status: 500, headers })
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405, headers })
}