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
  let presaleLimit: number | null = null, presaleRemaining: number | null = null
  if (isBeforeStart && userId) {
    const { data: profile, error: profileError } = await client.from("profiles")
      .select("is_presale_user").eq("id", userId).maybeSingle()
    if (profileError) throw new Error("Presale permission unavailable")
    isPresaleUser = profile?.is_presale_user === true
    if (isPresaleUser) {
      const { data: allowance, error: allowanceError } = await client.rpc("get_account_presale_allowance", {
        p_user_id: userId, p_musical_id: musicalId,
      })
      if (allowanceError || !allowance || !Number.isInteger(allowance.used)
        || (allowance.limit !== null && (!Number.isInteger(allowance.limit) || allowance.limit < 1))
        || (allowance.remaining !== null && (!Number.isInteger(allowance.remaining) || allowance.remaining < 0))
        || allowance.used < 0 || (allowance.limit === null) !== (allowance.remaining === null)
        || (allowance.limit !== null && allowance.remaining !== Math.max(0, allowance.limit - allowance.used)))
        throw new Error("Presale allowance unavailable")
      presaleLimit = allowance.limit
      presaleRemaining = allowance.remaining
    }
  }
  const presale = isBeforeStart && isPresaleUser
  const exhausted = presale && presaleRemaining === 0
  const isOpen = !isAfterEnd && (!isBeforeStart || (presale && !exhausted))
  const code = isAfterEnd ? "BOOKING_CLOSED" : exhausted ? "PRESALE_LIMIT_EXCEEDED" : isOpen ? "BOOKING_OPEN" : userId ? "PRESALE_PERMISSION_REQUIRED" : "AUTH_REQUIRED"
  const message = isAfterEnd ? "예매 기간이 종료되었습니다." : exhausted ? "이 공연의 선예매 2장을 모두 사용했습니다. 기존 선예매를 취소하거나 일반 예매 시작 후 이용해주세요." : presale ? "선예매 권한이 확인되었습니다. 예매를 진행해주세요."
    : isOpen ? "일반 예매 기간입니다." : userId ? "선예매 권한이 없는 계정입니다. 일반 예매 시작 후 이용해주세요."
      : "선예매 권한을 확인하려면 로그인해주세요."
  return { success: true, isOpen, isBeforeStart, isAfterEnd, presale, authenticated: !!userId,
    startTime: period.start_time, endTime: period.end_time, code, message, presaleLimit, presaleRemaining }
}
