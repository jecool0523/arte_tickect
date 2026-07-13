import { type NextRequest, NextResponse } from "next/server"
import { isKnownMusicalId } from "@/lib/musical-config"
import { createServerClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const revalidate = 0

const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

type ValidatePresaleKeyBody = {
  musicalId?: string
  presaleKey?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ValidatePresaleKeyBody
    const musicalId = body.musicalId?.trim() ?? ""
    const presaleKey = body.presaleKey?.trim() ?? ""

    if (!isKnownMusicalId(musicalId) || !presaleKey) {
      return NextResponse.json(
        { success: false, error: "유효한 예매 코드를 입력해주세요." },
        { status: 400, headers },
      )
    }

    const supabase = createServerClient()
    const { data: isValid, error } = await supabase.rpc("validate_presale_access_key", {
      p_musical_id: musicalId,
      p_key: presaleKey,
    })

    if (error) {
      console.error("Presale key validation failed:", error)
      return NextResponse.json(
        { success: false, error: "예매 코드를 확인할 수 없습니다. 잠시 후 다시 시도해주세요." },
        { status: 500, headers },
      )
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "예매 코드가 유효하지 않거나 사용 가능 기간/횟수를 초과했습니다." },
        { status: 403, headers },
      )
    }

    return NextResponse.json({ success: true }, { headers })
  } catch (error) {
    console.error("Presale key validation request failed:", error)
    return NextResponse.json({ success: false, error: "잘못된 요청입니다." }, { status: 400, headers })
  }
}
