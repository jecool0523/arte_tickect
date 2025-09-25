import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

const defaultUnavailableSeats = {
  "1층": { VIP: [], R: [] },
  "2층": { S: [] },
}

const defaultStatistics = {
  total_bookings: 0,
  total_seats_booked: 0,
  unique_students: 0,
}

export async function GET() {
  try {
    const supabase = createServerClient()

    // 먼저 테이블 존재 여부 확인
    const { data: tableCheck, error: tableError } = await supabase
      .from("arte_musical_tickets")
      .select("count", { count: "exact", head: true })

    if (tableError) {
      console.error("테이블 확인 오류:", tableError)

      // 테이블이 존재하지 않는 경우
      if (tableError.code === "42P01" || tableError.message.includes("does not exist")) {
        return NextResponse.json({
          success: true,
          unavailableSeats: defaultUnavailableSeats,
          statistics: defaultStatistics,
          message: "데이터베이스 테이블이 생성되지 않았습니다. SQL 스크립트를 실행해주세요.",
          needsSetup: true,
        })
      }

      // 다른 오류의 경우 기본 데이터 반환
      return NextResponse.json({
        success: true,
        unavailableSeats: defaultUnavailableSeats,
        statistics: defaultStatistics,
        message: "데이터베이스 연결 오류 - 모든 좌석이 선택 가능합니다.",
      })
    }

    // 확정된 예매들의 좌석 정보 조회
    const { data: bookings, error } = await supabase
      .from("arte_musical_tickets")
      .select("selected_seats, seat_grade")
      .eq("status", "confirmed")

    if (error) {
      console.error("좌석 상태 조회 오류:", error)
      return NextResponse.json({
        success: true,
        unavailableSeats: defaultUnavailableSeats,
        statistics: defaultStatistics,
        message: "데이터 조회 오류 - 모든 좌석이 선택 가능합니다.",
      })
    }

    // 예매된 좌석들을 층별, 등급별로 분류
    const unavailableSeats: Record<string, Record<string, string[]>> = {
      "1층": { VIP: [], R: [] },
      "2층": { S: [] },
    }

    bookings?.forEach((booking) => {
      const seatGrade = booking.seat_grade
      booking.selected_seats?.forEach((seatId: string) => {
        // 좌석 ID에서 층 정보 추출
        if (seatId.startsWith("1층")) {
          if (seatGrade === "VIP") {
            unavailableSeats["1층"]["VIP"].push(seatId)
          } else if (seatGrade === "R") {
            unavailableSeats["1층"]["R"].push(seatId)
          }
        } else if (seatId.startsWith("2층")) {
          unavailableSeats["2층"]["S"].push(seatId)
        }
      })
    })

    // 통계 계산
    const { data: stats, error: statsError } = await supabase
      .from("arte_musical_tickets")
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

    return NextResponse.json({
      success: true,
      unavailableSeats,
      statistics,
      message: bookings?.length
        ? `${bookings.length}개의 예매 정보를 불러왔습니다.`
        : "예매 정보가 없습니다. 모든 좌석이 선택 가능합니다.",
    })
  } catch (error) {
    console.error("좌석 상태 조회 중 예외 발생:", error)

    // 예외 발생 시 기본 데이터 반환
    return NextResponse.json({
      success: true,
      unavailableSeats: defaultUnavailableSeats,
      statistics: defaultStatistics,
      message: "서버 오류 - 모든 좌석이 선택 가능합니다.",
    })
  }
}
