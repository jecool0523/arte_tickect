import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

// 캐싱 비활성화
export const dynamic = "force-dynamic"
export const revalidate = 0

// 뮤지컬 ID를 테이블명으로 변환 (GET 요청용)
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
    const body = await request.json()
    const { name, studentId, seatGrade, selectedSeats, specialRequest } = body

    // 입력 데이터 검증
    if (!name || !studentId || !seatGrade || !selectedSeats || selectedSeats.length === 0) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400, headers })
    }

    const supabase = createServerClient()

    // 1. 기간 체크 (기존 로직 유지)
    const currentDate = new Date()
    const { data: periodData, error: periodDataError } = await supabase
      .from("arte_musical_application_period")
      .select("start_time, end_time")
      .eq("musical_name", musicalId)
      .single()

    if (periodDataError) {
      console.error("기간 데이터 조회 오류:", periodDataError)
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

    // 2. 안전한 예매 함수 호출 (RPC)
    // 기존의 '조회 후 삽입' 방식 대신, DB 함수가 원자적(Atomic)으로 처리합니다.
    const { data: result, error: rpcError } = await supabase.rpc("book_musical_seats", {
      p_musical_id: musicalId,
      p_name: name,
      p_student_id: studentId,
      p_seat_grade: seatGrade,
      p_selected_seats: selectedSeats,
      p_special_request: specialRequest || null,
    })

    if (rpcError) {
      console.error("RPC 실행 오류:", rpcError)
      // 테이블이 없는 경우 등에 대한 처리
      if (rpcError.message.includes("does not exist") || rpcError.code === "42P01") {
         return NextResponse.json({ error: "데이터베이스 테이블이 생성되지 않았습니다." }, { status: 500, headers })
      }
      return NextResponse.json({ error: "예매 처리 중 오류가 발생했습니다." }, { status: 500, headers })
    }

    // 함수 내부에서 로직 실패 (중복 좌석 등) 처리
    if (!result.success) {
      // 이미 예약된 좌석이 있는 경우
      if (result.conflictSeats) {
        return NextResponse.json(
          {
            error: "선택한 좌석 중 이미 예매된 좌석이 있습니다.",
            conflictSeats: result.conflictSeats,
          },
          { status: 409, headers },
        )
      }
      // 그 외 에러
      return NextResponse.json({ error: result.error || "예매 실패" }, { status: 500, headers })
    }

    // 성공
    console.log(`[${new Date().toISOString()}] 예매 완료:`, {
      bookingId: result.bookingId,
      musicalId,
      studentId,
      seatCount: selectedSeats.length,
    })

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
    console.error("예매 처리 중 서버 오류:", error)
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500, headers },
    )
  }
}

// GET 요청은 단순히 조회만 하므로 기존 코드를 유지해도 무방합니다.
// (다만 getTableName 함수가 필요하므로 위 코드에 포함시켜 두었습니다.)
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
        return NextResponse.json(
          {
            success: false,
            error: `${musicalId} 테이블이 없습니다.`,
            bookings: [],
            needsSetup: true,
          },
          { headers },
        )
    }

    // 조회
    const { data: bookings, error } = await supabase
      .from(tableName)
      .select("*")
      .order("booking_date", { ascending: false })

    if (error) {
      throw error
    }

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
