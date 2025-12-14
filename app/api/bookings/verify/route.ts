import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

// 헬퍼 함수: 뮤지컬 ID에 따라 테이블 이름 반환
function getTableName(musicalId: string): string {
  const tableMap: Record<string, string> = {
    "dead-poets-society": "dead_poets_society_bookings",
    rent: "rent_bookings",
    "your-lie-in-april": "your_lie_in_april_bookings",
  }
  // 기본값은 안전하게 설정 (필요시 수정)
  return tableMap[musicalId] || "dead_poets_society_bookings"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // 👇 [수정] musicalId를 추가로 받습니다.
    const { name, studentId, musicalId } = body

    // 1. 입력값 검증
    if (!name || !studentId || !musicalId) {
      return NextResponse.json({ error: "공연, 이름, 학번을 모두 입력해주세요." }, { status: 400 })
    }

    const supabase = createServerClient()
    const tableName = getTableName(musicalId) // 👇 [수정] 선택한 공연의 테이블명을 가져옵니다.

    // 2. 데이터베이스 조회
    const { data: bookings, error } = await supabase
      .from(tableName) // 👇 [수정] 동적으로 테이블 선택
      .select("seat_grade, selected_seats, booking_date, special_request, name, student_id") 
      .eq("student_id", studentId)
      .eq("name", name)
      .eq("status", "confirmed")
      .order("booking_date", { ascending: false }) // 👇 [추가] 최신순 정렬
      .limit(1) // 👇 [추가] 여러 개여도 가장 최근 것 1개만 가져옴

    if (error) {
      console.error("예매 확인 오류:", error)
      return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 })
    }

    // 배열의 첫 번째 요소 확인
    const booking = bookings && bookings.length > 0 ? bookings[0] : null

    if (!booking) {
      return NextResponse.json({ 
        success: false, 
        message: "일치하는 예매 정보를 찾을 수 없습니다." 
      }, { status: 404 })
    }

    // 3. 찾은 정보 반환
    return NextResponse.json({
      success: true,
      booking, 
    })

  } catch (error) {
    console.error("API 오류:", error)
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
  }
}
