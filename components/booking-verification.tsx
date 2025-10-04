"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calendar, Loader2, CheckCircle2 } from "lucide-react"
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6"
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
        {bookingInfo && selectedMusical && (
          <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <CardContent className="p-6 space-y-6">
              {/* 공연 정보 */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedMusical.title.replace(/[<>]/g, "")}
                </h2>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    {selectedMusical.date} {selectedMusical.time}
                  </span>
                </div>
              </div>

              <div className="h-px bg-gray-200 dark:bg-gray-700"></div>

              {/* 예매자 정보 */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">이름</span>
                  <span className="font-bold text-gray-900 dark:text-white">{bookingInfo.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">학번</span>
                  <span className="font-bold text-gray-900 dark:text-white">{bookingInfo.student_id}</span>
                </div>
              </div>

              {/* 간단한 좌석 배치 표시 */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="text-center mb-4">
                  <div className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold py-2 px-6 rounded-lg">
                    STAGE
                  </div>
                </div>

                {/* 간소화된 좌석 그리드 */}
                <div className="grid grid-cols-10 gap-1 mb-4">
                  {Array(50)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="h-6 bg-gray-300 dark:bg-gray-700 rounded"></div>
                    ))}
                </div>
              </div>

              {/* 나의 좌석 */}
              <div className="text-center bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">나의 좌석</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {bookingInfo.seat_grade}석 {bookingInfo.selected_seats.length}매
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {bookingInfo.selected_seats.map((seat, index) => (
                    <div
                      key={index}
                      className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-xs font-medium"
                    >
                      {seat.split("-").slice(-2).join(" ")}
                    </div>
                  ))}
                </div>
              </div>

              {/* 예매 일시 */}
              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                예매일시: {new Date(bookingInfo.booking_date).toLocaleString("ko-KR")}
              </div>

              {bookingInfo.special_request && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">특별 요청사항</p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">{bookingInfo.special_request}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 안내 메시지 */}
        {!bookingInfo && (
          <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <CardContent className="p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold mb-2">📌 안내사항</p>
              <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
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
