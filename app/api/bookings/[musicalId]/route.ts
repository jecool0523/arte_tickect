import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/server/supabase-admin"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { readJsonBody, RequestBodyError } from "@/lib/security/request"
import { bookingRequestSchema } from "@/lib/security/validation"
import { createTicketShareToken } from "@/lib/ticket-share-token"
import { isKnownMusicalId } from "@/lib/musical-config"

export const dynamic = "force-dynamic"
export const revalidate = 0

const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

export async function POST(request: NextRequest, { params }: { params: { musicalId: string } }) {
  try {
    const musicalId = params.musicalId
    if (!isKnownMusicalId(musicalId)) {
      return NextResponse.json({ error: "Unknown musical." }, { status: 404, headers })
    }

    const body = await readJsonBody(request, bookingRequestSchema)
    const supabase = createServerClient()
    const rate = await enforceRateLimit(supabase, request, {
      bucket: "booking-create",
      limit: 5,
      windowSeconds: 300,
    }, musicalId)
    if (rate.unavailable) return NextResponse.json({ error: "Rate limiting is unavailable." }, { status: 503, headers })
    if (!rate.allowed) return NextResponse.json({ error: "Too many booking attempts." }, { status: 429, headers })

    const { data: period, error: periodError } = await supabase
      .from("arte_musical_application_period")
      .select("start_time, end_time")
      .eq("musical_name", musicalId)
      .single()
    if (periodError) {
      console.error("Booking period load failed", { code: periodError.code })
      return NextResponse.json({ error: "Booking period is unavailable." }, { status: 503, headers })
    }

    const now = new Date()
    const start = new Date(period.start_time)
    const end = new Date(period.end_time)
    const inPublicPeriod = now >= start && now <= end
    let consumedPresale = false

    if (now > end) {
      return NextResponse.json({ code: "BOOKING_CLOSED", error: "Booking is closed." }, { status: 403, headers })
    }

    if (!inPublicPeriod) {
      if (!body.presaleKey) return NextResponse.json({ code: "PRESALE_KEY_REQUIRED", error: "A valid presale key is required." }, { status: 403, headers })

      const presaleKey = body.presaleKey
      const { data: maxSeats, error: limitError } = await supabase.rpc("get_presale_access_key_seat_limit", {
        p_musical_id: musicalId,
        p_key: presaleKey,
      })
      if (limitError || (typeof maxSeats === "number" && body.selectedSeats.length > maxSeats)) {
        return NextResponse.json({ code: "INVALID_PRESALE_KEY", error: "Invalid presale key or seat limit exceeded." }, { status: 403, headers })
      }

      const { data: consumed, error: consumeError } = await supabase.rpc("consume_presale_access_key", {
        p_musical_id: musicalId,
        p_key: presaleKey,
      })
      if (consumeError || consumed !== true) {
        return NextResponse.json({ code: "INVALID_PRESALE_KEY", error: "Invalid or expired presale key." }, { status: 403, headers })
      }
      consumedPresale = true
    }

    const { data: result, error } = await supabase.rpc("book_musical_seats", {
      p_musical_id: musicalId,
      p_name: body.name,
      p_student_id: body.studentId,
      p_seat_grade: body.seatGrade,
      p_selected_seats: body.selectedSeats,
      p_special_request: body.specialRequest || null,
    })
    if (error || !result?.success) {
      if (consumedPresale) {
        await supabase.rpc("release_presale_access_key", { p_musical_id: musicalId, p_key: body.presaleKey || "" })
      }
      if (result?.conflictSeats) return NextResponse.json({ error: "One or more seats are already booked.", conflictSeats: result.conflictSeats }, { status: 409, headers })
      return NextResponse.json({ error: "Booking could not be completed." }, { status: 409, headers })
    }

    return NextResponse.json({
      success: true,
      bookingId: result.bookingId,
      bookingDate: result.bookingDate,
      shareToken: typeof result.bookingId === "number" ? createTicketShareToken(musicalId, result.bookingId) : null,
      presale: consumedPresale,
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
