import "server-only"
import { createServerClient } from "@/lib/server/supabase-admin"

// Display/preflight only: book_musical_seats rechecks time and permission atomically.
export async function getBookingAccess(musicalId: string, userId: string | null) {
  const client = createServerClient()
  const { data: period, error } = await client.from("arte_musical_application_period")
    .select("start_time, end_time").eq("musical_name", musicalId).single()
  if (error || !period) throw new Error("Booking period unavailable")
  const start = Date.parse(period.start_time), end = Date.parse(period.end_time), now = Date.now()
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) throw new Error("Invalid booking period")
  const isBeforeStart = now < start, isAfterEnd = now > end
  let isPresaleUser = false
  if (isBeforeStart && userId) {
    const { data: profile, error: profileError } = await client.from("profiles")
      .select("is_presale_user").eq("id", userId).maybeSingle()
    if (profileError) throw new Error("Presale permission unavailable")
    isPresaleUser = profile?.is_presale_user === true
  }
  const presale = isBeforeStart && isPresaleUser
  const isOpen = !isAfterEnd && (!isBeforeStart || presale)
  const code = isAfterEnd ? "BOOKING_CLOSED" : isOpen ? "BOOKING_OPEN" : userId ? "PRESALE_PERMISSION_REQUIRED" : "AUTH_REQUIRED"
  const message = isAfterEnd ? "예매 기간이 종료되었습니다." : presale ? "선예매 권한이 확인되었습니다. 예매를 진행해주세요."
    : isOpen ? "일반 예매 기간입니다." : userId ? "선예매 권한이 없는 계정입니다. 일반 예매 시작 후 이용해주세요."
      : "선예매 권한을 확인하려면 로그인해주세요."
  return { success: true, isOpen, isBeforeStart, isAfterEnd, presale, authenticated: !!userId,
    startTime: period.start_time, endTime: period.end_time, code, message }
}
