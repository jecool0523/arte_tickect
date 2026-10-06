import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import AccountPageShell from "@/components/auth/account-page-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import OAuthLoginButton from "@/components/auth/oauth-login-button"
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
    if (!isProfileComplete(profile)) redirect(`/profile/setup?next=${encodeURIComponent(next)}`)
    redirect(next)
  }

  return (
    <AccountPageShell title="로그인">
      <Card className="mx-auto mt-6 max-w-md border-gray-200 bg-white shadow-sm sm:mt-10">
        <CardHeader className="items-center pb-4 text-center">
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-700"><ShieldCheck className="h-7 w-7" /></div>
          <CardTitle className="text-lg">ARTE 로그인</CardTitle>
          <p className="pt-1 text-base leading-6 text-gray-600">로그인하고 내 티켓을 한곳에서 확인하세요.</p>
        </CardHeader>
        <CardContent>
        {params.error && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            로그인을 완료하지 못했습니다. 다시 시도해주세요.
          </p>
        )}

        <OAuthLoginButton next={next} />
        <p className="mt-5 text-sm leading-6 text-gray-500">이메일 도메인 제한 없이 로그인할 수 있어요. 처음 로그인하면 아이디·이름·학번·연락처를 입력하고 이전 예약을 연결합니다.</p>
        <Link href="/" className="mt-5 block text-center text-sm font-medium text-purple-600 hover:text-purple-700">홈으로 돌아가기</Link>
        </CardContent>
      </Card>
    </AccountPageShell>
  )
}
