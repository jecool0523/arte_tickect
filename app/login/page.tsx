import type { Metadata } from "next"
import { redirect } from "next/navigation"
import AccountPageShell from "@/components/auth/account-page-shell"
import LoginCard from "@/components/auth/login-card"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
import { isProfileComplete, safeProfileNext } from "@/lib/profile"

export const metadata: Metadata = {
  title: "로그인",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

function safeNextPath(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value[0] : value
  return safeProfileNext(path)
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; error?: string }> }) {
  const params = await searchParams
  const next = safeNextPath(params.next)
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile, error } = await supabase.from("profiles")
      .select("username, display_name, student_id, contact_number, profile_completed_at").eq("id", user.id).maybeSingle()
    if (error) throw new Error("Profile is temporarily unavailable")
    if (!isProfileComplete(profile) && new URL(next, "https://local.invalid").pathname !== "/profile") redirect(`/profile/setup?next=${encodeURIComponent(next)}`)
    redirect(next)
  }

  return (
    <AccountPageShell title="로그인">
      <LoginCard next={next} error={params.error} />
    </AccountPageShell>
  )
}
