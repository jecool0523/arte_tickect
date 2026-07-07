import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const revalidate = 0

const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

export async function GET(_request: NextRequest, { params }: { params: { musicalId: string } }) {
  try {
    const supabase = createServerClient()
    const now = new Date()

    const { data: periodData, error } = await supabase
      .from("arte_musical_application_period")
      .select("start_time, end_time")
      .eq("musical_name", params.musicalId)
      .single()

    if (error) {
      console.error("Booking period load failed:", error)
      return NextResponse.json({ error: "예매 기간 정보를 불러올 수 없습니다." }, { status: 500, headers })
    }

    const startDate = new Date(periodData.start_time)
    const endDate = new Date(periodData.end_time)
    const isBeforeStart = now < startDate
    const isAfterEnd = now > endDate
    const isOpen = !isBeforeStart && !isAfterEnd

    return NextResponse.json(
      {
        success: true,
        isOpen,
        isBeforeStart,
        isAfterEnd,
        startTime: periodData.start_time,
        endTime: periodData.end_time,
        code: isOpen ? "BOOKING_OPEN" : isAfterEnd ? "BOOKING_PERIOD_CLOSED" : "PRESALE_KEY_REQUIRED",
        message: isOpen
          ? "예매 기간입니다."
          : isAfterEnd
            ? `예매 기간이 종료되었습니다. (${startDate.toLocaleString("ko-KR")} ~ ${endDate.toLocaleString("ko-KR")})`
            : `아직 예매기간이 아닙니다. 초대권이 있다면 기간 전에 예매할 수 있습니다. 일반 예매 기간: ${startDate.toLocaleString("ko-KR")} ~ ${endDate.toLocaleString("ko-KR")}`,
      },
      { headers },
    )
  } catch (error) {
    console.error("Booking period request failed:", error)
    return NextResponse.json({ error: "예매 기간 확인 중 오류가 발생했습니다." }, { status: 500, headers })
  }
}
