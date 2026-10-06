"use client"

import { useState } from "react"
import { LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase"

function safeNextPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/profile"
}

export default function OAuthLoginButton({ next = "/profile" }: { next?: string }) {
  const [pending, setPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const signIn = async () => {
    setPending(true)
    setErrorMessage(null)

    const callbackUrl = new URL("/auth/callback", window.location.origin)
    callbackUrl.searchParams.set("next", safeNextPath(next))

    const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    })

    if (error) {
      setErrorMessage("Google 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.")
      setPending(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={signIn}
        disabled={pending}
        className="h-11 w-full rounded-lg bg-purple-600 font-semibold text-white shadow-sm hover:bg-purple-700"
      >
        <LogIn className="mr-2 h-5 w-5" />
        {pending ? "Google로 이동 중..." : "Google로 계속하기"}
      </Button>
      {errorMessage && <p role="alert" className="text-sm text-red-600">{errorMessage}</p>}
    </div>
  )
}
