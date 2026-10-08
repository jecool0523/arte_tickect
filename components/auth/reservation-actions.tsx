"use client"

import { useEffect, useRef, useState } from "react"
import * as AlertDialog from "@radix-ui/react-alert-dialog"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useBookingDrafts } from "@/components/booking-draft-provider"
import { createEmptyBookingDraft } from "@/lib/booking-draft"
import { isTicketReady, reservationTicketPath, type Reservation } from "@/lib/reservations"

export default function ReservationActions({ reservation, showTicketLink = false }: { reservation: Reservation; showTicketLink?: boolean }) {
  const [status, setStatus] = useState(reservation.status)
  const [action, setAction] = useState<"cancel" | "rebook" | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const returnFocus = useRef<HTMLButtonElement | null>(null)
  const router = useRouter()
  const { hydrated, updateDraft, getCompletion, clearCompletion } = useBookingDrafts()
  useEffect(() => { setStatus(reservation.status) }, [reservation.status])
  const active = isTicketReady(status)
  const cancelled = ["cancelled", "canceled"].includes(status.toLowerCase())
  const canRebook = reservation.sourceId !== "legacy" && (active || cancelled)
  const execute = async () => {
    if (!action || busy || !hydrated) return
    setBusy(true)
    setError("")
    setNotice("")
    try {
      const response = await fetch(`/api/profile/bookings/${reservation.sourceId}/${reservation.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "예약을 변경하지 못했습니다.")
      setStatus("cancelled")
      setAction(null)
      if (reservation.sourceId !== "legacy" && getCompletion(reservation.sourceId)?.ticket.bookingId === reservation.id) clearCompletion(reservation.sourceId)
      window.dispatchEvent(new Event("arte-fan-activity-changed"))
      if (action === "rebook" && data.rebooking?.musicalId === reservation.sourceId) {
        // Seats and old access permission are never copied; the live booking flow rechecks both.
        updateDraft(reservation.sourceId, { ...createEmptyBookingDraft(reservation.sourceId), name: data.rebooking.name, studentId: data.rebooking.studentId })
        router.push(`/performances/${reservation.sourceId}/booking`)
      } else setNotice("예매를 취소했습니다. 취소 내역은 목록에 남습니다.")
      router.refresh()
    } catch (failure) { setError(failure instanceof Error ? failure.message : "처리 결과를 확인하지 못했습니다. 예약 내역을 새로고침해주세요.") }
    finally { setBusy(false) }
  }
  return <div className="mt-4 space-y-3">
    {showTicketLink && active && <Button asChild className="h-11 w-full bg-purple-600 text-white hover:bg-purple-700"><Link href={reservationTicketPath(reservation.sourceId, reservation.id)} prefetch={false}>내 티켓 확인하기</Link></Button>}
    <div className="flex flex-wrap gap-2">
      {active && <Button variant="outline" className="h-11 border-red-200 text-red-700 hover:bg-red-50" disabled={busy || !hydrated} onClick={event => { returnFocus.current = event.currentTarget; setError(""); setAction("cancel") }}>예매 취소</Button>}
      {canRebook && <Button variant="outline" className="h-11 border-purple-200 text-purple-700 hover:bg-purple-50" disabled={busy || !hydrated} onClick={event => { returnFocus.current = event.currentTarget; setError(""); setAction("rebook") }}>{active ? "취소 후 재예매" : "재예매"}</Button>}
      {cancelled && reservation.sourceId === "legacy" && <Button asChild variant="outline" className="h-11"><Link href="/performances">새 공연 둘러보기</Link></Button>}
    </div>
    {notice && <p role="status" className="text-sm leading-6 text-purple-700">{notice}</p>}
    {!action && error && <div role="alert" className="space-y-2"><p className="text-sm text-red-600">{error}</p><Button variant="outline" onClick={() => router.refresh()}>예약 내역 새로고침</Button></div>}
    <AlertDialog.Root open={action !== null} onOpenChange={open => { if (!open && !busy) setAction(null) }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-gray-950/50 backdrop-blur-sm" />
        <AlertDialog.Content onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus() }} className="fixed left-1/2 top-1/2 z-[60] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl outline-none sm:p-6">
          <AlertDialog.Title className="text-xl font-bold">{action === "rebook" ? active ? "취소 후 다시 예매할까요?" : "다시 예매할까요?" : "예매를 취소할까요?"}</AlertDialog.Title>
          <AlertDialog.Description className="mt-3 text-base leading-6 text-gray-600">
            {action === "rebook" ? `${active ? "기존 예약을 취소한 뒤 " : ""}새 예매를 시작합니다. 이름·학번만 채워드리며 좌석은 다시 선택해야 합니다. 작성 중인 예매 정보는 새로 시작하며, 기존 좌석은 보장되지 않습니다. 새 예매를 완료해야 티켓이 발급됩니다.` : "선택한 예약의 모든 좌석을 취소합니다. 취소하면 티켓은 사용할 수 없고, 해당 좌석은 다른 사람이 예매할 수 있습니다."}
          </AlertDialog.Description>
          <p className="mt-4 break-words rounded-lg bg-gray-50 p-3 text-sm leading-6">{reservation.musicalTitle} · {reservation.seat_grade}<br />{reservation.selected_seats.join(", ")}</p>
          {action === "rebook" && active && <p className="mt-3 text-sm leading-6 text-gray-600">현재 예매 기간과 권한을 확인할 수 없거나 재예매가 불가능하면 기존 예약을 취소하지 않습니다.</p>}
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild><Button variant="outline" className="h-11" disabled={busy}>돌아가기</Button></AlertDialog.Cancel>
            <Button className={`h-11 text-white ${action === "cancel" ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"}`} disabled={busy || !hydrated} onClick={() => void execute()}>{busy ? "처리 중…" : action === "rebook" ? active ? "취소하고 재예매하기" : "재예매 시작하기" : "예매 취소하기"}</Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  </div>
}
