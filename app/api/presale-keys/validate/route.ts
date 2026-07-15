import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/server/supabase-admin"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { readJsonBody, RequestBodyError } from "@/lib/security/request"
import { presaleValidationSchema } from "@/lib/security/validation"

const headers = { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" }

export async function POST(request: NextRequest) {
  try {
    const { musicalId, presaleKey } = await readJsonBody(request, presaleValidationSchema)
    const supabase = createServerClient()
    const { data: period, error: periodError } = await supabase
      .from("arte_musical_application_period")
      .select("end_time")
      .eq("musical_name", musicalId)
      .single()
    if (periodError || new Date() > new Date(period.end_time)) {
      return NextResponse.json({ success: false, error: "Presale access is closed." }, { status: 403, headers })
    }
    const rate = await enforceRateLimit(supabase, request, { bucket: "presale-validate", limit: 5, windowSeconds: 300 }, musicalId)
    if (rate.unavailable) return NextResponse.json({ success: false, error: "Rate limiting is unavailable." }, { status: 503, headers })
    if (!rate.allowed) return NextResponse.json({ success: false, error: "Too many attempts." }, { status: 429, headers })

    const args = { p_musical_id: musicalId, p_key: presaleKey }
    const [{ data: valid, error }, { data: maxSeats, error: limitError }] = await Promise.all([
      supabase.rpc("validate_presale_access_key", args),
      supabase.rpc("get_presale_access_key_seat_limit", args),
    ])
    if (error || limitError) return NextResponse.json({ success: false, error: "Presale validation is unavailable." }, { status: 503, headers })
    if (valid !== true) return NextResponse.json({ success: false, error: "Invalid or expired presale key." }, { status: 403, headers })
    return NextResponse.json({ success: true, maxSeats }, { headers })
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ success: false, error: error.message }, { status: error.status, headers })
    console.error("Presale validation request failed")
    return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400, headers })
  }
}
