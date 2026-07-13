import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { isKnownMusicalId } from "@/lib/musical-config"

export const dynamic = "force-dynamic"
export const revalidate = 0

type CreateReviewBody = {
  musicalId?: string
  name?: string
  password?: string
  content?: string
  rating?: number
  imageUrl?: string | null
}

const publicReviewSelect = "id, musical_id, user_name, content, image_url, rating, created_at"

export async function GET(request: NextRequest) {
  const musicalId = request.nextUrl.searchParams.get("musicalId")

  if (!musicalId) {
    return NextResponse.json({ error: "musicalId is required." }, { status: 400 })
  }

  if (!isKnownMusicalId(musicalId)) {
    return NextResponse.json({ error: "존재하지 않는 공연 ID입니다." }, { status: 404 })
  }

  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("reviews")
      .select(publicReviewSelect)
      .eq("musical_id", musicalId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, reviews: data || [] })
  } catch (error) {
    console.error("Review list load failed:", error)
    return NextResponse.json({ error: "리뷰를 불러오지 못했습니다." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateReviewBody
    const musicalId = body.musicalId?.trim()
    const name = body.name?.trim()
    const password = body.password?.trim()
    const content = body.content?.trim()
    const rating = Number(body.rating ?? 5)

    if (!musicalId || !name || !password || !content) {
      return NextResponse.json({ error: "이름, 비밀번호, 내용은 필수입니다." }, { status: 400 })
    }

    if (!isKnownMusicalId(musicalId)) {
      return NextResponse.json({ error: "존재하지 않는 공연 ID입니다." }, { status: 404 })
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "별점은 1점부터 5점까지 입력할 수 있습니다." }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data, error } = await supabase.rpc("create_review", {
      p_musical_id: musicalId,
      p_user_name: name,
      p_password: password,
      p_content: content,
      p_rating: rating,
      p_image_url: body.imageUrl || null,
    })

    if (error) {
      console.error("Create review RPC failed:", error)
      return NextResponse.json(
        { error: "리뷰 보안 SQL이 아직 적용되지 않았습니다. scripts/20260704-review-password-security.sql을 실행해주세요." },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, review: data })
  } catch (error) {
    console.error("Review create request failed:", error)
    return NextResponse.json({ error: "리뷰 등록 중 오류가 발생했습니다." }, { status: 500 })
  }
}
