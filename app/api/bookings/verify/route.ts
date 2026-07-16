import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/server/supabase-admin"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { readJsonBody, RequestBodyError } from "@/lib/security/request"
import { bookingVerificationSchema } from "@/lib/security/validation"
import { createTicketShareToken } from "@/lib/ticket-share-token"
import { getBookingTableName, isKnownMusicalId } from "@/lib/musical-config"

const headers = { "Cache-Control": "no-store, no-cache, must-revalidate" }

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody(request, bookingVerificationSchema)
    const musicalId = body.musicalId
    if (!isKnownMusicalId(musicalId)) return NextResponse.json({ error: "Unknown musical." }, { status: 404, headers })
    const tableName = getBookingTableName(musicalId)
    if (!tableName) return NextResponse.json({ error: "Unknown musical." }, { status: 404, headers })

    const supabase = createServerClient()
    const rate = await enforceRateLimit(supabase, request, {
      bucket: "booking-verify",
      limit: 10,
      windowSeconds: 600,
    }, musicalId)
    if (rate.unavailable) return NextResponse.json({ error: "Booking lookup is unavailable." }, { status: 503, headers })
    if (!rate.allowed) return NextResponse.json({ error: "Too many lookup attempts." }, { status: 429, headers })

    const { data, error } = await supabase
      .from(tableName)
      .select("id, name, student_id, seat_grade, selected_seats, booking_date, special_request")
      .eq("name", body.name)
      .eq("student_id", body.studentId)
      .eq("status", "confirmed")
      .order("booking_date", { ascending: false })

    if (error) {
      console.error("Booking verification query failed", { code: error.code })
      return NextResponse.json({ error: "Booking lookup is unavailable." }, { status: 503, headers })
    }

    const bookings = (data || []).map((booking) => ({
      ...booking,
      shareToken: createTicketShareToken(musicalId, booking.id),
    }))

    return NextResponse.json({ success: true, bookings }, { headers })
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers })
    }
    console.error("Booking verification failed")
    return NextResponse.json({ error: "Booking lookup failed." }, { status: 500, headers })
  }
}
