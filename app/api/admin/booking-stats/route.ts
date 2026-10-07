import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/server/supabase-admin"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { createAuthServerClient } from "@/lib/server/supabase-auth"

export const dynamic = "force-dynamic"
export const revalidate = 0

const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

export async function GET(request: NextRequest) {
  try {
    const authClient = await createAuthServerClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401, headers })
    const { data: isAdmin, error: adminError } = await authClient.rpc("is_current_user_admin")
    if (adminError || !isAdmin) return NextResponse.json({ code: "FORBIDDEN", error: "관리자 권한이 필요합니다." }, { status: 403, headers })
    const supabase = createServerClient()
    const rate = await enforceRateLimit(supabase, request, {
      bucket: "admin-booking-stats",
      limit: 30,
      windowSeconds: 60,
    })
    if (rate.unavailable) return NextResponse.json({ error: "Rate limiting is unavailable." }, { status: 503, headers })
    if (!rate.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers })

    const results = await Promise.all([
      supabase.from("dead_poets_society_bookings").select("selected_seats, user_id").eq("status", "confirmed"),
      supabase.from("rent_bookings").select("selected_seats, user_id").eq("status", "confirmed"),
      supabase.from("toctoc_bookings").select("selected_seats, user_id").eq("status", "confirmed"),
      supabase.from("arte_musical_application_period").select("musical_name, start_time, end_time"),
    ])
    if (results.some(result=>result.error)) throw new Error("Stats unavailable")
    const summary = (index: number) => {
      const rows = results[index].data as { selected_seats: string[]; user_id: string | null }[]
      return { total_bookings: rows.length, total_seats: rows.reduce((total,row)=>total+row.selected_seats.length,0), unique_users: new Set(rows.map(row=>row.user_id).filter(Boolean)).size }
    }
    return NextResponse.json({ success: true, stats: { dead_poets_society: summary(0), rent: summary(1), toctoc: summary(2), periods: results[3].data ?? [] } }, { headers })
  } catch {
    console.error("Admin booking stats failed")
    return NextResponse.json({ error: "Failed to fetch booking stats." }, { status: 500, headers })
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405, headers })
}
