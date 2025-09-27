"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Theater, ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react"
import { useState } from "react"

interface SeatGrade {
  grade: string
  description: string
  color: string
}

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
  onClose?: () => void
}

export default function MobileSeatMap({
  seatGrades,
  selectedSeats,
  onSeatClick,
  unavailableSeats,
  statistics,
  connectionStatus,
  selectedSeatGrade,
  onClose,
}: MobileSeatMapProps) {
  const [selectedFloor, setSelectedFloor] = useState<"1층" | "2층">("1층")
  const [zoomLevel, setZoomLevel] = useState(1.0)

  // 좌석 상태 확인
  const getSeatStatus = (seatId: string, grade: string) => {
    const floorUnavailable = unavailableSeats[selectedFloor]
    if (floorUnavailable && floorUnavailable[grade] && floorUnavailable[grade].includes(seatId)) {
      return "unavailable"
    }
    if (selectedSeats.includes(seatId)) return "selected"
    return "available"
  }

  // 좌석 렌더링 (실제 좌석 배치에 맞게)
  const renderSeatGrid = (grade: string, rows: number, seatsPerRow: number, sectionName?: string) => {
    const gradeInfo = seatGrades.find((g) => g.grade === grade)
    if (!gradeInfo) return null

    const seatRows = []

    for (let row = 1; row <= rows; row++) {
      const rowSeats = []

      for (let seat = 1; seat <= seatsPerRow; seat++) {
        let seatId: string

        if (selectedFloor === "1층") {
          if (grade === "VIP") {
            seatId = `1층-앞-${row}줄-${seat}번`
          } else {
            seatId = `1층-뒤-${row}줄-${seat}번`
          }
        } else {
          seatId = `2층-${row}줄-${seat}번`
        }

        const status = getSeatStatus(seatId, grade)

        rowSeats.push(
          <button
            key={seatId}
            onClick={() => status === "available" && onSeatClick(seatId, grade)}
            disabled={status === "unavailable"}
            className={`
              w-6 h-6 text-xs font-bold rounded-sm border transition-all duration-200
              ${
                status === "selected"
                  ? "bg-orange-500 border-orange-600 text-white shadow-lg transform scale-110"
                  : status === "unavailable"
                    ? "bg-gray-400 border-gray-500 text-gray-600 cursor-not-allowed"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 active:scale-95"
              }
            `}
            title={`${row}열 ${seat}번 (${status === "unavailable" ? "예매완료" : status === "selected" ? "선택됨" : "선택가능"})`}
          >
            {seat}
          </button>,
        )
      }

      seatRows.push(
        <div key={`row-${row}`} className="flex justify-center gap-1 mb-1">
          <div className="w-6 text-xs text-center font-bold text-gray-400 mr-2 flex items-center justify-center">
            {String.fromCharCode(64 + row)}
          </div>
          {rowSeats}
        </div>,
      )
    }

    return (
      <div className="space-y-1">
        {sectionName && (
          <div className="text-center mb-3">
            <Badge
              className={`${gradeInfo.color.replace("bg-", "bg-").replace("border-", "border-")} text-gray-800 font-semibold`}
            >
              {sectionName} ({grade}석)
            </Badge>
          </div>
        )}
        {seatRows}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
        <div className="flex items-center gap-3">
          <Theater className="h-6 w-6" />
          <div>
            <h2 className="font-bold text-lg">좌석선택</h2>
            <p className="text-sm text-gray-300">{selectedFloor}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 층 선택 */}
          <div className="bg-gray-800 rounded-lg p-1 border border-gray-700">
            {(["1층", "2층"] as const).map((floor) => (
              <button
                key={floor}
                onClick={() => setSelectedFloor(floor)}
                className={`px-3 py-1 rounded-md font-semibold transition-all text-sm ${
                  selectedFloor === floor ? "bg-orange-600 text-white shadow-md" : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                {floor}
              </button>
            ))}
          </div>
          {onClose && (
            <Button onClick={onClose} variant="ghost" size="icon" className="text-white hover:bg-gray-800">
              <X className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>

      {/* 무대 */}
      <div className="text-center py-4 bg-gray-900">
        <div className="mx-auto w-48 h-8 bg-gradient-to-r from-orange-600 to-red-600 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-sm">🎭 STAGE 🎭</span>
        </div>
      </div>

      {/* 좌석 영역 */}
      <div className="flex-1 overflow-auto bg-gray-900 px-4 pb-4">
        <div
          className="flex justify-center"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top center" }}
        >
          <div className="space-y-6">
            {selectedFloor === "1층" && (
              <>
                {/* VIP석 (앞블럭) */}
                {renderSeatGrid("VIP", 9, 24, "앞블럭")}

                {/* 통로 */}
                <div className="text-center py-3">
                  <div className="border-t-2 border-dashed border-gray-600 w-full mb-2"></div>
                  <span className="bg-gray-800 px-4 py-1 rounded text-gray-300 text-sm">통로</span>
                </div>

                {/* R석 (뒷블럭) */}
                {renderSeatGrid("R", 8, 24, "뒷블럭")}
              </>
            )}

            {selectedFloor === "2층" && (
              <>
                {/* S석 (2층 전체) */}
                {renderSeatGrid("S", 8, 12, "2층")}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 하단 정보 및 컨트롤 */}
      <div className="bg-gray-900 border-t border-gray-700 p-4">
        {/* 선택된 좌석 정보 */}
        {selectedSeats.length > 0 && (
          <div className="mb-4 p-3 bg-orange-900/30 rounded-lg border border-orange-600/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-orange-400 font-semibold">선택된 좌석</span>
              <Badge className="bg-orange-600 text-white">{selectedSeats.length}매</Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedSeats.slice(0, 8).map((seatId, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs bg-orange-100 text-orange-800 border-orange-300"
                >
                  {seatId.split("-").slice(-1)[0]}
                </Badge>
              ))}
              {selectedSeats.length > 8 && (
                <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                  +{selectedSeats.length - 8}개
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* 범례 */}
        <div className="flex justify-center gap-4 text-sm text-gray-300 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-gray-300 rounded-sm"></div>
            <span>선택가능</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 border border-orange-600 rounded-sm"></div>
            <span>선택됨</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 border border-gray-500 rounded-sm"></div>
            <span>예매완료</span>
          </div>
        </div>

        {/* 줌 컨트롤 */}
        <div className="flex justify-center items-center gap-2 mb-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoomLevel(Math.max(0.6, zoomLevel - 0.1))}
            disabled={zoomLevel <= 0.6}
            className="bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700 w-8 h-8 p-0"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-3 text-gray-300 min-w-16 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoomLevel(Math.min(1.4, zoomLevel + 0.1))}
            disabled={zoomLevel >= 1.4}
            className="bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700 w-8 h-8 p-0"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoomLevel(1.0)}
            className="bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700 w-8 h-8 p-0"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* 좌석 선택 완료 버튼 */}
        <Button
          onClick={onClose}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 text-lg"
          disabled={selectedSeats.length === 0}
        >
          좌석선택 ({selectedSeats.length}매)
        </Button>
      </div>
    </div>
  )
}
