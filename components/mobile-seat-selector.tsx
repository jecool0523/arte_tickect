"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Theater, Users, MapPin, Minus, Plus } from "lucide-react"
import { useState } from "react"

interface SeatGrade {
  grade: string
  description: string
  color: string
  price?: string
}

interface MobileSeatSelectorProps {
  seatGrades: SeatGrade[]
  selectedSeats: string[]
  onSeatSelectionChange: (seats: string[], grade: string) => void
  unavailableSeats: Record<string, Record<string, string[]>>
  statistics: {
    total_bookings: number
    total_seats_booked: number
    unique_students: number
  }
  connectionStatus: "connected" | "demo" | "error"
}

export default function MobileSeatSelector({
  seatGrades,
  selectedSeats,
  onSeatSelectionChange,
  unavailableSeats,
  statistics,
  connectionStatus,
}: MobileSeatSelectorProps) {
  const [selectedGrade, setSelectedGrade] = useState<string>("")
  const [seatCount, setSeatCount] = useState<number>(1)

  // 등급별 사용 가능한 좌석 수 계산 (업데이트된 좌석 수)
  const getAvailableSeatsCount = (grade: string) => {
    let totalSeats = 0
    let unavailableCount = 0

    if (grade === "VIP") {
      totalSeats = 216 // 9줄 × 24석
      unavailableCount = unavailableSeats["1층"]?.["VIP"]?.length || 0
    } else if (grade === "R") {
      totalSeats = 192 // 8줄 × 24석
      unavailableCount = unavailableSeats["1층"]?.["R"]?.length || 0
    } else if (grade === "S") {
      totalSeats = 96 // 8줄 × 12석 (2층은 12석으로 조정)
      unavailableCount = unavailableSeats["2층"]?.["S"]?.length || 0
    }

    return totalSeats - unavailableCount
  }

  // 자동 좌석 선택
  const handleAutoSeatSelection = (grade: string, count: number) => {
    const availableSeats: string[] = []

    if (grade === "VIP") {
      // 1층 앞블럭 중앙부터 선택
      for (let row = 1; row <= 9 && availableSeats.length < count; row++) {
        for (let seat = 10; seat <= 15 && availableSeats.length < count; seat++) {
          const seatId = `1층-앞-${row}줄-${seat}번`
          if (!unavailableSeats["1층"]?.["VIP"]?.includes(seatId)) {
            availableSeats.push(seatId)
          }
        }
      }
    } else if (grade === "R") {
      // 1층 뒷블럭 중앙부터 선택
      for (let row = 1; row <= 8 && availableSeats.length < count; row++) {
        for (let seat = 10; seat <= 15 && availableSeats.length < count; seat++) {
          const seatId = `1층-뒤-${row}줄-${seat}번`
          if (!unavailableSeats["1층"]?.["R"]?.includes(seatId)) {
            availableSeats.push(seatId)
          }
        }
      }
    } else if (grade === "S") {
      // 2층 중앙부터 선택
      for (let row = 1; row <= 8 && availableSeats.length < count; row++) {
        for (let seat = 5; seat <= 8 && availableSeats.length < count; seat++) {
          const seatId = `2층-${row}줄-${seat}번`
          if (!unavailableSeats["2층"]?.["S"]?.includes(seatId)) {
            availableSeats.push(seatId)
          }
        }
      }
    }

    // 중앙에서 부족하면 양옆으로 확장
    if (availableSeats.length < count) {
      if (grade === "VIP") {
        for (let row = 1; row <= 9 && availableSeats.length < count; row++) {
          for (let seat = 1; seat <= 24 && availableSeats.length < count; seat++) {
            if (seat >= 10 && seat <= 15) continue // 이미 선택된 중앙 좌석 스킵
            const seatId = `1층-앞-${row}줄-${seat}번`
            if (!unavailableSeats["1층"]?.["VIP"]?.includes(seatId)) {
              availableSeats.push(seatId)
            }
          }
        }
      } else if (grade === "R") {
        for (let row = 1; row <= 8 && availableSeats.length < count; row++) {
          for (let seat = 1; seat <= 24 && availableSeats.length < count; seat++) {
            if (seat >= 10 && seat <= 15) continue
            const seatId = `1층-뒤-${row}줄-${seat}번`
            if (!unavailableSeats["1층"]?.["R"]?.includes(seatId)) {
              availableSeats.push(seatId)
            }
          }
        }
      } else if (grade === "S") {
        for (let row = 1; row <= 8 && availableSeats.length < count; row++) {
          for (let seat = 1; seat <= 12 && availableSeats.length < count; seat++) {
            if (seat >= 5 && seat <= 8) continue
            const seatId = `2층-${row}줄-${seat}번`
            if (!unavailableSeats["2층"]?.["S"]?.includes(seatId)) {
              availableSeats.push(seatId)
            }
          }
        }
      }
    }

    onSeatSelectionChange(availableSeats.slice(0, count), grade)
    setSelectedGrade(grade)
  }

  return (
    <div className="space-y-4">
      {/* 예매 현황 */}
      <Card className="bg-white border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Theater className="h-4 w-4 text-gray-700" />
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

      {/* 좌석 등급 선택 */}
      <Card className="bg-white border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gray-900 text-lg">
            <MapPin className="h-5 w-5" />
            좌석 등급 선택
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {seatGrades.map((seat) => {
            const availableCount = getAvailableSeatsCount(seat.grade)
            const totalSeats = seat.grade === "VIP" ? 216 : seat.grade === "R" ? 192 : 96
            const isSelected = selectedGrade === seat.grade

            return (
              <div
                key={seat.grade}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  isSelected ? "border-purple-500 bg-purple-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
                onClick={() => setSelectedGrade(seat.grade)}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded ${seat.color.replace("bg-", "bg-").replace("border-", "")}`}></div>
                    <div>
                      <h3 className="font-bold text-gray-900">{seat.grade}석</h3>
                      <p className="text-sm text-gray-600">{seat.description}</p>
                      <p className="text-xs text-gray-500">총 {totalSeats}석</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">잔여 {availableCount}석</p>
                    {seat.price && <p className="text-xs text-gray-500">{seat.price}</p>}
                  </div>
                </div>

                {availableCount === 0 && (
                  <div className="text-center py-2">
                    <Badge variant="destructive" className="text-xs">
                      매진
                    </Badge>
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* 좌석 수 선택 */}
      {selectedGrade && (
        <Card className="bg-white border border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-gray-900 text-lg">
              <Users className="h-5 w-5" />
              좌석 수 선택
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-700 font-medium">선택할 좌석 수</span>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSeatCount(Math.max(1, seatCount - 1))}
                  disabled={seatCount <= 1}
                  className="w-8 h-8 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="font-bold text-lg w-8 text-center">{seatCount}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSeatCount(Math.min(8, seatCount + 1))}
                  disabled={seatCount >= 8 || seatCount >= getAvailableSeatsCount(selectedGrade)}
                  className="w-8 h-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button
              onClick={() => handleAutoSeatSelection(selectedGrade, seatCount)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3"
              disabled={getAvailableSeatsCount(selectedGrade) < seatCount}
            >
              {selectedSeats.length > 0 ? "좌석 재선택" : "자동 좌석 선택"}
            </Button>

            <p className="text-xs text-gray-500 text-center mt-2">최적의 좌석을 자동으로 선택해드립니다</p>
          </CardContent>
        </Card>
      )}

      {/* 선택된 좌석 정보 */}
      {selectedSeats.length > 0 && (
        <Card className="bg-purple-50 border border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Theater className="h-4 w-4 text-purple-600" />
              <span className="font-semibold text-purple-800">선택된 좌석</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-700">등급</span>
                <Badge className="bg-purple-600 text-white">{selectedGrade}석</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-700">좌석 수</span>
                <span className="font-bold text-purple-800">{selectedSeats.length}매</span>
              </div>
            </div>

            <Separator className="my-3 bg-purple-200" />

            <div className="space-y-1">
              <p className="text-xs text-purple-600 font-medium">선택된 좌석 목록</p>
              <div className="flex flex-wrap gap-1">
                {selectedSeats.slice(0, 6).map((seatId, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-white text-purple-700 border-purple-300">
                    {seatId.split("-").slice(-1)[0]}
                  </Badge>
                ))}
                {selectedSeats.length > 6 && (
                  <Badge variant="outline" className="text-xs bg-white text-purple-700 border-purple-300">
                    +{selectedSeats.length - 6}개
                  </Badge>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onSeatSelectionChange([], "")
                setSelectedGrade("")
                setSeatCount(1)
              }}
              className="w-full mt-3 border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              선택 초기화
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
