import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

// 캐싱 비활성화
export const dynamic = "force-dynamic"
export const revalidate = 0

// 뮤지컬 ID를 테이블명으로 변환
function getTableName(musicalId: string): string {
  const tableMap: Record<string, string> = {
    "dead-poets-society": "dead_poets_society_bookings",
    rent: "rent_bookings",
    "your-lie-in-april": "your_lie_in_april_bookings",
  }
  return tableMap[musicalId] || "dead_poets_society_bookings"
}

export async function POST(request: NextRequest, { params }: { params: { musicalId: string } }) {
  const headers = {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  }

  try {
    const musicalId = params.musicalId
    const tableName = getTableName(musicalId)
    const body = await request.json()
    const { name, studentId, seatGrade, selectedSeats, specialRequest } = body

    // 입력 데이터 검증
    if (!name || !studentId || !seatGrade || !selectedSeats || selectedSeats.length === 0) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400, headers })
    }

    const supabase = createServerClient()

    // 먼저 테이블 존재 여부 확인
    const { error: tableCheckError } = await supabase.from(tableName).select("count", { count: "exact", head: true })

    if (tableCheckError) {
      console.error("테이블 확인 오류:", tableCheckError)

      if (tableCheckError.code === "42P01" || tableCheckError.message.includes("does not exist")) {
        return NextResponse.json(
          {
            error: `${musicalId} 데이터베이스 테이블이 생성되지 않았습니다. 관리자에게 문의하세요.`,
            needsSetup: true,
          },
          { status: 500, headers },
        )
      }
    }

    // ⚠️ 중요: 최신 예매 상태를 다시 확인 (이중 예약 방지)
    const { data: existingBookings, error: checkError } = await supabase
      .from(tableName)
      .select("selected_seats")
      .eq("status", "confirmed")

    if (checkError) {
      console.error("좌석 확인 오류:", checkError)
      return NextResponse.json({ error: "좌석 확인 중 오류가 발생했습니다." }, { status: 500, headers })
    }

    // 이미 예매된 좌석들을 추출
    const bookedSeats = new Set<string>()
    existingBookings?.forEach((booking) => {
      booking.selected_seats?.forEach((seat: string) => bookedSeats.add(seat))
    })

    // 선택한 좌석 중 이미 예매된 좌석이 있는지 확인
    const conflictSeats = selectedSeats.filter((seat: string) => bookedSeats.has(seat))
    if (conflictSeats.length > 0) {
      console.warn(`[${new Date().toISOString()}] 좌석 충돌 발생:`, conflictSeats)
      return NextResponse.json(
        {
          error: "선택한 좌석 중 이미 예매된 좌석이 있습니다. 페이지를 새로고침 후 다시 시도해주세요.",
          conflictSeats: conflictSeats,
        },
        { status: 409, headers },
      )
    }

    // 예매 정보 저장
    const { data: bookingData, error: insertError } = await supabase
      .from(tableName)
      .insert({
        name,
        student_id: studentId,
        seat_grade: seatGrade,
        selected_seats: selectedSeats,
        special_request: specialRequest || null,
        status: "confirmed",
      })
      .select()
      .single()

    if (insertError) {
      console.error("예매 저장 오류:", insertError)
      return NextResponse.json({ error: "예매 저장 중 오류가 발생했습니다." }, { status: 500, headers })
    }

    console.log(`[${new Date().toISOString()}] 예매 완료:`, {
      bookingId: bookingData.id,
      musicalId,
      studentId,
      seatCount: selectedSeats.length,
    })

    return NextResponse.json(
      {
        success: true,
        bookingId: bookingData.id,
        bookingDate: bookingData.booking_date,
        message: "뮤지컬 관람 신청이 완료되었습니다.",
      },
      { headers },
    )
  } catch (error) {
    console.error("예매 처리 중 오류:", error)
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: { musicalId: string } }) {
  const headers = {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  }

  try {
    const musicalId = params.musicalId
    const tableName = getTableName(musicalId)
    const supabase = createServerClient()

    // 테이블 존재 여부 확인
    const { error: tableCheckError } = await supabase.from(tableName).select("count", { count: "exact", head: true })

    if (tableCheckError) {
      console.error("테이블 확인 오류:", tableCheckError)

      if (tableCheckError.code === "42P01" || tableCheckError.message.includes("does not exist")) {
        return NextResponse.json(
          {
            success: false,
            error: `${musicalId} 데이터베이스 테이블이 생성되지 않았습니다.`,
            bookings: [],
            needsSetup: true,
          },
          { headers },
        )
      }
    }

    // 모든 예매 정보 조회 - 최신순
    const { data: bookings, error } = await supabase
      .from(tableName)
      .select("*")
      .order("booking_date", { ascending: false })

    if (error) {
      console.error("예매 조회 오류:", error)
      return NextResponse.json({ error: "예매 정보 조회 중 오류가 발생했습니다." }, { status: 500, headers })
    }

    // 좌석 수 계산
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
    console.error("예매 조회 중 오류:", error)
    return NextResponse.json({ error: "데이터 조회 중 오류가 발생했습니다." }, { status: 500, headers })
  }
}
