import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import OAuthLoginButton from "@/components/auth/oauth-login-button"
import { createAuthServerClient } from "@/lib/server/supabase-auth"

export const metadata: Metadata = {
  title: "로그인",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

function safeNextPath(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value[0] : value
  return path?.startsWith("/") && !path.startsWith("//") ? path : "/profile"
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; error?: string }> }) {
  const params = await searchParams
  const next = safeNextPath(params.next)
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect(next)

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-purple-50 to-white px-4 py-10">
      <section className="w-full max-w-sm rounded-2xl border border-purple-100 bg-white p-6 shadow-xl shadow-purple-100/60">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
            <ShieldCheck className="h-6 w-6 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ARTE 로그인</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">로그인하면 예매가 계정에 안전하게 연결되고 내 티켓을 한곳에서 확인할 수 있습니다.</p>
        </div>

        {params.error && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            로그인을 완료하지 못했습니다. 다시 시도해주세요.
          </p>
        )}

        <OAuthLoginButton next={next} />
        <p className="mt-5 text-center text-xs leading-5 text-gray-500">로그인하면 서비스 운영에 필요한 이메일, 이름, 프로필 이미지를 Supabase Auth에 저장하는 데 동의하게 됩니다.</p>
        <Link href="/" className="mt-5 block text-center text-sm font-medium text-purple-600 hover:text-purple-700">홈으로 돌아가기</Link>
      </section>
    </main>
  )
}
