"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function AccountDeleteButton() {
  const router = useRouter()
  const { toast } = useToast()
  const [pending, setPending] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    setPending(true)
    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE_MY_ACCOUNT" }),
      })
      const data = await response.json()

      if (!response.ok) {
        toast({ title: "탈퇴 실패", description: data.error || "계정 삭제에 실패했습니다.", variant: "destructive" })
        return
      }

      toast({ title: "탈퇴 완료", description: "계정이 완전히 삭제되었습니다." })
      router.replace("/")
      router.refresh()
    } catch {
      toast({ title: "탈퇴 실패", description: "잠시 후 다시 시도해주세요.", variant: "destructive" })
    } finally {
      setPending(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button
        variant="destructive"
        className="w-full"
        onClick={() => setShowConfirm(true)}
        disabled={pending}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {pending ? "탈퇴 처리 중..." : "계정 탈퇴하기"}
      </Button>

      {showConfirm && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">정말로 계정을 탈퇴하시겠습니까?</p>
              <p className="mt-1 text-sm text-red-700">
                이 작업은 되돌릴 수 없습니다. 예매 내역은 익명화되어 남지만, 개인정보(이름, 학번, 이메일)는 모두 삭제됩니다.
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={pending} className="flex-1">
                  취소
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={pending} className="flex-1">
                  <Loader2 className={pending ? "mr-2 h-4 w-4 animate-spin" : "hidden"} aria-hidden="true" />
                  탈퇴 확인
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}