import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServerClient } from "@/lib/server/supabase-admin"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { readJsonBody, RequestBodyError } from "@/lib/security/request"
import { createReviewSchema } from "@/lib/security/validation"
import { isKnownMusicalId } from "@/lib/musical-config"
import { isAllowedReviewMediaUrl } from "@/lib/security/validation"

export const dynamic = "force-dynamic"
export const revalidate = 0
const publicReviewSelect = "id, musical_id, user_name, content, image_url, rating, created_at"

export async function GET(request: NextRequest) {
  const musicalId = request.nextUrl.searchParams.get("musicalId")
  if (!musicalId || !isKnownMusicalId(musicalId)) return NextResponse.json({ error: "Unknown musical." }, { status: 404 })
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase.from("reviews").select(publicReviewSelect).eq("musical_id", musicalId).order("created_at", { ascending: false })
    if (error) throw error
    return NextResponse.json({ success: true, reviews: data || [] })
  } catch { return NextResponse.json({ error: "Reviews are unavailable." }, { status: 503 }) }
}

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody(request, createReviewSchema.extend({ deletionToken: z.string().trim().min(32).max(256) }))
    if (!isAllowedReviewMediaUrl(body.imageUrl, process.env.NEXT_PUBLIC_SUPABASE_URL || "")) {
      return NextResponse.json({ error: "Invalid review media." }, { status: 400 })
    }
    const supabase = createServerClient()
    const rate = await enforceRateLimit(supabase, request, { bucket: "review-create", limit: 5, windowSeconds: 600 }, body.musicalId)
    if (rate.unavailable) return NextResponse.json({ error: "Rate limiting is unavailable." }, { status: 503 })
    if (!rate.allowed) return NextResponse.json({ error: "Too many review attempts." }, { status: 429 })
    const { data, error } = await supabase.rpc("create_review", {
      p_musical_id: body.musicalId, p_user_name: body.name, p_deletion_token: body.deletionToken,
      p_content: body.content, p_rating: body.rating, p_image_url: body.imageUrl || null,
    })
    if (error) { console.error("Create review RPC failed", { code: error.code }); return NextResponse.json({ error: "Review creation is unavailable." }, { status: 503 }) }
    return NextResponse.json({ success: true, review: data })
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: "Invalid review request." }, { status: 400 })
  }
}
