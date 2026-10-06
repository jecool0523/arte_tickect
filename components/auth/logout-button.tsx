"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase"

export default function LogoutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const signOut = async () => {
    setPending(true)
    await getSupabaseBrowserClient().auth.signOut()
    router.replace("/")
    router.refresh()
  }

  return (
    <Button type="button" variant="outline" onClick={signOut} disabled={pending} className="h-11 w-full rounded-lg border-gray-300 bg-white text-gray-700 hover:bg-gray-100">
      <LogOut className="mr-2 h-4 w-4" />
      {pending ? "로그아웃 중..." : "로그아웃"}
    </Button>
  )
}
