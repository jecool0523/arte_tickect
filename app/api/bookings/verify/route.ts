import { NextResponse } from "next/server"

const headers = { "Cache-Control": "no-store, no-cache, must-revalidate" }

export function POST() {
  return NextResponse.json(
    { code: "LEGACY_LOOKUP_DISABLED", error: "로그인 후 내 티켓을 이용해주세요." },
    { status: 410, headers },
  )
}
