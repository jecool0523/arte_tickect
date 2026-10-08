"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import SeatSelectionWindow from "@/components/seat-selection-window"
import { useBookingDrafts } from "@/components/booking-draft-provider"
import { useToast } from "@/hooks/use-toast"
import { createEmptyUnavailableSeats } from "@/lib/musical-config"
import type { MusicalInfo } from "@/types/musical"
import { MAX_BOOKING_SEATS } from "@/lib/security/validation"

export default function SeatSelectionRoutePage({ musical }: { musical: MusicalInfo }) {
  const router = useRouter()
  const { toast } = useToast()
  const { hydrated, getDraft, updateDraft } = useBookingDrafts()
  const draft = getDraft(musical.id)
  const guardShownRef = useRef(false)
  const [maxSelectableSeats, setMaxSelectableSeats] = useState(0)

  useEffect(() => {
    if (!hydrated || !draft.accessGranted) return
    let cancelled = false
    setMaxSelectableSeats(0)
    void (async () => {
      try {
        const response = await fetch(`/api/booking-period/${musical.id}`, { cache: "no-store" })
        const data = await response.json()
        if (cancelled) return
        if (!response.ok || !data.success) throw new Error("quota unavailable")
        if (!data.isOpen) { router.replace(`/performances/${musical.id}/booking`); return }
        setMaxSelectableSeats(data.presale && typeof data.presaleRemaining === "number"
          ? Math.min(MAX_BOOKING_SEATS, data.presaleRemaining) : MAX_BOOKING_SEATS)
      } catch {
        if (!cancelled) {
          toast({ title: "선택 한도 확인 실패", description: "예매 화면에서 다시 시도해주세요.", variant: "destructive" })
          router.replace(`/performances/${musical.id}/booking`)
        }
      }
    })()
    return () => { cancelled = true }
  }, [draft.accessGranted, hydrated, musical.id, router, toast])
  const [unavailableSeats, setUnavailableSeats] = useState<Record<string, Record<string, string[]>>>(createEmptyUnavailableSeats())
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "demo" | "error">("connected")
  const [statistics, setStatistics] = useState({ total_bookings: 0, total_seats_booked: 0, unique_students: 0 })

  useEffect(() => {
    if (!hydrated || draft.accessGranted) return
    if (!guardShownRef.current) {
      guardShownRef.current = true
      toast({ title: "예매 단계 확인", description: "예매 가능 여부를 먼저 확인해주세요." })
    }
    router.replace(`/performances/${musical.id}/booking`)
  }, [draft.accessGranted, hydrated, musical.id, router, toast])

  useEffect(() => {
    if (!hydrated || !draft.accessGranted) return
    let cancelled = false

    const loadSeatStatus = async () => {
      try {
        const response = await fetch(`/api/seats/${musical.id}?t=${Date.now()}`, { cache: "no-store" })
        if (!response.ok) throw new Error("seat status unavailable")
        const data = await response.json()
        if (cancelled) return
        setUnavailableSeats(data.unavailableSeats || createEmptyUnavailableSeats())
        setStatistics(data.statistics || { total_bookings: 0, total_seats_booked: 0, unique_students: 0 })
        setConnectionStatus(data.success && !data.needsSetup ? "connected" : "error")
      } catch {
        if (!cancelled) {
          setUnavailableSeats(createEmptyUnavailableSeats())
          setConnectionStatus("error")
        }
      }
    }

    void loadSeatStatus()
    const interval = window.setInterval(loadSeatStatus, 5000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [draft.accessGranted, hydrated, musical.id])

  if (!hydrated || !draft.accessGranted) {
    return <div className="flex min-h-[100dvh] items-center justify-center text-sm text-gray-500">예매 단계를 확인하고 있습니다.</div>
  }

  const handleSeatClick = (seatId: string, seatGrade: string) => {
    if (draft.seatGrade && draft.seatGrade !== seatGrade) {
      toast({ title: "좌석 등급 오류", description: "같은 등급의 좌석만 함께 선택할 수 있습니다.", variant: "destructive" })
      return
    }

    if (draft.selectedSeats.length >= maxSelectableSeats && !draft.selectedSeats.includes(seatId)) {
      toast({
        title: "선택 제한",
        description: maxSelectableSeats === 0 ? "선택 가능한 수량을 확인 중입니다." : `현재 최대 ${maxSelectableSeats}석까지 예매할 수 있습니다.`,
        variant: "destructive",
      })
      return
    }

    updateDraft(musical.id, (current) => {
      const removedIndex = current.selectedSeats.indexOf(seatId)
      if (removedIndex !== -1) {
        const selectedSeats = current.selectedSeats.filter((seat) => seat !== seatId)
        return { ...current, selectedSeats, seatGrade: selectedSeats.length ? current.seatGrade : "",
          attendees: current.attendees.filter((_, index) => index !== removedIndex) }
      }
      if ((current.seatGrade && current.seatGrade !== seatGrade) || current.selectedSeats.length >= maxSelectableSeats) return current
      return { ...current, selectedSeats: [...current.selectedSeats, seatId], seatGrade: current.seatGrade || seatGrade }
    })
  }

  const handleConfirm = () => {
    if (draft.selectedSeats.length > maxSelectableSeats) {
      toast({ title: "선택 제한", description: `현재 ${maxSelectableSeats}석까지 가능합니다. 선택 수량을 줄여주세요.`, variant: "destructive" })
      return
    }
    if (!draft.selectedSeats.length) {
      toast({ title: "좌석 미선택", description: "좌석을 선택해주세요.", variant: "destructive" })
      return
    }
    toast({ title: "좌석 선택 완료", description: `${draft.selectedSeats.length}개의 좌석을 선택했습니다.` })
    router.push(`/performances/${musical.id}/booking`)
  }

  return (
    <SeatSelectionWindow
      seatGrades={musical.seatGrades}
      selectedSeats={draft.selectedSeats}
      onSeatClick={handleSeatClick}
      onClearSeats={() => updateDraft(musical.id, (current) => ({
        ...current, selectedSeats: [], seatGrade: "", attendees: [], name: "", studentId: "", specialRequest: current.userMemo,
      }))}
      unavailableSeats={unavailableSeats}
      statistics={statistics}
      connectionStatus={connectionStatus}
      selectedSeatGrade={draft.seatGrade}
      onBack={() => router.push(`/performances/${musical.id}/booking`)}
      onConfirm={handleConfirm}
      musicalTitle={musical.title}
    />
  )
}
