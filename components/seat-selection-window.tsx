"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Theater, Check, X, ZoomIn, ZoomOut, RotateCcw, MapPin, Maximize2, Minimize2 } from "lucide-react"
import { useState, useEffect } from "react"
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
  const [zoomLevel, setZoomLevel] = useState(0.7) // 초기 70%
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false)

  // 줌 레벨 프리셋
  const zoomPresets = [
    { value: 0.4, label: "40%" },
    { value: 0.5, label: "50%" },
    { value: 0.6, label: "60%" },
    { value: 0.7, label: "70%" },
    { value: 0.8, label: "80%" },
    { value: 1.0, label: "100%" },
    { value: 1.2, label: "120%" },
    { value: 1.5, label: "150%" },
  ]

  // 좌석 상태 확인 함수 개선
  const getSeatStatus = (seatId: string, grade: string, floor: string) => {
    const floorKey = floor as "1층" | "2층"
    const floorUnavailable = unavailableSeats[floorKey]

    if (floorUnavailable && floorUnavailable[grade]) {
      if (floorUnavailable[grade].includes(seatId)) {
        return "unavailable"
      }
    }

    if (selectedSeats.includes(seatId)) {
      return "selected"
    }

    return "available"
  }

  // 좌석 렌더링 함수 - 층별 처리 개선
  const renderHorizontalSeatSection = (
    sectionName: string,
    rowStart: number,
    rowCount: number,
    grade: string,
    floor: "1층" | "2층",
  ) => {
    const gradeInfo = seatGrades.find((g) => g.grade === grade)
    if (!gradeInfo) {
      console.warn(`Grade info not found for: ${grade}`)
      return null
    }

    const rows = []

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const rowNumber = rowStart + rowIndex
      const seatRow = []

      // 왼쪽 영역 (6석)
      for (let seatNum = 1; seatNum <= 6; seatNum++) {
        const seatId =
          floor === "1층"
            ? `1층-${sectionName === "앞블럭" ? "앞" : "뒤"}-${rowNumber}줄-왼쪽-${seatNum}번`
            : `2층-${rowNumber}줄-왼쪽-${seatNum}번`

        const status = getSeatStatus(seatId, grade, floor)

        seatRow.push(
          <button
            key={seatId}
            onClick={() => status === "available" && onSeatClick(seatId, grade)}
            disabled={status === "unavailable"}
            className={`h-8 w-8 text-xs font-bold rounded-md transition-all border-2 flex-shrink-0 ${
              status === "selected"
                ? "bg-purple-500 border-purple-600 text-white shadow-lg scale-110 z-10"
                : status === "unavailable"
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400 opacity-50"
                  : `${gradeInfo.color} cursor-pointer shadow-sm hover:scale-110 text-gray-700 hover:shadow-md border-gray-300`
            }`}
            title={`${seatId} (${status === "unavailable" ? "예매완료" : status === "selected" ? "선택됨" : "선택가능"})`}
          >
            {seatNum}
          </button>,
        )
      }

      // 통로 (시각적 구분선)
      seatRow.push(
        <div key={`aisle1-${rowNumber}`} className="flex flex-col items-center justify-center flex-shrink-0 px-3">
          <div className="w-1 h-8 bg-gradient-to-b from-transparent via-gray-400 to-transparent rounded-full"></div>
        </div>,
      )

      // 중앙 영역 (12석)
      for (let seatNum = 1; seatNum <= 12; seatNum++) {
        const seatId =
          floor === "1층"
            ? `1층-${sectionName === "앞블럭" ? "앞" : "뒤"}-${rowNumber}줄-중앙-${seatNum}번`
            : `2층-${rowNumber}줄-중앙-${seatNum}번`

        const status = getSeatStatus(seatId, grade, floor)

        seatRow.push(
          <button
            key={seatId}
            onClick={() => status === "available" && onSeatClick(seatId, grade)}
            disabled={status === "unavailable"}
            className={`h-8 w-8 text-xs font-bold rounded-md transition-all border-2 flex-shrink-0 ${
              status === "selected"
                ? "bg-purple-500 border-purple-600 text-white shadow-lg scale-110 z-10"
                : status === "unavailable"
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400 opacity-50"
                  : `${gradeInfo.color} cursor-pointer shadow-sm hover:scale-110 text-gray-700 hover:shadow-md border-gray-300`
            }`}
            title={`${seatId} (${status === "unavailable" ? "예매완료" : status === "selected" ? "선택됨" : "선택가능"})`}
          >
            {seatNum}
          </button>,
        )
      }

      // 통로
      seatRow.push(
        <div key={`aisle2-${rowNumber}`} className="flex flex-col items-center justify-center flex-shrink-0 px-3">
          <div className="w-1 h-8 bg-gradient-to-b from-transparent via-gray-400 to-transparent rounded-full"></div>
        </div>,
      )

      // 오른쪽 영역 (6석)
      for (let seatNum = 1; seatNum <= 6; seatNum++) {
        const seatId =
          floor === "1층"
            ? `1층-${sectionName === "앞블럭" ? "앞" : "뒤"}-${rowNumber}줄-오른쪽-${seatNum}번`
            : `2층-${rowNumber}줄-오른쪽-${seatNum}번`

        const status = getSeatStatus(seatId, grade, floor)

        seatRow.push(
          <button
            key={seatId}
            onClick={() => status === "available" && onSeatClick(seatId, grade)}
            disabled={status === "unavailable"}
            className={`h-8 w-8 text-xs font-bold rounded-md transition-all border-2 flex-shrink-0 ${
              status === "selected"
                ? "bg-purple-500 border-purple-600 text-white shadow-lg scale-110 z-10"
                : status === "unavailable"
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400 opacity-50"
                  : `${gradeInfo.color} cursor-pointer shadow-sm hover:scale-110 text-gray-700 hover:shadow-md border-gray-300`
            }`}
            title={`${seatId} (${status === "unavailable" ? "예매완료" : status === "selected" ? "선택됨" : "선택가능"})`}
          >
            {seatNum}
          </button>,
        )
      }

      rows.push(
        <div key={`row-${rowNumber}`} className="flex items-center gap-1 mb-2">
          <div className="w-12 text-center font-bold text-gray-600 text-xs flex-shrink-0">{rowNumber}줄</div>
          <div className="flex items-center gap-1">{seatRow}</div>
        </div>,
      )
    }

    return (
      <div
        className={`border-2 rounded-xl p-4 mb-4 ${gradeInfo.color.replace("bg-", "border-").replace("-100", "-300")} bg-white shadow-sm inline-block min-w-fit`}
        data-floor={floor}
        data-section={sectionName}
        data-grade={grade}
      >
        <div className="flex items-center gap-3 mb-4 sticky left-0 bg-white z-10 pb-2 border-b border-gray-200">
          <div className={`w-6 h-6 rounded ${gradeInfo.color} border-2`}></div>
          <div>
            <h4 className="font-bold text-gray-900 text-base">
              {floor} - {sectionName} ({grade}석)
            </h4>
            <p className="text-xs text-gray-600">{gradeInfo.description}</p>
          </div>
        </div>
        <div className="space-y-2">{rows}</div>
      </div>
    )
  }

  // 줌 레벨 변경 핸들러
  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(Math.max(0.4, Math.min(1.5, newZoom)))
    setIsZoomMenuOpen(false)
  }

  // 렌더링 디버깅
  useEffect(() => {
    console.log("Current Floor:", selectedFloor)
    console.log("Unavailable Seats:", unavailableSeats)
    console.log("Seat Grades:", seatGrades)
  }, [selectedFloor, unavailableSeats, seatGrades])

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-3">
          <Button onClick={onBack} variant="ghost" size="icon" className="rounded-full hover:bg-gray-100 h-9 w-9">
            <ArrowLeft className="h-5 w-5 text-gray-900" />
          </Button>
          <div className="text-center flex-1">
            <h1 className="text-base font-bold text-gray-900">좌석 선택</h1>
            <p className="text-xs text-gray-600">{musicalTitle}</p>
          </div>
          <div className="w-9"></div>
        </div>

        {/* Statistics Bar */}
        <div className="px-3 pb-2">
          <div className="flex items-center justify-between text-xs bg-gray-50 rounded-lg p-2.5">
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${connectionStatus === "connected" ? "bg-green-500" : "bg-red-500"}`}
              ></div>
              <span className="text-gray-600 text-xs">{connectionStatus === "connected" ? "실시간" : "오프라인"}</span>
            </div>
            <div className="flex gap-3 text-xs">
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

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Floor Selection & Controls */}
          <div className="flex-shrink-0 px-3 py-2 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              {/* Floor Selection */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                {(["1층", "2층"] as const).map((floor) => (
                  <button
                    key={floor}
                    onClick={() => setSelectedFloor(floor)}
                    className={`px-3 py-1.5 rounded-md font-semibold transition-all text-xs ${
                      selectedFloor === floor ? "bg-purple-600 text-white shadow-md" : "text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {floor}
                  </button>
                ))}
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleZoomChange(zoomLevel - 0.1)}
                  disabled={zoomLevel <= 0.4}
                  className="h-7 w-7 p-0"
                  title="축소"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>

                <div className="relative">
                  <button
                    onClick={() => setIsZoomMenuOpen(!isZoomMenuOpen)}
                    className="text-xs font-medium px-2 py-1 text-gray-700 min-w-[50px] text-center bg-gray-100 rounded border border-gray-200 hover:bg-gray-200 transition-colors"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </button>

                  {isZoomMenuOpen && (
                    <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-50 min-w-[80px]">
                      {zoomPresets.map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => handleZoomChange(preset.value)}
                          className={`w-full text-left px-3 py-1.5 rounded text-xs hover:bg-gray-100 transition-colors ${
                            Math.abs(zoomLevel - preset.value) < 0.01
                              ? "bg-purple-50 text-purple-600 font-semibold"
                              : "text-gray-700"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleZoomChange(zoomLevel + 0.1)}
                  disabled={zoomLevel >= 1.5}
                  className="h-7 w-7 p-0"
                  title="확대"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleZoomChange(0.7)}
                  className="h-7 w-7 p-0"
                  title="기본 크기 (70%)"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleZoomChange(zoomLevel === 1.0 ? 0.7 : 1.0)}
                  className="h-7 w-7 p-0"
                  title={zoomLevel === 1.0 ? "축소 보기" : "전체 보기"}
                >
                  {zoomLevel === 1.0 ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-3.5 h-3.5 bg-gray-100 border-2 border-gray-300 rounded"></div>
                <span>선택가능</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3.5 h-3.5 bg-purple-500 border-2 border-purple-600 rounded"></div>
                <span>선택됨</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3.5 h-3.5 bg-gray-300 border-2 border-gray-400 rounded opacity-50"></div>
                <span>예매완료</span>
              </div>
            </div>
          </div>

          {/* Horizontal Scrollable Seat Map */}
          <div className="flex-1 overflow-x-auto overflow-y-auto px-3 py-3">
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "top left",
                width: `${100 / zoomLevel}%`,
                minHeight: `${100 / zoomLevel}%`,
              }}
            >
              {/* Stage - 좌석 배열과 동일한 너비 */}
              <div className="mb-6 flex justify-start">
                <div className="w-12 flex-shrink-0"></div> {/* 줄 번호 공간 */}
                <div className="flex-1 flex justify-center">
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 px-6 rounded-xl shadow-lg">
                    <Theater className="h-4 w-4" />
                    <span className="font-bold text-sm">무 대</span>
                    <Theater className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Seat Sections - 1층 */}
              {selectedFloor === "1층" && (
                <div className="space-y-4" key="floor-1">
                  <div className="inline-block">
                    {/* VIP 앞블럭 */}
                    {renderHorizontalSeatSection("앞블럭", 1, 9, "VIP", "1층")}
                  </div>

                  {/* 통로 구분선 - 좌석 배열과 동일한 너비 */}
                  <div className="relative py-6 my-4 flex">
                    <div className="w-12 flex-shrink-0"></div>
                    <div className="flex-1 relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t-4 border-dashed border-gray-400"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-gray-50 px-8 py-2 text-gray-700 text-sm font-bold rounded-full border-2 border-gray-400 shadow-md">
                          통 로
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="inline-block">
                    {/* R석 뒷블럭 */}
                    {renderHorizontalSeatSection("뒷블럭", 1, 8, "R석", "1층")}
                  </div>
                </div>
              )}

              {/* Seat Sections - 2층 */}
              {selectedFloor === "2층" && (
                <div className="space-y-4" key="floor-2">
                  <div className="inline-block">
                    {/* S석 전체 */}
                    {renderHorizontalSeatSection("전체", 1, 8, "S석", "2층")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Selected Seats & Actions */}
      <footer className="flex-shrink-0 bg-white border-t border-gray-200 shadow-lg">
        {/* Selected Seats Display */}
        {selectedSeats.length > 0 && (
          <div className="px-3 py-2.5 bg-purple-50 border-b border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-purple-600" />
                <span className="font-semibold text-purple-800 text-xs">선택된 좌석 ({selectedSeats.length}매)</span>
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
            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
              {selectedSeats.map((seatId, index) => (
                <Badge key={index} className="bg-purple-600 text-white text-xs px-1.5 py-0.5">
                  {seatId.split("-").slice(-2).join("-")}
                  <button
                    onClick={() => onSeatClick(seatId, selectedSeatGrade)}
                    className="ml-1 hover:bg-purple-700 rounded-full w-3.5 h-3.5 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-3">
          <div className="flex gap-2">
            <Button
              onClick={onBack}
              variant="outline"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 py-5 font-semibold text-sm bg-transparent"
            >
              이전
            </Button>
            <Button
              onClick={onConfirm}
              disabled={selectedSeats.length === 0}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-5 font-semibold text-sm"
            >
              <Check className="h-4 w-4 mr-1.5" />
              좌석 선택 완료 ({selectedSeats.length}매)
            </Button>
          </div>
        </div>
      </footer>

      {/* Zoom Menu Overlay */}
      {isZoomMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setIsZoomMenuOpen(false)} />}
    </div>
  )
}
