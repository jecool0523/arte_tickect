import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, studentId } = body

    // 1. 입력값 검증
    if (!name || !studentId) {
      return NextResponse.json({ error: "이름과 학번을 입력해주세요." }, { status: 400 })
    }

    const supabase = createServerClient()

    // 2. 데이터베이스에서 일치하는 '단 한 건'만 조회 (보안 핵심!)
    // select() 안에 필요한 필드만 적어서 민감한 정보(타인의 개인정보 등)는 원천 차단
    const { data: booking, error } = await supabase
      .from("arte_musical_tickets")
      .select("seat_grade, selected_seats, booking_date, special_request, name, student_id") 
      .eq("student_id", studentId)
      .eq("name", name)
      .eq("status", "confirmed") // 취소된 표는 조회 안 되게
      .maybeSingle() // single()은 결과가 없으면 에러를 뱉지만, maybeSingle()은 null을 반환해서 처리가 더 쉬움

    if (error) {
      console.error("예매 확인 오류:", error)
      return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 })
    }

    if (!booking) {
      return NextResponse.json({ 
        success: false, 
        message: "일치하는 예매 정보를 찾을 수 없습니다." 
      }, { status: 404 })
    }

    // 3. 찾은 정보 반환
    return NextResponse.json({
      success: true,
      booking, // 찾은 본인의 정보만 클라이언트로 전달
    })

  } catch (error) {
    console.error("API 오류:", error)
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 })
  }
}
