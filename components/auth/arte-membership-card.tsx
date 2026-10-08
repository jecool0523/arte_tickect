"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { safeProfileNext } from "@/lib/profile"
import type { MembershipState } from "@/types/admin-membership"

export default function ArteMembershipCard({ initialState, nextPath }: { initialState?: MembershipState; nextPath?: string }) {
  const [state, setState] = useState<MembershipState | undefined>(initialState)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const refresh = useCallback(async () => {
    setPending(true)
    setError("")
    try {
      const response = await fetch("/api/profile/arte-membership", { cache: "no-store" })
      const data = await response.json()
      if (!response.ok || !data.state) throw new Error(data.error || "승인 상태를 확인하지 못했습니다.")
      setState(data.state)
      if (data.state.status === "admin") router.refresh()
    } catch (failure) { setError(failure instanceof Error ? failure.message : "잠시 후 다시 시도해주세요.") }
    finally { setPending(false) }
  }, [router])
  useEffect(() => { if (!initialState) void refresh() }, [initialState, refresh])

  const answer = async (isMember: boolean) => {
    if (pending) return
    setPending(true)
    setError("")
    try {
      const response = await fetch("/api/profile/arte-membership", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isMember }),
      })
      const data = await response.json()
      if (!response.ok || !data.state) throw new Error(data.error || "승인 요청을 저장하지 못했습니다.")
      setState(data.state)
      // Onboarding preserves the originally requested booking destination.
      if (nextPath) { router.replace(safeProfileNext(nextPath)); router.refresh() }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "잠시 후 다시 시도해주세요.") }
    finally { setPending(false) }
  }

  if (!error && (!state || !state.eligible)) return null
  const asking = state?.status === "unanswered"
  return (
    <Card className="border-purple-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-purple-600" aria-hidden="true" />{asking ? "아르떼 부원인가요?" : "아르떼 부원 승인"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {asking && <>
          <p className="text-sm leading-6 text-gray-600">부원이 맞다면 승인 요청을 보내주세요. 기존 관리자가 본인 확인 후 승인하면 공연 관리 권한과 공연별 선예매 2장을 받을 수 있어요. 승인 전에는 일반 계정으로 이용해요.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button disabled={pending} onClick={() => void answer(true)} className="h-11 bg-purple-600 text-white hover:bg-purple-700">{pending ? "처리 중…" : "네, 승인 요청하기"}</Button>
            <Button disabled={pending} onClick={() => void answer(false)} variant="outline" className="h-11">아니요</Button>
          </div>
        </>}
        {state?.status === "declined" && <>
          <p className="text-sm leading-6 text-gray-600">부원이 아니라는 응답을 저장했어요. 나중에 부원으로 확인되면 승인 요청을 보낼 수 있어요.</p>
          <Button disabled={pending} onClick={() => void answer(true)} variant="outline" className="h-11">부원 승인 요청하기</Button>
        </>}
        {state?.status === "pending" && <>
          <p role="status" className="text-sm leading-6 text-gray-600">관리자 승인 대기 중입니다. 승인 전에는 공연 관리 권한이 부여되지 않아요.</p>
          <Button disabled={pending} onClick={() => void refresh()} variant="outline" className="h-11">승인 상태 새로고침</Button>
        </>}
        {state?.status === "rejected" && <p className="text-sm leading-6 text-gray-600">승인 요청이 거절되었습니다. 부원 정보 확인이 필요하면 운영자에게 문의해주세요.</p>}
        {state?.status === "approved" && <p className="text-sm leading-6 text-gray-600">승인 내역이 있지만 현재 관리자 권한이 없습니다. 운영자에게 문의해주세요.</p>}
        {error && <div role="alert" className="space-y-2"><p className="text-sm text-red-600">{error}</p><Button disabled={pending} variant="outline" onClick={() => void refresh()}>다시 확인하기</Button></div>}
        {nextPath && <Button disabled={pending} variant="ghost" onClick={() => { router.replace(safeProfileNext(nextPath)); router.refresh() }}>나중에 확인하고 계속하기</Button>}
      </CardContent>
    </Card>
  )
}
