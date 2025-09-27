import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

// 뮤지컬 ID를 테이블명으로 변환
function getTableName(musicalId: string): string {
  const tableMap: Record<string, string> = {
    "dead-poets-society": "dead_poets_society_bookings",
    rent: "rent_bookings",
    "your-lie-in-april": "your_lie_in_april_bookings",
  }
  return tableMap[musicalId] || "dead_poets_society_bookings"
}

export async function POST(request: Request, { params }: { params: { musicalId: string } }) {
  try {
    const musicalId = params.musicalId
    const tableName = getTableName(musicalId)
    const supabase = createServerClient()

    const body = await request.json()
    const { name, studentId, seatGrade, selectedSeats, specialRequest } = body

    // 입력 검증
    if (!name || !studentId || !seatGrade || !selectedSeats || selectedSeats.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "필수 정보가 누락되었습니다.",
        },
        { status: 400 },
      )
    }

    // 먼저 테이블 존재 여부 확인
    const { data: tableCheck, error: tableError } = await supabase
      .from(tableName)
      .select("count", { count: "exact", head: true })

    if (tableError) {
      console.error("테이블 확인 오류:", tableError)

      if (tableError.code === "42P01" || tableError.message.includes("does not exist")) {
        return NextResponse.json(
          {
            success: false,
            error: `${musicalId} 데이터베이스 테이블이 생성되지 않았습니다. SQL 스크립트를 실행해주세요.`,
            needsSetup: true,
          },
          { status: 500 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: "데이터베이스 연결 오류가 발생했습니다.",
        },
        { status: 500 },
      )
    }

    // 좌석 중복 확인
    const { data: existingBookings, error: checkError } = await supabase
      .from(tableName)
      .select("selected_seats")
      .eq("status", "confirmed")

    if (checkError) {
      console.error("좌석 중복 확인 오류:", checkError)
      return NextResponse.json(
        {
          success: false,
          error: "좌석 확인 중 오류가 발생했습니다.",
        },
        { status: 500 },
      )
    }

    // 이미 예매된 좌석 찾기
    const bookedSeats = new Set<string>()
    existingBookings?.forEach((booking) => {
      booking.selected_seats?.forEach((seat: string) => bookedSeats.add(seat))
    })

    const conflictSeats = selectedSeats.filter((seat: string) => bookedSeats.has(seat))

    if (conflictSeats.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "선택한 좌석 중 이미 예매된 좌석이 있습니다.",
          conflictSeats,
        },
        { status: 409 },
      )
    }

    // 예매 정보 저장
    const { data, error } = await supabase
      .from(tableName)
      .insert([
        {
          name,
          student_id: studentId,
          seat_grade: seatGrade,
          selected_seats: selectedSeats,
          special_request: specialRequest || null,
          status: "confirmed",
        },
      ])
      .select()

    if (error) {
      console.error("예매 저장 오류:", error)
      return NextResponse.json(
        {
          success: false,
          error: "예매 정보 저장 중 오류가 발생했습니다.",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "뮤지컬 관람 신청이 완료되었습니다.",
      bookingId: data[0]?.id,
      bookingDate: data[0]?.booking_date,
    })
  } catch (error) {
    console.error("예매 처리 중 예외 발생:", error)
    return NextResponse.json(
      {
        success: false,
        error: "서버 오류가 발생했습니다.",
      },
      { status: 500 },
    )
  }
}
