import { type NextRequest, NextResponse } from "next/server"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
import { syncProfileFromAuth } from "@/lib/server/sync-profile"
import { getSiteOrigin } from "@/lib/site-url"
import { isProfileComplete } from "@/lib/profile"
import { syncLegacyBookings } from "@/lib/server/profile-onboarding"

function safeNextUrl(request: NextRequest) {
  const origin = getSiteOrigin(request.nextUrl.origin)
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

      const { data: profile } = await supabase.from("profiles")
        .select("username, display_name, student_id, contact_number, profile_completed_at").eq("id", data.user.id).maybeSingle()
      if (!isProfileComplete(profile)) {
        const setup = new URL("/profile/setup", next.origin)
        setup.searchParams.set("next", `${next.pathname}${next.search}${next.hash}`)
        const response = NextResponse.redirect(setup)
        response.headers.set("Cache-Control", "private, no-store")
        return response
      }
      await syncLegacyBookings(data.user.id)

      const response = NextResponse.redirect(next)
      response.headers.set("Cache-Control", "private, no-store")
      return response
    }
  }

  const errorUrl = new URL("/login", getSiteOrigin(request.nextUrl.origin))
  errorUrl.searchParams.set("error", "oauth_callback_failed")
  errorUrl.searchParams.set("next", `${next.pathname}${next.search}${next.hash}`)
  const response = NextResponse.redirect(errorUrl)
  response.headers.set("Cache-Control", "private, no-store")
  return response
}
