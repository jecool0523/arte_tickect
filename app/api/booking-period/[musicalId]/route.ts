import { type NextRequest, NextResponse } from "next/server"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
import { getBookingAccess } from "@/lib/server/booking-access"
import { isKnownMusicalId } from "@/lib/musical-config"

export const dynamic = "force-dynamic"
export const revalidate = 0
const headers = { "Cache-Control": "private, no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0" }

export async function GET(_request: NextRequest, { params }: { params: Promise<{ musicalId: string }> }) {
  const { musicalId } = await params
  if (!isKnownMusicalId(musicalId)) return NextResponse.json({ error: "존재하지 않는 공연입니다." }, { status: 404, headers })
  try {
    const auth = await createAuthServerClient()
    const { data: { user }, error } = await auth.auth.getUser()
    return NextResponse.json(await getBookingAccess(musicalId, !error && user ? user.id : null), { headers })
  } catch {
    console.error("Booking access check failed")
    return NextResponse.json({ error: "예매 가능 여부를 확인하지 못했습니다. 잠시 후 다시 시도해주세요." }, { status: 503, headers })
  }
}
