"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CircleAlert, KeyRound, Loader2 } from "lucide-react"
import BookingForm from "@/components/booking-form"
import { useBookingDrafts } from "@/components/booking-draft-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import type { BookingAttendee } from "@/lib/booking-draft"
import type { MusicalInfo } from "@/types/musical"

type BookingStatus = "checking" | "open" | "closed" | "error"

type BookingPeriodResponse = {
  success?: boolean
  isOpen?: boolean
  code?: string
  message?: string
  error?: string
}

export default function BookingRoutePage({ musical }: { musical: MusicalInfo }) {
  const router = useRouter()
  const { toast } = useToast()
  const { hydrated, getDraft, updateDraft, clearDraft, setCompletion } = useBookingDrafts()
  const draft = getDraft(musical.id)
  const [status, setStatus] = useState<BookingStatus>("checking")
  const [blockMessage, setBlockMessage] = useState("현재는 일반 예매 기간이 아닙니다.")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValidatingPresaleKey, setIsValidatingPresaleKey] = useState(false)

  useEffect(() => {
    if (!hydrated) return
    let cancelled = false

    const checkBookingPeriod = async () => {
      setStatus("checking")
      try {
        const response = await fetch(`/api/booking-period/${musical.id}?t=${Date.now()}`, { cache: "no-store" })
        const data = (await response.json().catch(() => ({}))) as BookingPeriodResponse
        if (cancelled) return

        if (!response.ok || !data.success) {
          setStatus("error")
          setBlockMessage(data.error || data.message || "예매 기간을 확인할 수 없습니다.")
          return
        }

        if (data.isOpen) {
          updateDraft(musical.id, { accessGranted: true })
          setStatus("open")
          return
        }

        if (draft.presaleKey.trim()) {
          const presaleResponse = await fetch("/api/presale-keys/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
            cache: "no-store",
            body: JSON.stringify({ musicalId: musical.id, presaleKey: draft.presaleKey.trim() }),
          })
          const presaleData = (await presaleResponse.json().catch(() => ({}))) as {
            success?: boolean
            maxSeats?: number | null
          }

          if (presaleResponse.ok && presaleData.success) {
            updateDraft(musical.id, {
              accessGranted: true,
              presaleSeatLimit: typeof presaleData.maxSeats === "number" ? presaleData.maxSeats : null,
            })
            setStatus("open")
            return
          }
        }

        updateDraft(musical.id, { accessGranted: false })

        setBlockMessage(data.message || "현재는 일반 예매 기간이 아닙니다.")
        setStatus("closed")
      } catch {
        if (!cancelled) {
          setStatus("error")
          setBlockMessage("예매 기간을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.")
        }
      }
    }

    void checkBookingPeriod()
    return () => {
      cancelled = true
    }
  }, [draft.presaleKey, hydrated, musical.id, updateDraft])

  const handleInputChange = useCallback(
    (field: string, value: string | number | boolean) => updateDraft(musical.id, { [field]: value }),
    [musical.id, updateDraft],
  )

  const handleAttendeesChange = useCallback(
    (attendees: BookingAttendee[]) => updateDraft(musical.id, { attendees }),
    [musical.id, updateDraft],
  )

  const handleUsePresaleKey = async () => {
    if (!draft.presaleKey.trim()) {
      toast({ title: "예매 코드 필요", description: "전달받은 예매 코드를 입력해주세요.", variant: "destructive" })
      return
    }

    setIsValidatingPresaleKey(true)
    try {
      const response = await fetch("/api/presale-keys/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        cache: "no-store",
        body: JSON.stringify({ musicalId: musical.id, presaleKey: draft.presaleKey.trim() }),
      })
      const data = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string; maxSeats?: number | null }

      if (!response.ok || !data.success) {
        toast({ title: "예매 코드 확인 실패", description: data.error || "예매 코드를 확인할 수 없습니다.", variant: "destructive" })
        return
      }

      updateDraft(musical.id, {
        accessGranted: true,
        presaleKey: draft.presaleKey.trim(),
        presaleSeatLimit: typeof data.maxSeats === "number" ? data.maxSeats : null,
      })
      setStatus("open")
      toast({ title: "예매 코드 확인 완료", description: "예매를 계속 진행해주세요.", duration: 2200 })
    } catch {
      toast({ title: "예매 코드 확인 실패", description: "잠시 후 다시 시도해주세요.", variant: "destructive" })
    } finally {
      setIsValidatingPresaleKey(false)
    }
  }

  const handleBookingSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.selectedSeats.length || !draft.name || !draft.studentId) {
      toast({ title: "입력 오류", description: "필수 항목을 모두 입력해주세요.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/bookings/${musical.id}?t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        cache: "no-store",
        body: JSON.stringify({
          name: draft.name,
          studentId: draft.studentId,
          seatGrade: draft.seatGrade,
          selectedSeats: draft.selectedSeats,
          specialRequest: draft.specialRequest,
          presaleKey: draft.presaleKey.trim() || undefined,
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 409 && Array.isArray(data.conflictSeats)) {
          const conflicts = new Set<string>(data.conflictSeats)
          updateDraft(musical.id, (current) => ({
            ...current,
            selectedSeats: current.selectedSeats.filter((seat) => !conflicts.has(seat)),
            seatGrade: current.selectedSeats.some((seat) => !conflicts.has(seat)) ? current.seatGrade : "",
          }))
          toast({ title: "좌석 충돌", description: "이미 예매된 좌석을 선택에서 제외했습니다.", variant: "destructive" })
          router.push(`/performances/${musical.id}/booking/seats`)
          return
        }

        if (response.status === 403) {
          updateDraft(musical.id, { accessGranted: false })
          setBlockMessage(data.error || "현재는 예매 기간이 아닙니다.")
          setStatus("closed")
          toast({ title: "예매 불가", description: data.error || "현재는 예매 기간이 아닙니다.", variant: "destructive" })
          return
        }

        throw new Error(data.error || "예매 처리 중 오류가 발생했습니다.")
      }

      if (!data.success) throw new Error(data.error || "예매에 실패했습니다.")

      setCompletion(musical.id, {
        shareToken: typeof data.shareToken === "string" ? data.shareToken : null,
        ticket: {
          bookingId: data.bookingId,
          bookingDate: data.bookingDate,
          name: draft.name,
          studentId: draft.studentId,
          seatGrade: draft.seatGrade,
          selectedSeats: draft.selectedSeats,
          musicalTitle: musical.title,
          musicalDate: musical.date,
          musicalTime: musical.time,
          venue: musical.venue,
        },
      })
      clearDraft(musical.id)
      toast({ title: data.presale ? "사전예매 완료" : "예매 완료", description: data.message || "예매 신청이 완료되었습니다." })
      router.replace(`/performances/${musical.id}/booking/complete`)
    } catch (error) {
      toast({ title: "예매 실패", description: error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!hydrated || status === "checking") {
    return <BookingRouteState icon={<Loader2 className="h-10 w-10 animate-spin text-purple-600" />} title="예매 정보를 확인하고 있습니다." />
  }

  if (status === "error") {
    return (
      <BookingRouteState
        icon={<CircleAlert className="h-12 w-12 text-red-500" />}
        title="예매 정보를 불러오지 못했습니다."
        description={blockMessage}
        action={<Button onClick={() => window.location.reload()} className="bg-purple-600 text-white">다시 시도</Button>}
      />
    )
  }

  if (status === "closed") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white p-4">
        <Card className="w-full max-w-lg border border-gray-200 bg-white shadow-lg">
          <CardContent className="space-y-5 pt-6 text-center">
            <CircleAlert className="mx-auto h-14 w-14 text-red-500" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">현재는 일반 예매 기간이 아닙니다.</h1>
              <p className="mt-2 text-sm leading-6 text-gray-600">{blockMessage}</p>
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-left">
              <div className="mb-3 flex items-center gap-2 text-purple-700">
                <KeyRound className="h-4 w-4" />
                <span className="text-sm font-bold">예매 코드가 있다면?</span>
              </div>
              <Label htmlFor="presaleKey" className="text-xs text-gray-600">전달받은 예매 코드를 입력해주세요.</Label>
              <Input
                id="presaleKey"
                value={draft.presaleKey}
                onChange={(event) => updateDraft(musical.id, { presaleKey: event.target.value })}
                className="mt-2 border-purple-200 bg-white font-mono"
              />
              <Button onClick={handleUsePresaleKey} disabled={isValidatingPresaleKey} className="mt-3 w-full bg-purple-600 text-white">
                {isValidatingPresaleKey ? "예매 코드 확인 중..." : "예매 코드로 예매하기"}
              </Button>
            </div>
            <Button variant="outline" onClick={() => router.push(`/performances/${musical.id}`)} className="w-full">공연 정보로 돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <BookingForm
      musicalInfo={musical}
      bookingData={draft}
      selectedSeats={draft.selectedSeats}
      attendees={draft.attendees}
      userMemo={draft.userMemo}
      onInputChange={handleInputChange}
      onAttendeesChange={handleAttendeesChange}
      onUserMemoChange={(userMemo) => updateDraft(musical.id, { userMemo })}
      onNavigateToSeatSelection={() => router.push(`/performances/${musical.id}/booking/seats`)}
      onSubmit={handleBookingSubmit}
      onBack={() => router.push(`/performances/${musical.id}`)}
      isSubmitting={isSubmitting}
    />
  )
}

function BookingRouteState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md text-center">
        <div className="mb-4 flex justify-center">{icon}</div>
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  )
}
