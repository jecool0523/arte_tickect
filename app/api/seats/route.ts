import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/server/supabase-admin"
import {
  EMPTY_SEAT_STATISTICS,
  buildUnavailableSeats,
  createEmptyUnavailableSeats,
  summarizeBookings,
} from "@/lib/musical-config"

export const dynamic = "force-dynamic"
export const revalidate = 0

const LEGACY_BOOKING_TABLE = "arte_musical_tickets"

export async function GET() {
  const defaultUnavailableSeats = createEmptyUnavailableSeats()

  try {
    const supabase = createServerClient()

    const { error: tableError } = await supabase
      .from(LEGACY_BOOKING_TABLE)
      .select("count", { count: "exact", head: true })

    if (tableError) {
      return NextResponse.json({
        success: true,
        unavailableSeats: defaultUnavailableSeats,
        statistics: EMPTY_SEAT_STATISTICS,
        message: "Legacy booking table is not available. All seats are shown as selectable.",
        needsSetup: tableError.code === "42P01" || tableError.message.includes("does not exist"),
      })
    }

    const { data: bookings, error } = await supabase
      .from(LEGACY_BOOKING_TABLE)
      .select("selected_seats, seat_grade")
      .eq("status", "confirmed")

    if (error) {
      return NextResponse.json({
        success: true,
        unavailableSeats: defaultUnavailableSeats,
        statistics: EMPTY_SEAT_STATISTICS,
        message: "Could not load legacy seat status. All seats are shown as selectable.",
      })
    }

    const { data: stats } = await supabase
      .from(LEGACY_BOOKING_TABLE)
      .select("id, selected_seats, student_id")
      .eq("status", "confirmed")

    return NextResponse.json({
      success: true,
      unavailableSeats: buildUnavailableSeats(bookings),
      statistics: summarizeBookings(stats),
      message: bookings?.length ? `${bookings.length} bookings loaded.` : "No bookings yet.",
    })
  } catch (error) {
    console.error("Legacy seat status load failed:", error)

    return NextResponse.json({
      success: true,
      unavailableSeats: defaultUnavailableSeats,
      statistics: EMPTY_SEAT_STATISTICS,
      message: "Server error while loading legacy seat status. All seats are shown as selectable.",
    })
  }
}
