"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Mail } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ResendConfirmationButton() {
  const { toast } = useToast()
  const [pending, setPending] = useState(false)

  const handleResend = async () => {
    setPending(true)
    try {
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await response.json()

      if (!response.ok) {
        toast({ title: "발송 실패", description: data.error || "인증 메일 발송에 실패했습니다.", variant: "destructive" })
        return
      }

      toast({ title: "발송 완료", description: "인증 메일을 다시 보냈습니다. 메일함을 확인해주세요." })
    } catch {
      toast({ title: "발송 실패", description: "잠시 후 다시 시도해주세요.", variant: "destructive" })
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleResend}
      disabled={pending}
      className="gap-1.5 h-8 px-3 text-xs"
    >
      <Mail className="h-3.5 w-3.5" />
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          발송 중...
        </>
      ) : (
        "인증 메일 재전송"
      )}
    </Button>
  )
}