import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/server/supabase-admin"
import { enforceRateLimit } from "@/lib/server/rate-limit"

export const dynamic = "force-dynamic"
export const revalidate = 0

const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const rate = await enforceRateLimit(supabase, request, {
      bucket: "admin-booking-stats",
      limit: 30,
      windowSeconds: 60,
    })
    if (rate.unavailable) return NextResponse.json({ error: "Rate limiting is unavailable." }, { status: 503, headers })
    if (!rate.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers })

    const { data, error } = await supabase.rpc("admin_get_booking_stats")

    if (error) {
      console.error("Admin booking stats RPC failed", { code: error.code })
      return NextResponse.json({ error: "Failed to fetch booking stats." }, { status: 503, headers })
    }

    const result = data as { success: boolean; stats: unknown; error?: string; code?: string }
    if (!result.success) {
      const status = result.code === "FORBIDDEN" ? 403 : 400
      return NextResponse.json({ error: result.error, code: result.code }, { status, headers })
    }

    return NextResponse.json({ success: true, stats: result.stats }, { headers })
  } catch {
    console.error("Admin booking stats failed")
    return NextResponse.json({ error: "Failed to fetch booking stats." }, { status: 500, headers })
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405, headers })
}