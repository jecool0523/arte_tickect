"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calendar, Loader2, CheckCircle2, Ticket } from "lucide-react"
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
        // 학번과 이름이 일치하는 예매 찾기
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
          <h1 className="flex-1 text-center text-lg font-bold text-gray-900 dark:text-white pr-10">좌석 정보 확인</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-4">
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

                  {/* 나의 좌석 */}
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

                  {/* 간소화된 좌석 배치 - 한 화면에 맞게 축소 */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    {/* 무대 */}
                    <div className="text-center mb-3">
                      <div className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold py-1.5 px-4 rounded-lg shadow-sm">
                        STAGE
                      </div>
                    </div>

                    {/* 축소된 좌석 그리드 - 전체가 한 화면에 보이도록 */}
                    <div className="space-y-2">
                      {/* VIP 구역 표시 */}
                      {bookingInfo.selected_seats.some((seat) => seat.includes("앞")) && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded p-2">
                          <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-500 mb-1">VIP석</div>
                          <div className="grid grid-cols-12 gap-0.5">
                            {Array(36)
                              .fill(0)
                              .map((_, i) => {
                                const isSelected = bookingInfo.selected_seats.some(
                                  (seat) => seat.includes("VIP") || seat.includes("앞"),
                                )
                                return (
                                  <div
                                    key={i}
                                    className={`h-3 rounded-sm ${
                                      isSelected && i >= 15 && i <= 20
                                        ? "bg-purple-600 dark:bg-purple-500"
                                        : "bg-gray-200 dark:bg-gray-700"
                                    }`}
                                  ></div>
                                )
                              })}
                          </div>
                        </div>
                      )}

                      {/* R석 구역 표시 */}
                      {bookingInfo.selected_seats.some((seat) => seat.includes("R") || seat.includes("뒤")) && (
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded p-2">
                          <div className="text-xs font-semibold text-red-700 dark:text-red-500 mb-1">R석</div>
                          <div className="grid grid-cols-12 gap-0.5">
                            {Array(36)
                              .fill(0)
                              .map((_, i) => {
                                const isSelected = bookingInfo.selected_seats.some(
                                  (seat) => seat.includes("R석") || seat.includes("뒤"),
                                )
                                return (
                                  <div
                                    key={i}
                                    className={`h-3 rounded-sm ${
                                      isSelected && i >= 15 && i <= 20
                                        ? "bg-purple-600 dark:bg-purple-500"
                                        : "bg-gray-200 dark:bg-gray-700"
                                    }`}
                                  ></div>
                                )
                              })}
                          </div>
                        </div>
                      )}

                      {/* S석 구역 표시 */}
                      {bookingInfo.selected_seats.some((seat) => seat.includes("S") || seat.includes("2층")) && (
                        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded p-2">
                          <div className="text-xs font-semibold text-purple-700 dark:text-purple-500 mb-1">S석 (2층)</div>
                          <div className="grid grid-cols-12 gap-0.5">
                            {Array(36)
                              .fill(0)
                              .map((_, i) => {
                                const isSelected = bookingInfo.selected_seats.some(
                                  (seat) => seat.includes("S석") || seat.includes("2층"),
                                )
                                return (
                                  <div
                                    key={i}
                                    className={`h-3 rounded-sm ${
                                      isSelected && i >= 15 && i <= 20
                                        ? "bg-purple-600 dark:bg-purple-500"
                                        : "bg-gray-200 dark:bg-gray-700"
                                    }`}
                                  ></div>
                                )
                              })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 범례 */}
                    <div className="flex justify-center gap-3 mt-3 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-purple-600 dark:bg-purple-500 rounded-sm"></div>
                        <span className="text-gray-600 dark:text-gray-400">내 좌석</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-sm"></div>
                        <span className="text-gray-600 dark:text-gray-400">기타 좌석</span>
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
          : // 예매 정보가 없을 때 표시
            isLoading
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
              <p className="text-sm dark:text-purple-300 font-semibold mb-2 text-purple-600">📌 안내사항</p>
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
