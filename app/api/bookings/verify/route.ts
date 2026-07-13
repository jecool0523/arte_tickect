import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { getBookingTableName } from "@/lib/musical-config"

type VerifyRequestBody = {
  name?: string
  studentId?: string
  musicalId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VerifyRequestBody
    const { name, studentId, musicalId } = body

    if (!name || !studentId || !musicalId) {
      return NextResponse.json({ error: "공연, 이름, 학번을 모두 입력해주세요." }, { status: 400 })
    }

    const supabase = createServerClient()
    const tableName = getBookingTableName(musicalId)

    if (!tableName) {
      return NextResponse.json({ error: "존재하지 않는 공연 ID입니다." }, { status: 404 })
    }

    const { data: bookings, error } = await supabase
      .from(tableName)
      .select("id, seat_grade, selected_seats, booking_date, special_request, name, student_id")
      .eq("student_id", studentId)
      .eq("name", name)
      .eq("status", "confirmed")
      .order("booking_date", { ascending: false })

    if (error) {
      console.error("Booking verification failed:", error)
      return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 })
    }

    if (!bookings?.length) {
      return NextResponse.json(
        {
          success: false,
          message: "일치하는 예약 정보를 찾을 수 없습니다.",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      bookings,
    })
  } catch (error) {
    console.error("Booking verification request failed:", error)
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
  }
}
