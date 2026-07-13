"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, Check, MapPin, Minimize2, RotateCcw, Theater, X, ZoomIn, ZoomOut } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FLOOR_OPTIONS,
  getSeatDisplayLabel,
  getSeatRows,
  getSeatSectionsByFloor,
  type SeatCell,
} from "@/lib/seat-map"
import { FLOOR_1, type SeatFloor } from "@/lib/musical-config"
import type { SeatGrade } from "@/types/musical"

interface SeatSelectionWindowProps {
  seatGrades: SeatGrade[]
  selectedSeats: string[]
  onSeatClick: (seatId: string, grade: string) => void
  unavailableSeats: Record<string, Record<string, string[]>>
  statistics: {
    total_bookings: number
    total_seats_booked: number
    unique_students: number
  }
  connectionStatus: "connected" | "demo" | "error"
  selectedSeatGrade: string
  onBack: () => void
  onConfirm: () => void
  musicalTitle: string
}

type SeatStatus = "available" | "selected" | "unavailable"

const zoomPresets = [0.5, 0.6, 0.7, 0.8, 1, 1.2]

export default function SeatSelectionWindow({
  seatGrades,
  selectedSeats,
  onSeatClick,
  unavailableSeats,
  statistics,
  connectionStatus,
  selectedSeatGrade,
  onBack,
  onConfirm,
  musicalTitle,
}: SeatSelectionWindowProps) {
  const [selectedFloor, setSelectedFloor] = useState<SeatFloor>(FLOOR_1)
  const [zoomLevel, setZoomLevel] = useState(0.7)
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const frame = window.requestAnimationFrame(() => {
      scrollContainer.scrollLeft = Math.max(0, (scrollContainer.scrollWidth - scrollContainer.clientWidth) / 2)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [selectedFloor, zoomLevel])

  const getGradeInfo = (grade: string) => seatGrades.find((seatGrade) => seatGrade.grade === grade)

  const getSeatStatus = (seat: SeatCell): SeatStatus => {
    if (unavailableSeats[seat.floor]?.[seat.grade]?.includes(seat.id)) return "unavailable"
    if (selectedSeats.includes(seat.id)) return "selected"
    return "available"
  }

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(Math.max(0.5, Math.min(1.2, newZoom)))
    setIsZoomMenuOpen(false)
  }

  const renderSeat = (seat: SeatCell) => {
    const status = getSeatStatus(seat)
    const gradeInfo = getGradeInfo(seat.grade)
    const availableClass = gradeInfo?.color ?? "bg-gray-100 border-gray-300"

    return (
      <button
        key={seat.id}
        type="button"
        title={`${seat.label} - ${status === "unavailable" ? "예매 완료" : status === "selected" ? "선택됨" : "선택 가능"}`}
        onClick={() => status === "available" && onSeatClick(seat.id, seat.grade)}
        disabled={status === "unavailable"}
        className={`h-8 w-8 shrink-0 rounded-md border-2 text-xs font-bold transition-all ${
          status === "selected"
            ? "scale-110 border-purple-600 bg-purple-500 text-white shadow-lg"
            : status === "unavailable"
              ? "cursor-not-allowed border-gray-400 bg-gray-300 text-gray-500 opacity-60"
              : `${availableClass} cursor-pointer text-gray-700 shadow-sm hover:scale-110 hover:shadow-md`
        }`}
      >
        {seat.seatNumber}
      </button>
    )
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-gray-50">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between p-3">
          <Button onClick={onBack} variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-900" />
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="text-base font-bold text-gray-900">좌석 선택</h1>
            <p className="truncate text-xs text-gray-600">{musicalTitle}</p>
          </div>
          <div className="w-9" />
        </div>

        <div className="px-3 pb-2">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5 text-xs">
            <div className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${connectionStatus === "connected" ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-gray-600">{connectionStatus === "connected" ? "실시간" : "오프라인"}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-700">
                <strong>{statistics.total_bookings}</strong> 예매
              </span>
              <span className="text-blue-600">
                <strong>{statistics.total_seats_booked}</strong> 좌석
              </span>
              <span className="text-green-600">
                <strong>{statistics.unique_students}</strong> 명
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          <div className="shrink-0 border-b border-gray-200 bg-white px-3 py-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-100 p-0.5">
                {FLOOR_OPTIONS.map((floor) => (
                  <button
                    key={floor.id}
                    type="button"
                    onClick={() => setSelectedFloor(floor.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                      selectedFloor === floor.id ? "bg-purple-600 text-white shadow-md" : "text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {floor.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => handleZoomChange(zoomLevel - 0.1)} className="h-7 w-7 p-0">
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsZoomMenuOpen((value) => !value)}
                    className="min-w-[50px] rounded border border-gray-200 bg-gray-100 px-2 py-1 text-center text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </button>
                  {isZoomMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-1 min-w-[80px] rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                      {zoomPresets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleZoomChange(preset)}
                          className="w-full rounded px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100"
                        >
                          {Math.round(preset * 100)}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleZoomChange(zoomLevel + 0.1)} className="h-7 w-7 p-0">
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleZoomChange(0.7)} className="h-7 w-7 p-0">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleZoomChange(zoomLevel === 1 ? 0.7 : 1)} className="h-7 w-7 p-0">
                  <Minimize2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex justify-center gap-3 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <span className="h-3.5 w-3.5 rounded border-2 border-gray-300 bg-gray-100" />
                선택 가능
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3.5 w-3.5 rounded border-2 border-purple-600 bg-purple-500" />
                선택됨
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3.5 w-3.5 rounded border-2 border-gray-400 bg-gray-300 opacity-60" />
                예매 완료
              </span>
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            data-testid="seat-map-scroll"
            className="flex-1 touch-pan-x touch-pan-y overflow-auto overscroll-contain px-3 py-3"
          >
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "top left",
                width: `${100 / zoomLevel}%`,
                minHeight: `${100 / zoomLevel}%`,
              }}
            >
              <div className="mb-6 flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-2 text-white shadow-lg">
                  <Theater className="h-4 w-4" />
                  <span className="text-sm font-bold">무대</span>
                  <Theater className="h-4 w-4" />
                </div>
              </div>

              <div className="flex flex-col items-start gap-10">
                {getSeatSectionsByFloor(selectedFloor).map((section) => {
                  const gradeInfo = getGradeInfo(section.grade)

                  return (
                    <section key={section.id} className="w-fit min-w-fit rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm">
                      <div className="sticky left-0 z-10 mb-4 flex items-center gap-3 border-b border-gray-200 bg-white pb-2">
                        <div className={`h-6 w-6 rounded border-2 ${gradeInfo?.color ?? "bg-gray-100 border-gray-300"}`} />
                        <div>
                          <h2 className="text-base font-bold text-gray-900">
                            {section.floor} - {section.title}
                          </h2>
                          <p className="text-xs text-gray-600">{gradeInfo?.description}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {getSeatRows(section).map(({ row, areas }) => (
                          <div key={row} className="flex items-center gap-1">
                            <div className="w-12 shrink-0 text-center text-xs font-bold text-gray-600">{row}열</div>
                            {areas.map(({ area, seats }, index) => (
                              <div key={area.id} className="flex items-center gap-1">
                                {index > 0 && <div className="mx-3 h-8 w-1 rounded-full bg-gray-300" />}
                                {seats.map(renderSeat)}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="shrink-0 border-t border-gray-200 bg-white shadow-lg">
        {selectedSeats.length > 0 && (
          <div className="border-b border-purple-200 bg-purple-50 px-3 py-2.5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-purple-600" />
                <span className="text-xs font-semibold text-purple-800">선택된 좌석 ({selectedSeats.length}매)</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectedSeats.forEach((seat) => onSeatClick(seat, selectedSeatGrade))}
                className="h-auto p-1 text-xs text-purple-600 hover:text-purple-700"
              >
                <X className="mr-1 h-3 w-3" />
                전체 해제
              </Button>
            </div>
            <div className="flex max-h-16 flex-wrap gap-1 overflow-y-auto">
              {selectedSeats.map((seatId) => (
                <Badge key={seatId} className="bg-purple-600 px-1.5 py-0.5 text-xs text-white">
                  {getSeatDisplayLabel(seatId)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 p-3">
          <div className="flex gap-2">
            <Button onClick={onBack} variant="outline" className="flex-1 border-gray-300 bg-transparent py-5 text-sm font-semibold text-gray-700">
              이전
            </Button>
            <Button onClick={onConfirm} disabled={selectedSeats.length === 0} className="flex-1 bg-purple-600 py-5 text-sm font-semibold text-white hover:bg-purple-700">
              <Check className="mr-1.5 h-4 w-4" />
              좌석 선택 완료 ({selectedSeats.length}매)
            </Button>
          </div>
          <div className="rounded-lg border border-purple-200 bg-purple-50 py-3 text-center">
            <p className="font-serif text-3xl font-bold leading-5 text-purple-700">ARTE</p>
          </div>
        </div>
      </footer>

      {isZoomMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setIsZoomMenuOpen(false)} />}
    </div>
  )
}
