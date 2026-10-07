import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export function POST() {
  return NextResponse.json({ success: false, code: "PRESALE_CODES_RETIRED", error: "선예매 코드는 더 이상 사용하지 않습니다. 권한이 부여된 계정으로 로그인해주세요." },
    { status: 410, headers: { "Cache-Control": "no-store" } })
}
