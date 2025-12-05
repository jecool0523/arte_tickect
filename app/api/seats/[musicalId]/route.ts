import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

// 캐싱 비활성화 - 항상 최신 데이터 제공
export const dynamic = "force-dynamic"
export const revalidate = 0

const defaultUnavailableSeats = {
  "1층": { VIP: [], R: [] },
  "2층": { S: [] },
}

const defaultStatistics = {
  total_bookings: 0,
  total_seats_booked: 0,
  unique_students: 0,
}

// 뮤지컬 ID를 테이블명으로 변환
function getTableName(musicalId: string): string {
  const tableMap: Record<string, string> = {
    "dead-poets-society": "dead_poets_society_bookings",
    rent: "rent_bookings",
    "your-lie-in-april": "your_lie_in_april_bookings",
  }
  return tableMap[musicalId] || "dead_poets_society_bookings"
}

export async function GET(request: Request, { params }: { params: { musicalId: string } }) {
  // 캐시 방지 헤더 설정
  const headers = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  }

  try {
    const musicalId = params.musicalId
    const tableName = getTableName(musicalId)
    const supabase = createServerClient()

    const { data: tableCheck, error: tableError } = await supabase.from(tableName).select("id").limit(1)

    if (tableError) {
      console.error("테이블 확인 오류:", tableError)

      if (tableError.code === "42P01" || tableError.message.includes("does not exist")) {
        return NextResponse.json(
          {
            success: true,
            unavailableSeats: defaultUnavailableSeats,
            statistics: defaultStatistics,
            message: `${musicalId} 데이터베이스 테이블이 생성되지 않았습니다. SQL 스크립트를 실행해주세요.`,
            needsSetup: true,
          },
          { headers },
        )
      }

      if (tableError.code === "42501" || tableError.message.includes("permission denied")) {
        console.error("RLS 권한 오류 - 기본값 반환:", tableError)
        return NextResponse.json(
          {
            success: true,
            unavailableSeats: defaultUnavailableSeats,
            statistics: defaultStatistics,
            message: "데이터베이스 권한 설정 필요 - 모든 좌석이 선택 가능합니다.",
          },
          { headers },
        )
      }

      return NextResponse.json(
        {
          success: true,
          unavailableSeats: defaultUnavailableSeats,
          statistics: defaultStatistics,
          message: "데이터베이스 연결 오류 - 모든 좌석이 선택 가능합니다.",
        },
        { headers },
      )
    }

    // 확정된 예매들의 좌석 정보 조회 - 최신 데이터만
    const { data: bookings, error } = await supabase
      .from(tableName)
      .select("selected_seats, seat_grade")
      .eq("status", "confirmed")
      .order("booking_date", { ascending: false })

    if (error) {
      console.error("좌석 상태 조회 오류:", error)
      return NextResponse.json(
        {
          success: true,
          unavailableSeats: defaultUnavailableSeats,
          statistics: defaultStatistics,
          message: "데이터 조회 오류 - 모든 좌석이 선택 가능합니다.",
        },
        { headers },
      )
    }

    // 예매된 좌석들을 층별, 등급별로 분류
    const unavailableSeats: Record<string, Record<string, string[]>> = {
      "1층": { VIP: [], R: [] },
      "2층": { S: [] },
    }

    bookings?.forEach((booking) => {
      const seatGrade = booking.seat_grade
      booking.selected_seats?.forEach((seatId: string) => {
        if (seatId.startsWith("1층")) {
          if (seatGrade === "VIP") {
            unavailableSeats["1층"]["VIP"].push(seatId)
          } else if (seatGrade === "R석") {
            unavailableSeats["1층"]["R"].push(seatId)
          }
        } else if (seatId.startsWith("2층")) {
          unavailableSeats["2층"]["S"].push(seatId)
        }
      })
    })

    // 통계 계산
    const { data: stats, error: statsError } = await supabase
      .from(tableName)
      .select("id, selected_seats, student_id")
      .eq("status", "confirmed")

    let statistics = defaultStatistics

    if (!statsError && stats) {
      const uniqueStudents = new Set(stats.map((booking) => booking.student_id))
      const totalSeats = stats.reduce((sum, booking) => sum + (booking.selected_seats?.length || 0), 0)

      statistics = {
        total_bookings: stats.length,
        total_seats_booked: totalSeats,
        unique_students: uniqueStudents.size,
      }
    }

    console.log(`[${new Date().toISOString()}] 좌석 상태 로드:`, {
      musicalId,
      totalBookings: bookings?.length || 0,
      unavailableCount: Object.values(unavailableSeats).reduce(
        (sum, floor) => sum + Object.values(floor).reduce((s, seats) => s + seats.length, 0),
        0,
      ),
    })

    return NextResponse.json(
      {
        success: true,
        unavailableSeats,
        statistics,
        message: bookings?.length
          ? `${bookings.length}개의 예매 정보를 불러왔습니다.`
          : "예매 정보가 없습니다. 모든 좌석이 선택 가능합니다.",
        timestamp: new Date().toISOString(),
      },
      { headers },
    )
  } catch (error) {
    console.error("좌석 상태 조회 중 예외 발생:", error)

    return NextResponse.json(
      {
        success: true,
        unavailableSeats: defaultUnavailableSeats,
        statistics: defaultStatistics,
        message: "서버 오류 - 모든 좌석이 선택 가능합니다.",
      },
      { headers },
    )
  }
}
