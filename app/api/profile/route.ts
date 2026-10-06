import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/server/supabase-admin"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { readJsonBody, RequestBodyError } from "@/lib/security/request"
import { profileInputSchema } from "@/lib/profile"

export const dynamic = "force-dynamic"
export const revalidate = 0

const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

export async function PATCH(request: NextRequest) {
  try {
    const authClient = await createAuthServerClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ code: "AUTH_REQUIRED", error: "로그인이 필요합니다." }, { status: 401, headers })
    }

    const body = await readJsonBody(request, profileInputSchema)
    const supabase = createServerClient()

    const rate = await enforceRateLimit(supabase, request, {
      bucket: "profile-update",
      limit: 10,
      windowSeconds: 300,
    }, user.id)
    if (rate.unavailable) return NextResponse.json({ error: "Rate limiting is unavailable." }, { status: 503, headers })
    if (!rate.allowed) return NextResponse.json({ error: "Too many profile update attempts." }, { status: 429, headers })

    const { data, error } = await supabase.rpc("save_profile_and_sync_bookings", {
      p_user_id: user.id,
      p_username: body.username,
      p_display_name: body.displayName,
      p_student_id: body.studentId,
      p_contact_number: body.contactNumber,
    })

    if (error) {
      console.error("Update profile RPC failed", { code: error.code })
      return NextResponse.json({ error: "Profile update is unavailable." }, { status: 503, headers })
    }

    const result = data as { success: boolean; linked_count?: number; error?: string; code?: string }
    if (!result.success) {
      const status = ["USERNAME_TAKEN", "IDENTITY_TAKEN", "IDENTITY_LOCKED"].includes(result.code ?? "") ? 409 : 400
      return NextResponse.json({ error: result.error, code: result.code }, { status, headers })
    }

    return NextResponse.json({ success: true, linkedCount: result.linked_count ?? 0 }, { headers })
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status, headers })
    console.error("Profile update failed")
    return NextResponse.json({ error: "Profile update failed." }, { status: 500, headers })
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405, headers })
}
