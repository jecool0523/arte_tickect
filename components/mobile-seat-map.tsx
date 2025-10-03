"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Theater, ZoomIn, ZoomOut, RotateCcw, Database } from "lucide-react"
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
  const [selectedFloor, setSelectedFloor] = useState<"1층" | "2층">("1층")
  const [zoomLevel, setZoomLevel] = useState(0.8)

  // 좌석 상태 확인
  const getSeatStatus = (seatId: string, grade: string) => {
    const floorUnavailable = unavailableSeats[selectedFloor]
    if (floorUnavailable && floorUnavailable[grade] && floorUnavailable[grade].includes(seatId)) {
      return "unavailable"
    }
    if (selectedSeats.includes(seatId)) return "selected"
    return "available"
  }

  // 좌석 섹션 렌더링
  const renderSeatSection = (sectionName: string, rowStart: number, rowCount: number, grade: string) => {
    const gradeInfo = seatGrades.find((g) => g.grade === grade)
    if (!gradeInfo) return null

    const rows = []
    const seatSize = "h-7 w-7 text-xs"

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
            className={`${seatSize} font-bold rounded transition-all border-2 ${
              status === "selected"
                ? "bg-purple-500 border-purple-600 text-white shadow-lg transform scale-110"
                : status === "unavailable"
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400"
                  : `${gradeInfo.color} cursor-pointer shadow-sm active:scale-95 text-gray-700 hover:shadow-md`
            }`}
            title={`${seatId} (${status === "unavailable" ? "예매완료" : status === "selected" ? "선택됨" : "선택가능"})`}
          >
            {seatNum}
          </button>,
        )
      }

      // 통로
      seatRow.push(<div key={`aisle1-${rowNumber}`} className="w-3"></div>)

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
            className={`${seatSize} font-bold rounded transition-all border-2 ${
              status === "selected"
                ? "bg-purple-500 border-purple-600 text-white shadow-lg transform scale-110"
                : status === "unavailable"
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400"
                  : `${gradeInfo.color} cursor-pointer shadow-sm active:scale-95 text-gray-700 hover:shadow-md`
            }`}
            title={`${seatId} (${status === "unavailable" ? "예매완료" : status === "selected" ? "선택됨" : "선택가능"})`}
          >
            {seatNum}
          </button>,
        )
      }

      // 통로
      seatRow.push(<div key={`aisle2-${rowNumber}`} className="w-3"></div>)

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
            className={`${seatSize} font-bold rounded transition-all border-2 ${
              status === "selected"
                ? "bg-purple-500 border-purple-600 text-white shadow-lg transform scale-110"
                : status === "unavailable"
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400"
                  : `${gradeInfo.color} cursor-pointer shadow-sm active:scale-95 text-gray-700 hover:shadow-md`
            }`}
            title={`${seatId} (${status === "unavailable" ? "예매완료" : status === "selected" ? "선택됨" : "선택가능"})`}
          >
            {seatNum}
          </button>,
        )
      }

      rows.push(
        <div key={`row-${rowNumber}`} className="flex items-center justify-center gap-1 mb-1">
          <span className="w-6 text-xs text-center font-bold mr-2 text-gray-600">{rowNumber}</span>
          {seatRow}
        </div>,
      )
    }

    return (
      <div className={`border-2 rounded-xl p-3 ${gradeInfo.color.replace("bg-", "border-").replace("-100", "-300")}`}>
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-bold text-gray-900 text-sm">
            {sectionName} ({grade}석)
          </h4>
          <span className="text-gray-700 font-medium text-xs">{gradeInfo.description}</span>
        </div>
        <div className="space-y-1">{rows}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 예매 현황 */}
      <Card className="bg-white border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-gray-700" />
              <span className="font-semibold text-gray-900 text-sm">예매 현황</span>
              <div
                className={`w-2 h-2 rounded-full ${connectionStatus === "connected" ? "bg-green-500" : "bg-red-500"}`}
              ></div>
            </div>
            <span className="text-xs text-gray-500">{connectionStatus === "connected" ? "실시간" : "오프라인"}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="font-bold text-gray-900 text-lg">{statistics.total_bookings}</p>
              <p className="text-xs text-gray-500">총 예매</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="font-bold text-blue-600 text-lg">{statistics.total_seats_booked}</p>
              <p className="text-xs text-gray-500">예매 좌석</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2">
              <p className="font-bold text-green-600 text-lg">{statistics.unique_students}</p>
              <p className="text-xs text-gray-500">신청 학생</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 선택된 좌석 정보 */}
      {selectedSeats.length > 0 && (
        <Card className="bg-purple-50 border border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Theater className="h-4 w-4 text-purple-600" />
              <span className="font-semibold text-purple-800">선택된 좌석 ({selectedSeats.length}매)</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedSeats.map((seatId, index) => (
                <Badge key={index} className="bg-purple-600 text-white text-xs px-2 py-1">
                  {seatId.split("-").slice(-2).join("-")}
                  <button
                    onClick={() => onSeatClick(seatId, selectedSeatGrade)}
                    className="ml-1 hover:bg-purple-700 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 층 선택 및 줌 컨트롤 */}
      <div className="flex justify-between items-center">
        <div className="bg-gray-100 rounded-lg p-1 border border-gray-200">
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
            variant="outline"
            onClick={() => setZoomLevel(Math.max(0.6, zoomLevel - 0.1))}
            disabled={zoomLevel <= 0.6}
            className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50 w-8 h-8 p-0"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2 text-gray-700">{Math.round(zoomLevel * 100)}%</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoomLevel(Math.min(1.2, zoomLevel + 0.1))}
            disabled={zoomLevel >= 1.2}
            className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50 w-8 h-8 p-0"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoomLevel(0.8)}
            className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50 w-8 h-8 p-0"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 좌석 배치도 */}
      <Card className="bg-white border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Theater className="h-5 w-5" />
            {selectedFloor} 좌석 선택
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="space-y-4 p-4 bg-gray-50 rounded-xl overflow-x-auto min-w-max"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left" }}
          >
            {/* 무대 */}
            <div className="text-center mb-6">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-6 rounded-xl inline-block shadow-lg">
                <span className="font-bold text-sm">🎭 무 대 🎭</span>
              </div>
            </div>

            {/* 1층 구조 */}
            {selectedFloor === "1층" && (
              <div className="space-y-4">
                {/* VIP 앞블럭 */}
                {renderSeatSection("앞블럭", 1, 9, "VIP")}

                {/* 통로 구분선 */}
                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-dashed border-gray-400"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-gray-50 px-4 text-gray-600 text-sm font-medium">통로</span>
                  </div>
                </div>

                {/* R석 뒷블럭 */}
                {renderSeatSection("뒷블럭", 1, 8, "R석")}
              </div>
            )}

            {/* 2층 구조 */}
            {selectedFloor === "2층" && (
              <div className="space-y-4">
                {/* S석 전체 */}
                {renderSeatSection("전체", 1, 8, "S")}
              </div>
            )}

            {/* 범례 */}
            <div className="flex justify-center gap-4 text-sm font-medium text-gray-600 flex-wrap pt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></div>
                <span>선택가능</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 border-2 border-purple-600 rounded"></div>
                <span>선택됨</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-300 border-2 border-gray-400 rounded"></div>
                <span>예매완료</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>💡 사용법:</strong> 원하는 좌석을 직접 터치하여 선택하세요.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
