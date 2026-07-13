"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import SeatSelectionWindow from "@/components/seat-selection-window"
import { useBookingDrafts } from "@/components/booking-draft-provider"
import { useToast } from "@/hooks/use-toast"
import { createEmptyUnavailableSeats } from "@/lib/musical-config"
import type { MusicalInfo } from "@/types/musical"

export default function SeatSelectionRoutePage({ musical }: { musical: MusicalInfo }) {
  const router = useRouter()
  const { toast } = useToast()
  const { hydrated, getDraft, updateDraft } = useBookingDrafts()
  const draft = getDraft(musical.id)
  const guardShownRef = useRef(false)
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

    const maxSelectableSeats = draft.presaleKey.trim() ? (draft.presaleSeatLimit ?? 100) : 100
    if (draft.selectedSeats.length >= maxSelectableSeats && !draft.selectedSeats.includes(seatId)) {
      toast({
        title: "선택 제한",
        description: maxSelectableSeats < 100 ? `이 예매 코드는 최대 ${maxSelectableSeats}석까지 예매할 수 있습니다.` : "최대 100개의 좌석까지 선택할 수 있습니다.",
        variant: "destructive",
      })
      return
    }

    if (draft.selectedSeats.includes(seatId)) {
      const selectedSeats = draft.selectedSeats.filter((seat) => seat !== seatId)
      updateDraft(musical.id, { selectedSeats, seatGrade: selectedSeats.length ? draft.seatGrade : "" })
      return
    }

    updateDraft(musical.id, { selectedSeats: [...draft.selectedSeats, seatId], seatGrade: draft.seatGrade || seatGrade })
  }

  const handleConfirm = () => {
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
