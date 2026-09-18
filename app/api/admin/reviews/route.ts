import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/server/supabase-admin"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const revalidate = 0

const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

const deleteReviewSchema = z.object({
  reviewId: z.number().int().positive(),
})

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = deleteReviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid review ID." }, { status: 400, headers })
    }

    const supabase = createServerClient()
    const rate = await enforceRateLimit(supabase, request, {
      bucket: "admin-review-delete",
      limit: 30,
      windowSeconds: 60,
    })
    if (rate.unavailable) return NextResponse.json({ error: "Rate limiting is unavailable." }, { status: 503, headers })
    if (!rate.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers })

    const { data, error } = await supabase.rpc("admin_delete_review", {
      p_review_id: parsed.data.reviewId,
    })

    if (error) {
      console.error("Admin delete review RPC failed", { code: error.code })
      return NextResponse.json({ error: "Failed to delete review." }, { status: 503, headers })
    }

    const result = data as { success: boolean; error?: string; code?: string }
    if (!result.success) {
      const status = result.code === "FORBIDDEN" ? 403 : 400
      return NextResponse.json({ error: result.error, code: result.code }, { status, headers })
    }

    return NextResponse.json({ success: true }, { headers })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid request body." }, { status: 400, headers })
    console.error("Admin delete review failed")
    return NextResponse.json({ error: "Failed to delete review." }, { status: 500, headers })
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405, headers })
}