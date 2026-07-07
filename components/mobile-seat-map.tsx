"use client"

import { useState } from "react"
import { Database, RotateCcw, Theater, ZoomIn, ZoomOut } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  FLOOR_OPTIONS,
  getSeatDisplayLabel,
  getSeatRows,
  getSeatSectionsByFloor,
  type SeatCell,
} from "@/lib/seat-map"
import { FLOOR_1, type SeatFloor } from "@/lib/musical-config"
import type { SeatGrade } from "@/types/musical"

interface MobileSeatMapProps {
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
}

export default function MobileSeatMap({
  seatGrades,
  selectedSeats,
  onSeatClick,
  unavailableSeats,
  statistics,
  connectionStatus,
  selectedSeatGrade,
}: MobileSeatMapProps) {
  const [selectedFloor, setSelectedFloor] = useState<SeatFloor>(FLOOR_1)
  const [zoomLevel, setZoomLevel] = useState(0.8)

  const getGradeInfo = (grade: string) => seatGrades.find((seatGrade) => seatGrade.grade === grade)

  const getSeatStatus = (seat: SeatCell) => {
    if (unavailableSeats[seat.floor]?.[seat.grade]?.includes(seat.id)) return "unavailable"
    if (selectedSeats.includes(seat.id)) return "selected"
    return "available"
  }

  const renderSeat = (seat: SeatCell) => {
    const status = getSeatStatus(seat)
    const gradeInfo = getGradeInfo(seat.grade)

    return (
      <button
        key={seat.id}
        type="button"
        title={seat.label}
        onClick={() => status === "available" && onSeatClick(seat.id, seat.grade)}
        disabled={status === "unavailable"}
        className={`h-7 w-7 shrink-0 rounded border-2 text-xs font-bold transition-all ${
          status === "selected"
            ? "scale-110 border-purple-600 bg-purple-500 text-white shadow-lg"
            : status === "unavailable"
              ? "cursor-not-allowed border-gray-400 bg-gray-300 text-gray-500"
              : `${gradeInfo?.color ?? "bg-gray-100 border-gray-300"} cursor-pointer text-gray-700 active:scale-95`
        }`}
      >
        {seat.seatNumber}
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border border-gray-200 bg-white">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-gray-700" />
              <span className="text-sm font-semibold text-gray-900">예매 현황</span>
              <div className={`h-2 w-2 rounded-full ${connectionStatus === "connected" ? "bg-green-500" : "bg-red-500"}`} />
            </div>
            <span className="text-xs text-gray-500">{connectionStatus === "connected" ? "실시간" : "오프라인"}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-gray-50 p-2">
              <p className="text-lg font-bold text-gray-900">{statistics.total_bookings}</p>
              <p className="text-xs text-gray-500">총 예매</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2">
              <p className="text-lg font-bold text-blue-600">{statistics.total_seats_booked}</p>
              <p className="text-xs text-gray-500">예매 좌석</p>
            </div>
            <div className="rounded-lg bg-green-50 p-2">
              <p className="text-lg font-bold text-green-600">{statistics.unique_students}</p>
              <p className="text-xs text-gray-500">신청자</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedSeats.length > 0 && (
        <Card className="border border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Theater className="h-4 w-4 text-purple-600" />
              <span className="font-semibold text-purple-800">선택된 좌석 ({selectedSeats.length}매)</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedSeats.map((seatId) => (
                <Badge key={seatId} className="bg-purple-600 px-2 py-1 text-xs text-white">
                  {getSeatDisplayLabel(seatId)}
                  <button
                    type="button"
                    onClick={() => onSeatClick(seatId, selectedSeatGrade)}
                    className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-purple-700"
                  >
                    x
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="rounded-lg border border-gray-200 bg-gray-100 p-1">
          {FLOOR_OPTIONS.map((floor) => (
            <button
              key={floor.id}
              type="button"
              onClick={() => setSelectedFloor(floor.id)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                selectedFloor === floor.id ? "bg-purple-600 text-white shadow-md" : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              {floor.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-100 p-1">
          <Button size="sm" variant="outline" onClick={() => setZoomLevel(Math.max(0.6, zoomLevel - 0.1))} className="h-8 w-8 bg-white p-0">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="px-2 text-sm font-medium text-gray-700">{Math.round(zoomLevel * 100)}%</span>
          <Button size="sm" variant="outline" onClick={() => setZoomLevel(Math.min(1.2, zoomLevel + 0.1))} className="h-8 w-8 bg-white p-0">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setZoomLevel(0.8)} className="h-8 w-8 bg-white p-0">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border border-gray-200 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Theater className="h-5 w-5" />
            {selectedFloor} 좌석 선택
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-w-max space-y-4 overflow-x-auto rounded-xl bg-gray-50 p-4" style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left" }}>
            <div className="mb-6 text-center">
              <div className="inline-block rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-2 text-white shadow-lg">
                <span className="text-sm font-bold">무대</span>
              </div>
            </div>

            {getSeatSectionsByFloor(selectedFloor).map((section) => {
              const gradeInfo = getGradeInfo(section.grade)

              return (
                <section key={section.id} className={`rounded-xl border-2 p-3 ${gradeInfo?.color ?? "border-gray-200 bg-white"}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-900">
                      {section.title} ({section.grade})
                    </h4>
                    <span className="text-xs font-medium text-gray-700">{gradeInfo?.description}</span>
                  </div>
                  <div className="space-y-1">
                    {getSeatRows(section).map(({ row, areas }) => (
                      <div key={row} className="flex items-center justify-center gap-1">
                        <span className="mr-2 w-6 text-center text-xs font-bold text-gray-600">{row}</span>
                        {areas.map(({ area, seats }, index) => (
                          <div key={area.id} className="flex items-center gap-1">
                            {index > 0 && <div className="w-3" />}
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
        </CardContent>
      </Card>
    </div>
  )
}
