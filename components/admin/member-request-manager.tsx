"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AdminMembershipRequest } from "@/types/admin-membership"

export default function MemberRequestManager() {
  const [requests, setRequests] = useState<AdminMembershipRequest[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({})
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const refresh = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/admin/member-requests", { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "승인 요청을 불러오지 못했습니다.")
      setRequests(data.requests)
      setTotal(data.total)
      // A refreshed request must be checked again before approval.
      setConfirmed({})
    } catch (failure) { setError(failure instanceof Error ? failure.message : "잠시 후 다시 시도해주세요.") }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  const review = async (row: AdminMembershipRequest, approve: boolean) => {
    if (busy || (approve && (!confirmed[row.id] || !row.profileUnchanged))) return
    if (!window.confirm(approve ? `${row.displayName} (${row.email}) 계정에 관리자 권한과 공연별 선예매 2장을 부여할까요?` : `${row.displayName}의 승인 요청을 거절할까요?`)) return
    setBusy(row.id)
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/admin/member-requests", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: row.id, approve, identityConfirmed: confirmed[row.id] === true }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "요청을 처리하지 못했습니다.")
      setNotice(approve ? "승인 완료. 관리자 권한과 공연별 선예매 2장을 부여했습니다." : "요청을 거절했습니다.")
      await refresh()
    } catch (failure) { setError(failure instanceof Error ? failure.message : "잠시 후 다시 시도해주세요.") }
    finally { setBusy(null) }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-900">부원 승인 요청 {total}건</h2><Button variant="outline" disabled={loading || !!busy} onClick={() => void refresh()}>새로고침</Button></div>
      <p className="text-sm leading-6 text-slate-600">명단 일치만으로 본인을 확인할 수 없습니다. 실제 부원에게 로그인 이메일을 확인한 뒤 승인해주세요. 승인하면 기존 관리자 권한과 공연별 선예매 2장을 받습니다.</p>
      {notice && <p role="status" className="rounded-lg bg-purple-50 p-3 text-sm text-purple-700">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p role="status" className="py-8 text-sm text-slate-500">요청을 불러오는 중…</p> : !error && requests.length === 0 ? <p className="py-8 text-sm text-slate-500">대기 중인 승인 요청이 없습니다.</p> : requests.map(row => (
        <Card key={row.id} className="border-slate-200 bg-white">
          <CardHeader><CardTitle className="text-base">{row.displayName} · {row.studentId}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="break-all text-sm text-slate-600">로그인 이메일: {row.email}</p>
            <p className="text-xs text-slate-500">요청일: {new Date(row.requestedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
            {row.manualStudentCheck && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">명단에 학번이 없는 부원입니다. 이름이 같은 다른 사람일 수 있으니 별도로 본인을 확인해주세요.</p>}
            {!row.profileUnchanged && <p role="status" className="text-sm text-red-600">요청 이후 계정 정보가 변경되어 승인할 수 없습니다. 운영자에게 확인 후 거절 처리해주세요.</p>}
            {row.alreadyAdmin && <p className="text-sm text-slate-500">이미 관리자 권한이 있는 계정입니다.</p>}
            <label className="flex items-start gap-2 text-sm leading-6 text-slate-700">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-purple-600" checked={confirmed[row.id] === true} disabled={!!busy || loading || !row.profileUnchanged} onChange={event => setConfirmed(current => ({ ...current, [row.id]: event.target.checked }))} />
              로그인 이메일과 실제 부원 정보를 확인했습니다.
            </label>
            <div className="flex gap-2">
              <Button className="h-11 bg-purple-600 text-white hover:bg-purple-700" disabled={!!busy || loading || !confirmed[row.id] || !row.profileUnchanged} onClick={() => void review(row, true)}>승인</Button>
              <Button variant="outline" className="h-11" disabled={!!busy || loading} onClick={() => void review(row, false)}>거절</Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {total > requests.length && !loading && <p className="text-sm text-slate-500">오래된 요청부터 최대 100건을 표시합니다. 처리 후 새로고침하면 다음 요청을 확인할 수 있어요.</p>}
    </div>
  )
}
