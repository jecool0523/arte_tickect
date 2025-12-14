import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

function getTableName(musicalId: string): string {
  const tableMap: Record<string, string> = {
    "dead-poets-society": "dead_poets_society_bookings",
    rent: "rent_bookings",
    "your-lie-in-april": "your_lie_in_april_bookings",
  }
  return tableMap[musicalId] || "dead_poets_society_bookings"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, studentId, musicalId } = body

    if (!name || !studentId || !musicalId) {
      return NextResponse.json({ error: "공연, 이름, 학번을 모두 입력해주세요." }, { status: 400 })
    }

    const supabase = createServerClient()
    const tableName = getTableName(musicalId)

    // 👇 [수정] limit(1) 삭제하고 모든 내역 조회
    const { data: bookings, error } = await supabase
      .from(tableName)
      .select("id, seat_grade, selected_seats, booking_date, special_request, name, student_id") 
      .eq("student_id", studentId)
      .eq("name", name)
      .eq("status", "confirmed")
      .order("booking_date", { ascending: false }) // 최신순 정렬

    if (error) {
      console.error("예매 확인 오류:", error)
      return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 })
    }

    // 데이터가 없으면 빈 배열 [] 반환이 아니라 에러 처리 (선택 사항)
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "일치하는 예매 정보를 찾을 수 없습니다." 
      }, { status: 404 })
    }

    // 👇 [수정] 배열 그대로 반환 ('bookings')
    return NextResponse.json({
      success: true,
      bookings, 
    })

  } catch (error) {
    console.error("API 오류:", error)
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
  }
}
