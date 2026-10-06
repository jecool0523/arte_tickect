import Link from "next/link"
import { ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import OAuthLoginButton from "@/components/auth/oauth-login-button"

// Reuse the existing Google-only login UI inside the profile destination.
export default function LoginCard({ next, error }: { next: string; error?: string }) {
  return (
    <Card className="mx-auto mt-6 max-w-md border-gray-200 bg-white shadow-sm sm:mt-10">
      <CardHeader className="items-center pb-4 text-center">
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-700"><ShieldCheck className="h-7 w-7" /></div>
        <CardTitle className="text-lg">ARTE 로그인</CardTitle>
        <p className="pt-1 text-base leading-6 text-gray-600">로그인하고 내 티켓을 한곳에서 확인하세요.</p>
      </CardHeader>
      <CardContent>
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">로그인을 완료하지 못했습니다. 다시 시도해주세요.</p>}
        <OAuthLoginButton next={next} />
        <Link href="/" className="mt-5 block text-center text-sm font-medium text-purple-600 hover:text-purple-700">홈으로 돌아가기</Link>
      </CardContent>
    </Card>
  )
}
