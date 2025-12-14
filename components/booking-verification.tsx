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
  
  // 👇 [수정] 단일 객체가 아니라 '배열'로 상태 관리
  const [bookingList, setBookingList] = useState<BookingInfo[]>([])
  const [hasSearched, setHasSearched] = useState(false) // 검색 시도 여부
  const { toast } = useToast()

  const musicals = getAllMusicals()
  const selectedMusical = musicals.find((m) => m.id === selectedMusicalId)

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
    setBookingList([]) 
    setHasSearched(false)

    try {
      const response = await fetch("/api/bookings/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          studentId: studentId.trim(),
          musicalId: selectedMusicalId,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success && data.bookings) {
        // 👇 [수정] 배열 데이터 저장
        setBookingList(data.bookings)
        toast({ title: "조회 성공", description: `${data.bookings.length}건의 예매 내역을 찾았습니다.` })
      } else {
        toast({
          title: "예매 정보 없음",
          description: "해당 정보로 예매된 내역이 없습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("오류:", error)
      toast({ title: "오류", description: "서버 연결 실패", variant: "destructive" })
    } finally {
      setIsLoading(false)
      setHasSearched(true)
    }
  }

  // 좌석 렌더링 헬퍼 함수 (그대로 유지하되, selectedSeats를 인자로 받음)
  const renderSeatRow = (
    floor: string,
    section: string,
    rowNum: number,
    currentBookingSeats: string[], // 이 예매 건의 좌석들
    gradeColor: string,
  ) => {
    const seats = []
    // ... (기존 로직과 동일하되 selectedSeats 대신 currentBookingSeats 사용) ...
    // 편의를 위해 내부 로직 요약:
    const createSeat = (pos: string, idx: number) => {
        const seatId = floor === "1층" 
            ? `1층-${section === "앞블럭" ? "앞" : "뒤"}-${rowNum}줄-${pos}-${idx}번` 
            : `2층-${rowNum}줄-${pos}-${idx}번`
        const isSelected = currentBookingSeats.includes(seatId)
        return (
            <div key={`${pos}-${idx}`} className={`h-2 w-2 rounded-sm ${isSelected ? "bg-purple-600" : gradeColor}`}></div>
        )
    }
    
    // 왼쪽
    for (let i = 1; i <= 6; i++) seats.push(createSeat("왼쪽", i))
    seats.push(<div key="aisle-1" className="w-1"></div>)
    // 중앙
    for (let i = 1; i <= 12; i++) seats.push(createSeat("중앙", i))
    seats.push(<div key="aisle-2" className="w-1"></div>)
    // 오른쪽
    for (let i = 1; i <= 6; i++) seats.push(createSeat("오른쪽", i))

    return (
      <div key={`row-${rowNum}`} className="flex items-center gap-0.5 justify-center">
        <span className="text-[8px] w-4 text-center text-gray-400">{rowNum}</span>
        {seats}
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center p-4">
          <Button onClick={onBack} variant="ghost" size="icon" className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="flex-1 text-center text-lg font-bold pr-10">예매 내역 조회</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 입력 폼 */}
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>공연 선택</Label>
              <Select value={selectedMusicalId} onValueChange={setSelectedMusicalId}>
                <SelectTrigger><SelectValue placeholder="공연을 선택하세요" /></SelectTrigger>
                <SelectContent>
                  {musicals.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>이름</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
                </div>
                <div className="space-y-2">
                    <Label>학번</Label>
                    <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="1234" />
                </div>
            </div>
            <Button onClick={handleVerify} disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              {isLoading ? <><Loader2 className="animate-spin mr-2"/> 조회 중...</> : "조회하기"}
            </Button>
          </CardContent>
        </Card>

        {/* 👇 [수정] 결과 리스트 반복 렌더링 */}
        <div className="space-y-6">
            {bookingList.map((booking, index) => (
                <Card key={booking.id} className="border-l-4 border-l-purple-600 shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                    <CardContent className="p-5 space-y-4">
                        {/* 헤더: 몇 번째 예매인지 표시 */}
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-sm font-bold text-purple-600">Ticket #{index + 1}</span>
                            <span className="text-xs text-gray-500">{new Date(booking.booking_date).toLocaleString()}</span>
                        </div>

                        {/* 공연 정보 */}
                        {selectedMusical && (
                            <div>
                                <h2 className="text-xl font-bold">{selectedMusical.title}</h2>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                    <Calendar className="h-3 w-3" />
                                    {selectedMusical.date} {selectedMusical.time}
                                </div>
                            </div>
                        )}

                        {/* 좌석 정보 */}
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-center">
                            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                                {booking.seat_grade}석 {booking.selected_seats.length}매
                            </div>
                            <div className="flex flex-wrap justify-center gap-1 mt-2">
                                {booking.selected_seats.map(seat => (
                                    <span key={seat} className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm border">
                                        {seat.split("-").slice(-2).join(" ")}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* 이 티켓만의 좌석 배치도 (축소판) */}
                        <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-100">
                            <div className="text-center text-xs text-gray-400 mb-2">My Seats Preview</div>
                            {/* 1층만 예시로 렌더링 (공간 절약을 위해) */}
                            <div className="space-y-0.5 scale-90 origin-top">
                                {Array.from({ length: 9 }, (_, i) => renderSeatRow("1층", "앞블럭", i + 1, booking.selected_seats, "bg-gray-200"))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>

        {/* 결과 없음 메시지 */}
        {hasSearched && bookingList.length === 0 && !isLoading && (
            <div className="text-center py-10 text-gray-500">
                <Ticket className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p>예매 내역이 없습니다.</p>
            </div>
        )}
      </main>
    </div>
  )
}
