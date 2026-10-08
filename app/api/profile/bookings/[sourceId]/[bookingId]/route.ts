import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
import { createServerClient } from "@/lib/server/supabase-admin"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { readJsonBody, RequestBodyError } from "@/lib/security/request"
import { findReservationSource } from "@/lib/reservations"

export const dynamic = "force-dynamic"
export const revalidate = 0
const headers = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Vary: "Cookie" }
const actionSchema = z.object({ action: z.enum(["cancel", "rebook"]) }).strict()
const failures: Record<string, [number, string]> = {
  NOT_FOUND: [404, "예약을 찾을 수 없습니다."],
  INVALID_INPUT: [400, "예약 정보를 확인해주세요."],
  INVALID_STATUS: [409, "현재 상태에서는 취소할 수 없습니다. 운영자에게 문의해주세요."],
  REBOOK_UNSUPPORTED: [409, "이전 공연은 재예매할 수 없습니다. 공연 목록에서 새 공연을 선택해주세요."],
  PROFILE_INCOMPLETE: [403, "재예매하려면 내 정보를 먼저 등록해주세요."],
  BOOKING_PERIOD_UNAVAILABLE: [503, "예매 기간을 확인하지 못했습니다. 기존 예약은 취소하지 않았습니다."],
  BOOKING_CLOSED: [403, "예매 기간이 종료되어 재예매할 수 없습니다. 기존 예약은 취소하지 않았습니다."],
  PRESALE_PERMISSION_REQUIRED: [403, "일반 예매가 시작되지 않았고 선예매 권한이 없습니다. 기존 예약은 취소하지 않았습니다."],
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ sourceId: string; bookingId: string }> }) {
  const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers })
  try {
    const auth = await createAuthServerClient()
    const { data: { user }, error: authError } = await auth.auth.getUser()
    if (authError || !user) return json({ error: "로그인이 필요합니다." }, 401)
    const { sourceId, bookingId } = await params
    if (!findReservationSource(sourceId) || !/^[1-9][0-9]*$/.test(bookingId) || !Number.isSafeInteger(Number(bookingId))) return json({ error: "예약을 찾을 수 없습니다." }, 404)
    const origin = request.headers.get("origin")
    if ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site") return json({ error: "Invalid origin." }, 403)
    if (request.nextUrl.search) return json({ error: "Query fields are not allowed." }, 400)
    const { action } = await readJsonBody(request, actionSchema, 1024)
    const supabase = createServerClient()
    const rate = await enforceRateLimit(supabase, request, { bucket: "owned-booking-cancel", limit: 10, windowSeconds: 300 }, user.id)
    if (rate.unavailable) return json({ error: "잠시 후 다시 시도해주세요." }, 503)
    if (!rate.allowed) return json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, 429)
    const { data, error } = await supabase.rpc("cancel_owned_reservation", {
      p_user_id: user.id, p_source_id: sourceId, p_booking_id: Number(bookingId), p_for_rebooking: action === "rebook",
    })
    if (error || !data) return json({ error: "처리 결과를 확인하지 못했습니다. 예약 내역을 새로고침해 확인해주세요." }, 503)
    if (!data.success) {
      const [status, message] = failures[data.code || ""] || [409, "예약을 변경하지 못했습니다."]
      return json({ code: data.code, error: message }, status)
    }
    return json(data)
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status)
    return json({ error: "처리 결과를 확인하지 못했습니다. 예약 내역을 새로고침해 확인해주세요." }, 503)
  }
}
