import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import {
  EMPTY_SEAT_STATISTICS,
  buildUnavailableSeats,
  createEmptyUnavailableSeats,
  getBookingTableName,
  summarizeBookings,
} from "@/lib/musical-config"

export const dynamic = "force-dynamic"
export const revalidate = 0

const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

export async function GET(_request: Request, { params }: { params: { musicalId: string } }) {
  const musicalId = params.musicalId
  const tableName = getBookingTableName(musicalId)
  const defaultUnavailableSeats = createEmptyUnavailableSeats()

  try {
    const supabase = createServerClient()

    const { error: tableError } = await supabase.from(tableName).select("id").limit(1)

    if (tableError) {
      const needsSetup = tableError.code === "42P01" || tableError.message.includes("does not exist")

      return NextResponse.json(
        {
          success: true,
          unavailableSeats: defaultUnavailableSeats,
          statistics: EMPTY_SEAT_STATISTICS,
          message: needsSetup
            ? `${musicalId} booking table is not ready. Run the Supabase setup SQL first.`
            : "Could not load seat status. All seats are shown as selectable.",
          needsSetup,
        },
        { headers },
      )
    }

    const { data: bookings, error } = await supabase
      .from(tableName)
      .select("selected_seats, seat_grade")
      .eq("status", "confirmed")
      .order("booking_date", { ascending: false })

    if (error) {
      return NextResponse.json(
        {
          success: true,
          unavailableSeats: defaultUnavailableSeats,
          statistics: EMPTY_SEAT_STATISTICS,
          message: "Could not load reserved seats. All seats are shown as selectable.",
        },
        { headers },
      )
    }

    const { data: stats } = await supabase
      .from(tableName)
      .select("id, selected_seats, student_id")
      .eq("status", "confirmed")

    const unavailableSeats = buildUnavailableSeats(bookings)
    const statistics = summarizeBookings(stats)

    return NextResponse.json(
      {
        success: true,
        unavailableSeats,
        statistics,
        message: bookings?.length
          ? `${bookings.length} bookings loaded.`
          : "No bookings yet. All seats are selectable.",
        timestamp: new Date().toISOString(),
      },
      { headers },
    )
  } catch (error) {
    console.error("Seat status load failed:", error)

    return NextResponse.json(
      {
        success: true,
        unavailableSeats: defaultUnavailableSeats,
        statistics: EMPTY_SEAT_STATISTICS,
        message: "Server error while loading seat status. All seats are shown as selectable.",
      },
      { headers },
    )
  }
}
