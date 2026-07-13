import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { getBookingTableName, isKnownMusicalId } from "@/lib/musical-config"

export const dynamic = "force-dynamic"
export const revalidate = 0

const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

type BookingRequestBody = {
  name?: string
  studentId?: string
  seatGrade?: string
  selectedSeats?: string[]
  specialRequest?: string
  presaleKey?: string
}

type ServerClient = ReturnType<typeof createServerClient>

async function releasePresaleKeyUsage(supabase: ServerClient, musicalId: string, presaleKey: string) {
  const { error } = await supabase.rpc("release_presale_access_key", {
    p_musical_id: musicalId,
    p_key: presaleKey,
  })

  if (error) {
    console.error("Presale key release failed:", error)
  }
}

export async function POST(request: NextRequest, { params }: { params: { musicalId: string } }) {
  try {
    const musicalId = params.musicalId

    if (!isKnownMusicalId(musicalId)) {
      return NextResponse.json({ error: "존재하지 않는 공연 ID입니다." }, { status: 404, headers })
    }

    const body = (await request.json()) as BookingRequestBody
    const { name, studentId, seatGrade, selectedSeats, specialRequest } = body
    const presaleKey = body.presaleKey?.trim() ?? ""

    if (!name || !studentId || !seatGrade || !selectedSeats?.length) {
      return NextResponse.json({ error: "필수 예약 정보가 누락되었습니다." }, { status: 400, headers })
    }

    const supabase = createServerClient()
    const currentDate = new Date()

    const { data: periodData, error: periodDataError } = await supabase
      .from("arte_musical_application_period")
      .select("start_time, end_time")
      .eq("musical_name", musicalId)
      .single()

    if (periodDataError) {
      console.error("Application period load failed:", periodDataError)
      return NextResponse.json({ error: "예매 기간 정보를 불러올 수 없습니다." }, { status: 500, headers })
    }

    const startDate = new Date(periodData.start_time)
    const endDate = new Date(periodData.end_time)
    const periodLabel = `${startDate.toLocaleString("ko-KR")} ~ ${endDate.toLocaleString("ko-KR")}`
    const isInBookingPeriod = currentDate >= startDate && currentDate <= endDate
    let usedPresaleKey = false

    if (!isInBookingPeriod) {
      if (!presaleKey) {
        return NextResponse.json(
          {
            code: "PRESALE_KEY_REQUIRED",
            error: `현재는 일반 예매 기간이 아닙니다. 예매 코드가 있으면 예매할 수 있습니다. 일반 예매 기간: ${periodLabel}`,
          },
          { status: 403, headers },
        )
      }

      const { data: canUsePresaleKey, error: presaleError } = await supabase.rpc("consume_presale_access_key", {
        p_musical_id: musicalId,
        p_key: presaleKey,
      })

      if (presaleError) {
        console.error("Presale key validation failed:", presaleError)
        return NextResponse.json(
          { code: "PRESALE_KEY_UNAVAILABLE", error: "예매 코드 설정을 확인할 수 없습니다." },
          { status: 500, headers },
        )
      }

      if (!canUsePresaleKey) {
        return NextResponse.json(
          { code: "INVALID_PRESALE_KEY", error: "예매 코드가 유효하지 않거나 사용 가능 기간/횟수를 초과했습니다." },
          { status: 403, headers },
        )
      }

      usedPresaleKey = true
    }

    const { data: result, error: rpcError } = await supabase.rpc("book_musical_seats", {
      p_musical_id: musicalId,
      p_name: name,
      p_student_id: studentId,
      p_seat_grade: seatGrade,
      p_selected_seats: selectedSeats,
      p_special_request: specialRequest || null,
    })

    if (rpcError) {
      console.error("Booking RPC failed:", rpcError)
      if (usedPresaleKey) await releasePresaleKeyUsage(supabase, musicalId, presaleKey)
      return NextResponse.json({ error: "예매 처리 중 오류가 발생했습니다." }, { status: 500, headers })
    }

    if (!result.success) {
      if (usedPresaleKey) await releasePresaleKeyUsage(supabase, musicalId, presaleKey)

      if (result.conflictSeats) {
        return NextResponse.json(
          {
            error: "선택한 좌석 중 이미 예매된 좌석이 있습니다.",
            conflictSeats: result.conflictSeats,
          },
          { status: 409, headers },
        )
      }

      return NextResponse.json({ error: result.error || "예매에 실패했습니다." }, { status: 500, headers })
    }

    return NextResponse.json(
      {
        success: true,
        bookingId: result.bookingId,
        bookingDate: result.bookingDate,
        presale: usedPresaleKey,
        message: usedPresaleKey ? "예매 코드로 예매가 완료되었습니다." : "예매 신청이 완료되었습니다.",
      },
      { headers },
    )
  } catch (error) {
    console.error("Booking request failed:", error)
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500, headers },
    )
  }
}

export async function GET(_request: NextRequest, { params }: { params: { musicalId: string } }) {
  try {
    const tableName = getBookingTableName(params.musicalId)

    if (!tableName) {
      return NextResponse.json({ error: "존재하지 않는 공연 ID입니다." }, { status: 404, headers })
    }

    const supabase = createServerClient()

    const { error: tableCheckError } = await supabase.from(tableName).select("count", { count: "exact", head: true })

    if (tableCheckError) {
      return NextResponse.json(
        {
          success: false,
          error: `${params.musicalId} booking table is not ready.`,
          bookings: [],
          needsSetup: true,
        },
        { headers },
      )
    }

    const { data: bookings, error } = await supabase
      .from(tableName)
      .select("*")
      .order("booking_date", { ascending: false })

    if (error) throw error

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
    console.error("Booking list load failed:", error)
    return NextResponse.json({ error: "예약 정보 조회 중 오류가 발생했습니다." }, { status: 500, headers })
  }
}
