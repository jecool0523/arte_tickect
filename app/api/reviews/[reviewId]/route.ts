import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/server/supabase-admin"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { readJsonBody, RequestBodyError } from "@/lib/security/request"
import { deleteReviewSchema } from "@/lib/security/validation"

export async function DELETE(request: NextRequest, { params }: { params: { reviewId: string } }) {
  const reviewId = Number(params.reviewId)
  if (!Number.isSafeInteger(reviewId) || reviewId <= 0) return NextResponse.json({ error: "Invalid review ID." }, { status: 400 })
  try {
    const { deletionToken } = await readJsonBody(request, deleteReviewSchema)
    const supabase = createServerClient()
    const rate = await enforceRateLimit(supabase, request, { bucket: "review-delete", limit: 5, windowSeconds: 900 }, String(reviewId))
    if (rate.unavailable) return NextResponse.json({ error: "Rate limiting is unavailable." }, { status: 503 })
    if (!rate.allowed) return NextResponse.json({ error: "Too many attempts." }, { status: 429 })
    const { data: deleted, error } = await supabase.rpc("delete_review_with_token", { p_review_id: reviewId, p_deletion_token: deletionToken })
    if (error) { console.error("Delete review RPC failed", { code: error.code }); return NextResponse.json({ error: "Review deletion is unavailable." }, { status: 503 }) }
    if (deleted !== true) return NextResponse.json({ error: "Invalid deletion token." }, { status: 403 })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: "Review deletion failed." }, { status: 500 })
  }
}
