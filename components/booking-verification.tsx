"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calendar, Loader2, CheckCircle2, Ticket, Theater } from "lucide-react"
import { useState } from "react"
import { getAllMusicals } from "@/data/musicals"
import { useToast } from "@/hooks/use-toast"

interface BookingVerificationProps {
  onBack: () => void
}

interface BookingInfo {
  id: number
  name: string
  student_id: string
  seat_grade: string
  selected_seats: string[]
  booking_date: string
  special_request?: string
}

export default function BookingVerification({ onBack }: BookingVerificationProps) {
  const [studentId, setStudentId] = useState("")
  const [name, setName] = useState("")
  const [selectedMusicalId, setSelectedMusicalId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null)
  const { toast } = useToast()

  const musicals = getAllMusicals()

  const handleVerify = async () => {
    if (!studentId || !name || !selectedMusicalId) {
      toast({
        title: "입력 오류",
        description: "학번, 이름, 공연을 모두 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setBookingInfo(null)

    try {
      const response = await fetch(`/api/bookings/${selectedMusicalId}`)

      if (!response.ok) {
        throw new Error("예매 정보를 불러올 수 없습니다.")
      }

      const data = await response.json()

      if (data.success && data.bookings) {
        const matching = data.bookings.find(
          (booking: BookingInfo) => booking.student_id === studentId && booking.name.trim() === name.trim(),
        )

        if (matching) {
          setBookingInfo(matching)
          toast({
            title: "예매 확인 완료",
            description: "예매 정보를 찾았습니다.",
          })
        } else {
          toast({
            title: "예매 정보 없음",
            description: "해당 학번과 이름으로 예매된 정보가 없습니다.",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "조회 실패",
          description: "예매 정보를 불러올 수 없습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("예매 조회 오류:", error)
      toast({
        title: "네트워크 오류",
        description: "서버와의 연결에 문제가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectedMusical = musicals.find((m) => m.id === selectedMusicalId)

  // 좌석 렌더링 함수
  const renderSeatRow = (
    floor: string,
    section: string,
    rowNum: number,
    selectedSeats: string[],
    gradeColor: string,
  ) => {
    const seats = []

    // 왼쪽 6석
    for (let i = 1; i <= 6; i++) {
      const seatId =
        floor === "1층"
          ? `1층-${section === "앞블럭" ? "앞" : "뒤"}-${rowNum}줄-왼쪽-${i}번`
          : `2층-${rowNum}줄-왼쪽-${i}번`
      const isSelected = selectedSeats.includes(seatId)
      seats.push(
        <div
          key={`left-${i}`}
          className={`h-2 w-2 rounded-sm ${isSelected ? "bg-purple-600 dark:bg-purple-500" : gradeColor}`}
        ></div>,
      )
    }

    // 통로
    seats.push(<div key="aisle-1" className="w-1"></div>)

    // 중앙 12석
    for (let i = 1; i <= 12; i++) {
      const seatId =
        floor === "1층"
          ? `1층-${section === "앞블럭" ? "앞" : "뒤"}-${rowNum}줄-중앙-${i}번`
          : `2층-${rowNum}줄-중앙-${i}번`
      const isSelected = selectedSeats.includes(seatId)
      seats.push(
        <div
          key={`center-${i}`}
          className={`h-2 w-2 rounded-sm ${isSelected ? "bg-purple-600 dark:bg-purple-500" : gradeColor}`}
        ></div>,
      )
    }

    // 통로
    seats.push(<div key="aisle-2" className="w-1"></div>)

    // 오른쪽 6석
    for (let i = 1; i <= 6; i++) {
      const seatId =
        floor === "1층"
          ? `1층-${section === "앞블럭" ? "앞" : "뒤"}-${rowNum}줄-오른쪽-${i}번`
          : `2층-${rowNum}줄-오른쪽-${i}번`
      const isSelected = selectedSeats.includes(seatId)
      seats.push(
        <div
          key={`right-${i}`}
          className={`h-2 w-2 rounded-sm ${isSelected ? "bg-purple-600 dark:bg-purple-500" : gradeColor}`}
        ></div>,
      )
    }

    return (
      <div key={`row-${rowNum}`} className="flex items-center gap-0.5 justify-center">
        <span className="text-[8px] w-4 text-center text-gray-500 dark:text-gray-400">{rowNum}</span>
        {seats}
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center p-4">
          <Button
            onClick={onBack}
            variant="ghost"
            size="icon"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5 text-gray-900 dark:text-white" />
          </Button>
          <h1 className="flex-1 text-center text-lg font-bold text-gray-900 dark:text-white pr-10">예매 좌석 정보 확인</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 조회 폼 */}
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="musical-select" className="text-gray-900 dark:text-white font-medium">
                공연 선택
              </Label>
              <Select value={selectedMusicalId} onValueChange={setSelectedMusicalId}>
                <SelectTrigger
                  id="musical-select"
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                >
                  <SelectValue placeholder="공연을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {musicals.map((musical) => (
                    <SelectItem key={musical.id} value={musical.id}>
                      {musical.title.replace(/[<>]/g, "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-900 dark:text-white font-medium">
                이름
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-id" className="text-gray-900 dark:text-white font-medium">
                학번
              </Label>
              <Input
                id="student-id"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="1234"
                className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
            </div>

            <Button
              onClick={handleVerify}
              disabled={isLoading || !studentId || !name || !selectedMusicalId}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  조회 중...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  확인
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 예매 정보 표시 */}
        {bookingInfo
          ? selectedMusical && (
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-4 space-y-4">
                  {/* 공연 정보 */}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {selectedMusical.title.replace(/[<>]/g, "")}
                    </h2>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-sm">
                        {selectedMusical.date} {selectedMusical.time}
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

                  {/* 예매자 정보 */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <span className="text-gray-600 dark:text-gray-400 text-xs block mb-1">이름</span>
                      <span className="font-bold text-gray-900 dark:text-white">{bookingInfo.name}</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <span className="text-gray-600 dark:text-gray-400 text-xs block mb-1">학번</span>
                      <span className="font-bold text-gray-900 dark:text-white">{bookingInfo.student_id}</span>
                    </div>
                  </div>

                  {/* 나의 좌석 정보 */}
                  <div className="text-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border-2 border-purple-200 dark:border-purple-800">
                    <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">나의 좌석</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {bookingInfo.seat_grade}석 {bookingInfo.selected_seats.length}매
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {bookingInfo.selected_seats.map((seat, index) => (
                        <div
                          key={index}
                          className="bg-purple-600 dark:bg-purple-500 text-white px-2.5 py-1 rounded-md text-xs font-medium shadow-sm"
                        >
                          {seat.split("-").slice(-2).join(" ")}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 실제 좌석 배치도 */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Theater className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">좌석 배치도</h3>
                    </div>

                    {/* 무대 */}
                    <div className="text-center mb-3">
                      <div className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold py-1.5 px-4 rounded-lg shadow-sm">
                        🎭 STAGE 🎭
                      </div>
                    </div>

                    {/* 통로 */}
                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t-2 border-dashed border-gray-400 dark:border-gray-600"></div>
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-gray-50 dark:bg-gray-900 px-3 text-gray-600 dark:text-gray-400 text-xs font-medium">
                          1층
                          </span>
                        </div>
                      </div>

                    <div className="space-y-3">
                      {/* 1층 VIP석 (9줄 × 24석 = 216석) */}
                      <div className="bg-yellow-50 dark:bg-yellow-900/10 border-2 border-yellow-300 dark:border-yellow-800 rounded-lg p-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-bold text-yellow-700 dark:text-yellow-500">1층 VIP석</div>
                          <div className="text-[10px] text-yellow-600 dark:text-yellow-600">9줄 × 24석 = 216석</div>
                        </div>
                        <div className="space-y-0.5">
                          {Array.from({ length: 9 }, (_, i) =>
                            renderSeatRow(
                              "1층",
                              "앞블럭",
                              i + 1,
                              bookingInfo.selected_seats,
                              "bg-yellow-200 dark:bg-yellow-900/30",
                            ),
                          )}
                        </div>
                      </div>

                      {/* 1층 R석 (8줄 × 24석 = 192석) */}
                      <div className="bg-red-50 dark:bg-red-900/10 border-2 border-red-300 dark:border-red-800 rounded-lg p-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-bold text-red-700 dark:text-red-500">1층 R석</div>
                          <div className="text-[10px] text-red-600 dark:text-red-600">8줄 × 24석 = 192석</div>
                        </div>
                        <div className="space-y-0.5">
                          {Array.from({ length: 8 }, (_, i) =>
                            renderSeatRow(
                              "1층",
                              "뒷블럭",
                              i + 1,
                              bookingInfo.selected_seats,
                              "bg-red-200 dark:bg-red-900/30",
                            ),
                          )}
                        </div>
                      </div>

                      {/* 통로 */}
                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t-2 border-dashed border-gray-400 dark:border-gray-600"></div>
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-gray-50 dark:bg-gray-900 px-3 text-gray-600 dark:text-gray-400 text-xs font-medium">
                            2층
                          </span>
                        </div>
                      </div>

                      {/* 2층 S석 (8줄 × 24석 = 192석) */}
                      <div className="bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-300 dark:border-blue-800 rounded-lg p-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-bold text-blue-700 dark:text-blue-500">2층 S석</div>
                          <div className="text-[10px] text-blue-600 dark:text-blue-600">8줄 × 24석 = 192석</div>
                        </div>
                        <div className="space-y-0.5">
                          {Array.from({ length: 8 }, (_, i) =>
                            renderSeatRow(
                              "2층",
                              "전체",
                              i + 1,
                              bookingInfo.selected_seats,
                              "bg-blue-200 dark:bg-blue-900/30",
                            ),
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 범례 */}
                    <div className="flex justify-center gap-4 mt-3 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-purple-600 dark:bg-purple-500 rounded-sm"></div>
                        <span className="text-gray-600 dark:text-gray-400">내 좌석</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-sm"></div>
                        <span className="text-gray-600 dark:text-gray-400">다른 좌석</span>
                      </div>
                    </div>
                  </div>

                  {/* 예매 일시 */}
                  <div className="text-center text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg py-2">
                    예매일시: {new Date(bookingInfo.booking_date).toLocaleString("ko-KR")}
                  </div>

                  {bookingInfo.special_request && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                      <p className="text-xs font-medium text-purple-900 dark:text-purple-300 mb-1">특별 요청사항</p>
                      <p className="text-sm text-purple-700 dark:text-purple-400">{bookingInfo.special_request}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          : isLoading
            ? null
            : studentId &&
              name &&
              selectedMusicalId && (
                <Card className="border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <Ticket className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">예매 정보가 없습니다</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      입력하신 정보로 예매 내역을 찾을 수 없습니다.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      학번과 이름을 정확히 입력했는지 확인해주세요.
                    </p>
                  </CardContent>
                </Card>
              )}

        {/* 안내 메시지 */}
        {!bookingInfo && !isLoading && (
          <Card className="border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
            <CardContent className="p-4">
              <p className="text-sm text-purple-600 dark:text-purple-300 font-semibold mb-2">📌 안내사항</p>
              <ul className="text-sm text-purple-600 dark:text-purple-400 space-y-1">
                <li>• 공연을 선택하고 이름과 학번을 입력해주세요</li>
                <li>• 예매 시 입력한 정보와 동일하게 입력해주세요</li>
                <li>• 예매 정보가 없으면 조회되지 않습니다</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
