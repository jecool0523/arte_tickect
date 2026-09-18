"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function SyncProfileButton() {
  const { toast } = useToast()
  const [pending, setPending] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

  const handleSync = async () => {
    setPending(true)
    try {
      const response = await fetch("/api/profile/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await response.json()

      if (!response.ok) {
        toast({ title: "동기화 실패", description: data.error || "프로필 동기화에 실패했습니다.", variant: "destructive" })
        return
      }

      if (data.synced) {
        toast({ title: "동기화 완료", description: "Google 계정 정보로 프로필이 업데이트되었습니다." })
        setLastSynced(new Date())
      } else {
        toast({ title: "변경 사항 없음", description: data.message || "동기화할 새 정보가 없습니다." })
      }
    } catch {
      toast({ title: "동기화 실패", description: "잠시 후 다시 시도해주세요.", variant: "destructive" })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        onClick={handleSync}
        disabled={pending}
        className="w-full gap-2"
      >
        <RefreshCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        {pending ? "동기화 중..." : "Google 계정과 동기화"}
      </Button>

      {lastSynced && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          마지막 동기화: {lastSynced.toLocaleTimeString("ko-KR")}
        </p>
      )}
    </div>
  )
}