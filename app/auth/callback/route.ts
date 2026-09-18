import { type NextRequest, NextResponse } from "next/server"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
import { syncProfileFromAuth } from "@/lib/server/sync-profile"

function safeNextUrl(request: NextRequest) {
  const origin = request.nextUrl.origin
  try {
    const target = new URL(request.nextUrl.searchParams.get("next") || "/", origin)
    return target.origin === origin ? target : new URL("/", origin)
  } catch {
    return new URL("/", origin)
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const next = safeNextUrl(request)

  if (code) {
    const supabase = await createAuthServerClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      // 프로필 메타데이터 동기화 (아바타, 이름)
      await syncProfileFromAuth(data.user.id)

      const response = NextResponse.redirect(next)
      response.headers.set("Cache-Control", "private, no-store")
      return response
    }
  }

  const errorUrl = new URL("/login", request.url)
  errorUrl.searchParams.set("error", "oauth_callback_failed")
  errorUrl.searchParams.set("next", `${next.pathname}${next.search}${next.hash}`)
  const response = NextResponse.redirect(errorUrl)
  response.headers.set("Cache-Control", "private, no-store")
  return response
}
