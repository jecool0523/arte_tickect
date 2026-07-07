import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const revalidate = 0

type DeleteReviewBody = {
  password?: string
}

export async function DELETE(request: NextRequest, { params }: { params: { reviewId: string } }) {
  const reviewId = Number(params.reviewId)

  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    return NextResponse.json({ error: "잘못된 리뷰 ID입니다." }, { status: 400 })
  }

  try {
    const body = (await request.json()) as DeleteReviewBody
    const password = body.password?.trim()

    if (!password) {
      return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: deleted, error } = await supabase.rpc("delete_review_with_password", {
      p_review_id: reviewId,
      p_password: password,
    })

    if (error) {
      console.error("Delete review RPC failed:", error)
      return NextResponse.json(
        { error: "리뷰 보안 SQL이 아직 적용되지 않았습니다. scripts/20260704-review-password-security.sql을 실행해주세요." },
        { status: 500 },
      )
    }

    if (!deleted) {
      return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 403 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Review delete request failed:", error)
    return NextResponse.json({ error: "리뷰 삭제 중 오류가 발생했습니다." }, { status: 500 })
  }
}
