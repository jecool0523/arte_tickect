"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Theater, Check, X, ZoomIn, ZoomOut, RotateCcw, MapPin } from "lucide-react"
import { useState } from "react"
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
  const [selectedFloor, setSelectedFloor] = useState<"1층" | "2층">("1층")
  const [zoomLevel, setZoomLevel] = useState(1)

  // 좌석 상태 확인
  const getSeatStatus = (seatId: string, grade: string) => {
    const floorUnavailable = unavailableSeats[selectedFloor]
    if (floorUnavailable && floorUnavailable[grade] && floorUnavailable[grade].includes(seatId)) {
      return "unavailable"
    }
    if (selectedSeats.includes(seatId)) return "selected"
    return "available"
  }

  // 좌석 섹션 렌더링 (수평 스크롤용)
  const renderHorizontalSeatSection = (sectionName: string, rowStart: number, rowCount: number, grade: string) => {
    const gradeInfo = seatGrades.find((g) => g.grade === grade)
    if (!gradeInfo) return null

    const rows = []

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const rowNumber = rowStart + rowIndex
      const seatRow = []

      // 왼쪽 영역 (6석)
      for (let seatNum = 1; seatNum <= 6; seatNum++) {
        const seatId =
          selectedFloor === "1층"
            ? `1층-${sectionName === "앞블럭" ? "앞" : "뒤"}-${rowNumber}줄-왼쪽-${seatNum}번`
            : `2층-${rowNumber}줄-왼쪽-${seatNum}번`

        const status = getSeatStatus(seatId, grade)

        seatRow.push(
          <button
            key={seatId}
            onClick={() => status === "available" && onSeatClick(seatId, grade)}
            disabled={status === "unavailable"}
            className={`h-10 w-10 font-bold rounded-lg transition-all border-2 flex-shrink-0 ${
              status === "selected"
                ? "bg-purple-500 border-purple-600 text-white shadow-lg scale-105"
                : status === "unavailable"
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400 opacity-50"
                  : `${gradeInfo.color} cursor-pointer shadow-sm hover:scale-105 text-gray-700 hover:shadow-md border-gray-300`
            }`}
            title={`${seatId} (${status === "unavailable" ? "예매완료" : status === "selected" ? "선택됨" : "선택가능"})`}
          >
            {seatNum}
          </button>,
        )
      }

      // 통로
      seatRow.push(<div key={`aisle1-${rowNumber}`} className="w-4 flex-shrink-0"></div>)

      // 중앙 영역 (12석)
      for (let seatNum = 1; seatNum <= 12; seatNum++) {
        const seatId =
          selectedFloor === "1층"
            ? `1층-${sectionName === "앞블럭" ? "앞" : "뒤"}-${rowNumber}줄-중앙-${seatNum}번`
            : `2층-${rowNumber}줄-중앙-${seatNum}번`

        const status = getSeatStatus(seatId, grade)

        seatRow.push(
          <button
            key={seatId}
            onClick={() => status === "available" && onSeatClick(seatId, grade)}
            disabled={status === "unavailable"}
            className={`h-10 w-10 font-bold rounded-lg transition-all border-2 flex-shrink-0 ${
              status === "selected"
                ? "bg-purple-500 border-purple-600 text-white shadow-lg scale-105"
                : status === "unavailable"
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400 opacity-50"
                  : `${gradeInfo.color} cursor-pointer shadow-sm hover:scale-105 text-gray-700 hover:shadow-md border-gray-300`
            }`}
            title={`${seatId} (${status === "unavailable" ? "예매완료" : status === "selected" ? "선택됨" : "선택가능"})`}
          >
            {seatNum}
          </button>,
        )
      }

      // 통로
      seatRow.push(<div key={`aisle2-${rowNumber}`} className="w-4 flex-shrink-0"></div>)

      // 오른쪽 영역 (6석)
      for (let seatNum = 1; seatNum <= 6; seatNum++) {
        const seatId =
          selectedFloor === "1층"
            ? `1층-${sectionName === "앞블럭" ? "앞" : "뒤"}-${rowNumber}줄-오른쪽-${seatNum}번`
            : `2층-${rowNumber}줄-오른쪽-${seatNum}번`

        const status = getSeatStatus(seatId, grade)

        seatRow.push(
          <button
            key={seatId}
            onClick={() => status === "available" && onSeatClick(seatId, grade)}
            disabled={status === "unavailable"}
            className={`h-10 w-10 font-bold rounded-lg transition-all border-2 flex-shrink-0 ${
              status === "selected"
                ? "bg-purple-500 border-purple-600 text-white shadow-lg scale-105"
                : status === "unavailable"
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400 opacity-50"
                  : `${gradeInfo.color} cursor-pointer shadow-sm hover:scale-105 text-gray-700 hover:shadow-md border-gray-300`
            }`}
            title={`${seatId} (${status === "unavailable" ? "예매완료" : status === "selected" ? "선택됨" : "선택가능"})`}
          >
            {seatNum}
          </button>,
        )
      }

      rows.push(
        <div key={`row-${rowNumber}`} className="flex items-center gap-2 mb-2">
          <div className="w-12 text-center font-bold text-gray-600 text-sm flex-shrink-0">{rowNumber}줄</div>
          <div className="flex items-center gap-1">{seatRow}</div>
        </div>,
      )
    }

    return (
      <div
        className={`border-2 rounded-xl p-4 mb-4 ${gradeInfo.color.replace("bg-", "border-").replace("-100", "-300")} bg-white`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-6 h-6 rounded ${gradeInfo.color} border-2`}></div>
          <div>
            <h4 className="font-bold text-gray-900 text-base">
              {sectionName} - {grade}석
            </h4>
            <p className="text-sm text-gray-600">{gradeInfo.description}</p>
          </div>
        </div>
        <div className="space-y-2">{rows}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <Button onClick={onBack} variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-900" />
          </Button>
          <div className="text-center flex-1">
            <h1 className="text-lg font-bold text-gray-900">좌석 선택</h1>
            <p className="text-xs text-gray-600">{musicalTitle}</p>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Statistics Bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-xs bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${connectionStatus === "connected" ? "bg-green-500" : "bg-red-500"}`}
              ></div>
              <span className="text-gray-600">{connectionStatus === "connected" ? "실시간" : "오프라인"}</span>
            </div>
            <div className="flex gap-4">
              <span className="text-gray-700">
                <strong>{statistics.total_bookings}</strong> 예매
              </span>
              <span className="text-blue-600">
                <strong>{statistics.total_seats_booked}</strong> 좌석
              </span>
              <span className="text-green-600">
                <strong>{statistics.unique_students}</strong> 학생
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Horizontal Scroll */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Floor Selection & Controls */}
          <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 border border-gray-200">
                {(["1층", "2층"] as const).map((floor) => (
                  <button
                    key={floor}
                    onClick={() => setSelectedFloor(floor)}
                    className={`px-4 py-2 rounded-md font-semibold transition-all text-sm ${
                      selectedFloor === floor ? "bg-purple-600 text-white shadow-md" : "text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {floor}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 border border-gray-200">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setZoomLevel(Math.max(0.8, zoomLevel - 0.1))}
                  disabled={zoomLevel <= 0.8}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-2 text-gray-700 min-w-[50px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setZoomLevel(Math.min(1.5, zoomLevel + 0.1))}
                  disabled={zoomLevel >= 1.5}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setZoomLevel(1)} className="h-8 w-8 p-0">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></div>
                <span>선택가능</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-purple-500 border-2 border-purple-600 rounded"></div>
                <span>선택됨</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-300 border-2 border-gray-400 rounded opacity-50"></div>
                <span>예매완료</span>
              </div>
            </div>
          </div>

          {/* Horizontal Scrollable Seat Map */}
          <div className="flex-1 overflow-x-auto overflow-y-auto px-4 py-4">
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "top left",
                width: `${100 / zoomLevel}%`,
              }}
            >
              {/* Stage */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-8 rounded-xl shadow-lg">
                  <Theater className="h-5 w-5" />
                  <span className="font-bold text-base">무 대</span>
                  <Theater className="h-5 w-5" />
                </div>
              </div>

              {/* Seat Sections */}
              {selectedFloor === "1층" && (
                <div className="space-y-6">
                  {renderHorizontalSeatSection("앞블럭", 1, 9, "VIP")}
                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t-2 border-dashed border-gray-400"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-gray-50 px-6 py-1 text-gray-600 text-sm font-medium rounded-full border border-gray-300">
                        통로
                      </span>
                    </div>
                  </div>
                  {renderHorizontalSeatSection("뒷블럭", 1, 8, "R석")}
                </div>
              )}

              {selectedFloor === "2층" && <div>{renderHorizontalSeatSection("전체", 1, 8, "S")}</div>}
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Selected Seats & Actions */}
      <footer className="flex-shrink-0 bg-white border-t border-gray-200 shadow-lg">
        {/* Selected Seats Display */}
        {selectedSeats.length > 0 && (
          <div className="px-4 py-3 bg-purple-50 border-b border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-purple-600" />
                <span className="font-semibold text-purple-800 text-sm">선택된 좌석 ({selectedSeats.length}매)</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  selectedSeats.forEach((seat) => onSeatClick(seat, selectedSeatGrade))
                }}
                className="text-purple-600 hover:text-purple-700 text-xs h-auto p-1"
              >
                <X className="h-3 w-3 mr-1" />
                전체 해제
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {selectedSeats.map((seatId, index) => (
                <Badge key={index} className="bg-purple-600 text-white text-xs px-2 py-1">
                  {seatId.split("-").slice(-2).join("-")}
                  <button
                    onClick={() => onSeatClick(seatId, selectedSeatGrade)}
                    className="ml-1 hover:bg-purple-700 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-4">
          <div className="flex gap-3">
            <Button
              onClick={onBack}
              variant="outline"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 py-6 font-semibold bg-transparent"
            >
              이전
            </Button>
            <Button
              onClick={onConfirm}
              disabled={selectedSeats.length === 0}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-6 font-semibold"
            >
              <Check className="h-5 w-5 mr-2" />
              좌석 선택 완료 ({selectedSeats.length}매)
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
