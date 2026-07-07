import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { getBookingTableName } from "@/lib/musical-config"

export const dynamic = "force-dynamic"
export const revalidate = 0

const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

type BookingRequestBody = {
  name?: string
  studentId?: string
  seatGrade?: string
  selectedSeats?: string[]
  specialRequest?: string
}

export async function POST(request: NextRequest, { params }: { params: { musicalId: string } }) {
  try {
    const musicalId = params.musicalId
    const body = (await request.json()) as BookingRequestBody
    const { name, studentId, seatGrade, selectedSeats, specialRequest } = body

    if (!name || !studentId || !seatGrade || !selectedSeats?.length) {
      return NextResponse.json({ error: "필수 예약 정보가 누락되었습니다." }, { status: 400, headers })
    }

    const supabase = createServerClient()
    const currentDate = new Date()

    const { data: periodData, error: periodDataError } = await supabase
      .from("arte_musical_application_period")
      .select("start_time, end_time")
      .eq("musical_name", musicalId)
      .single()

    if (periodDataError) {
      console.error("Application period load failed:", periodDataError)
      return NextResponse.json({ error: "예매 기간 정보를 불러올 수 없습니다." }, { status: 500, headers })
    }

    const startDate = new Date(periodData.start_time)
    const endDate = new Date(periodData.end_time)

    if (currentDate < startDate || currentDate > endDate) {
      return NextResponse.json(
        {
          error: `현재는 예매 기간이 아닙니다. (${startDate.toLocaleString()} ~ ${endDate.toLocaleString()})`,
        },
        { status: 403, headers },
      )
    }

    const { data: result, error: rpcError } = await supabase.rpc("book_musical_seats", {
      p_musical_id: musicalId,
      p_name: name,
      p_student_id: studentId,
      p_seat_grade: seatGrade,
      p_selected_seats: selectedSeats,
      p_special_request: specialRequest || null,
    })

    if (rpcError) {
      console.error("Booking RPC failed:", rpcError)
      return NextResponse.json({ error: "예매 처리 중 오류가 발생했습니다." }, { status: 500, headers })
    }

    if (!result.success) {
      if (result.conflictSeats) {
        return NextResponse.json(
          {
            error: "선택한 좌석 중 이미 예매된 좌석이 있습니다.",
            conflictSeats: result.conflictSeats,
          },
          { status: 409, headers },
        )
      }

      return NextResponse.json({ error: result.error || "예매에 실패했습니다." }, { status: 500, headers })
    }

    return NextResponse.json(
      {
        success: true,
        bookingId: result.bookingId,
        bookingDate: result.bookingDate,
        message: "뮤지컬 관람 신청이 완료되었습니다.",
      },
      { headers },
    )
  } catch (error) {
    console.error("Booking request failed:", error)
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500, headers },
    )
  }
}

export async function GET(_request: NextRequest, { params }: { params: { musicalId: string } }) {
  try {
    const tableName = getBookingTableName(params.musicalId)
    const supabase = createServerClient()

    const { error: tableCheckError } = await supabase.from(tableName).select("count", { count: "exact", head: true })

    if (tableCheckError) {
      return NextResponse.json(
        {
          success: false,
          error: `${params.musicalId} booking table is not ready.`,
          bookings: [],
          needsSetup: true,
        },
        { headers },
      )
    }

    const { data: bookings, error } = await supabase
      .from(tableName)
      .select("*")
      .order("booking_date", { ascending: false })

    if (error) throw error

    const bookingsWithSeatCount =
      bookings?.map((booking) => ({
        ...booking,
        seat_count: booking.selected_seats?.length || 0,
      })) || []

    return NextResponse.json(
      {
        success: true,
        bookings: bookingsWithSeatCount,
        timestamp: new Date().toISOString(),
      },
      { headers },
    )
  } catch (error) {
    console.error("Booking list load failed:", error)
    return NextResponse.json({ error: "예약 정보 조회 중 오류가 발생했습니다." }, { status: 500, headers })
  }
}
