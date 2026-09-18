import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import type { Database } from "@/types/supabase"

function getPublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !publishableKey) throw new Error("Supabase public environment variables are required.")
  return { url, publishableKey }
}

export async function refreshAuthSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { url, publishableKey } = getPublicEnv()

  const supabase = createServerClient<Database>(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, cacheHeaders) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          Object.entries(cacheHeaders).forEach(([name, value]) => response.headers.set(name, value))
        },
      },
    },
  )

  // getClaims validates the JWT signature and refreshes an expired session when possible.
  await supabase.auth.getClaims()
  return response
}
