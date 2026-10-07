import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/server/supabase-admin"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { readJsonBody, RequestBodyError } from "@/lib/security/request"
import { bookingRequestSchema } from "@/lib/security/validation"
import { createTicketShareToken } from "@/lib/ticket-share-token"
import { isKnownMusicalId } from "@/lib/musical-config"
import { isProfileComplete } from "@/lib/profile"
import { getBookingAccess } from "@/lib/server/booking-access"

export const dynamic = "force-dynamic"
export const revalidate = 0

const headers = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ musicalId: string }> }) {
  try {
    const { musicalId } = await params
    if (!isKnownMusicalId(musicalId)) {
      return NextResponse.json({ error: "Unknown musical." }, { status: 404, headers })
    }

    const authClient = await createAuthServerClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ code: "AUTH_REQUIRED", error: "로그인이 필요합니다." }, { status: 401, headers })
    }

    const { data: profile, error: profileError } = await authClient.from("profiles")
      .select("username, display_name, student_id, contact_number, profile_completed_at").eq("id", user.id).maybeSingle()
    if (profileError) return NextResponse.json({ error: "프로필을 확인하지 못했습니다." }, { status: 503, headers })
    if (!isProfileComplete(profile)) return NextResponse.json({ code: "PROFILE_INCOMPLETE", error: "내 정보를 먼저 등록해주세요.", setupUrl: `/profile/setup?next=/performances/${musicalId}/booking` }, { status: 403, headers })

    const body = await readJsonBody(request, bookingRequestSchema)
    const supabase = createServerClient()
    const rate = await enforceRateLimit(supabase, request, {
      bucket: "booking-create",
      limit: 5,
      windowSeconds: 300,
    }, musicalId)
    if (rate.unavailable) return NextResponse.json({ error: "Rate limiting is unavailable." }, { status: 503, headers })
    if (!rate.allowed) return NextResponse.json({ error: "Too many booking attempts." }, { status: 429, headers })

    let access
    try { access = await getBookingAccess(musicalId, user.id) }
    catch { return NextResponse.json({ error: "예매 권한을 확인하지 못했습니다." }, { status: 503, headers }) }
    if (!access.isOpen) return NextResponse.json({ code: access.code, error: access.message }, { status: 403, headers })

    const { data: result, error } = await supabase.rpc("book_musical_seats", {
      p_musical_id: musicalId,
      p_name: body.name,
      p_student_id: body.studentId,
      p_seat_grade: body.seatGrade,
      p_selected_seats: body.selectedSeats,
      p_special_request: body.specialRequest || null,
      p_user_id: user.id,
    })
    if (error || !result?.success) {
      if (error) return NextResponse.json({ error: "예매를 완료하지 못했습니다. 잠시 후 다시 시도해주세요." }, { status: 503, headers })
      if (result?.code === "BOOKING_CLOSED" || result?.code === "PRESALE_PERMISSION_REQUIRED")
        return NextResponse.json({ code: result.code, error: result.error }, { status: 403, headers })
      if (result?.code === "BOOKING_PERIOD_UNAVAILABLE")
        return NextResponse.json({ code: result.code, error: "예매 기간을 확인하지 못했습니다." }, { status: 503, headers })
      if (result?.conflictSeats) return NextResponse.json({ error: "One or more seats are already booked.", conflictSeats: result.conflictSeats }, { status: 409, headers })
      return NextResponse.json({ error: "Booking could not be completed." }, { status: 409, headers })
    }

    return NextResponse.json({
      success: true,
      bookingId: result.bookingId,
      bookingDate: result.bookingDate,
      shareToken: typeof result.bookingId === "number" ? createTicketShareToken(musicalId, result.bookingId) : null,
      presale: result.presale === true,
    }, { headers })
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status, headers })
    console.error("Booking request failed")
    return NextResponse.json({ error: "Booking request failed." }, { status: 500, headers })
  }
}

export function GET() {
  return NextResponse.json({ error: "Booking list access is disabled." }, { status: 410, headers })
}
