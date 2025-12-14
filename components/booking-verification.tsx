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
import { Badge } from "@/components/ui/badge" // Badge 컴포넌트 필요 (없으면 div로 대체 가능)

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
  const [bookingList, setBookingList] = useState<BookingInfo[]>([])
  const [hasSearched, setHasSearched] = useState(false)
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

  // 좌석 렌더링 함수
  const renderSeatRow = (
    floor: string,
    section: string,
    rowNum: number,
    currentBookingSeats: string[],
    gradeColor: string,
    seatColorClass: string // 선택된 좌석의 색상 (등급별)
  ) => {
    const seats = []
    
    const createSeat = (pos: string, idx: number) => {
        const seatId = floor === "1층" 
            ? `1층-${section === "앞블럭" ? "앞" : "뒤"}-${rowNum}줄-${pos}-${idx}번` 
            : `2층-${rowNum}줄-${pos}-${idx}번`
        const isSelected = currentBookingSeats.includes(seatId)
        
        return (
            <div 
              key={`${pos}-${idx}`} 
              className={`h-2 w-2 rounded-sm transition-all ${
                isSelected 
                  ? `${seatColorClass} scale-125 ring-1 ring-white shadow-sm` // 내 좌석 강조
                  : gradeColor // 빈 좌석 색상
              }`}
            ></div>
        )
    }
    
    for (let i = 1; i <= 6; i++) seats.push(createSeat("왼쪽", i))
    seats.push(<div key="aisle-1" className="w-1"></div>)
    for (let i = 1; i <= 12; i++) seats.push(createSeat("중앙", i))
    seats.push(<div key="aisle-2" className="w-1"></div>)
    for (let i = 1; i <= 6; i++) seats.push(createSeat("오른쪽", i))

    return (
      <div key={`row-${rowNum}`} className="flex items-center gap-0.5 justify-center">
        <span className="text-[8px] w-4 text-center text-gray-400">{rowNum}</span>
        {seats}
      </div>
    )
  }

  // 등급별 스타일 설정을 가져오는 헬퍼 함수
  const getGradeConfig = (grade: string) => {
    switch (grade) {
      case "VIP":
        return {
          color: "text-yellow-600 dark:text-yellow-400",
          bgColor: "bg-yellow-50 dark:bg-yellow-900/10",
          borderColor: "border-yellow-200 dark:border-yellow-800",
          
          // 👇 [수정] 내 좌석은 보라색, 빈 좌석은 구역 색상(진한 파스텔톤)으로 복구
          seatColor: "bg-purple-600 dark:bg-purple-500", 
          emptySeatColor: "bg-yellow-200 dark:bg-yellow-900/30",
          
          floor: "1층",
          section: "앞블럭",
          rows: 9,
          label: "1층 앞블럭 (VIP석)"
        }
      case "R석":
        return {
          color: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-50 dark:bg-red-900/10",
          borderColor: "border-red-200 dark:border-red-800",
          
          // 👇 [수정] 내 좌석은 보라색
          seatColor: "bg-purple-600 dark:bg-purple-500",
          emptySeatColor: "bg-red-200 dark:bg-red-900/30",
          
          floor: "1층",
          section: "뒷블럭",
          rows: 8,
          label: "1층 뒷블럭 (R석)"
        }
      case "S석":
        return {
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-900/10",
          borderColor: "border-blue-200 dark:border-blue-800",
          
          // 👇 [수정] 내 좌석은 보라색
          seatColor: "bg-purple-600 dark:bg-purple-500",
          emptySeatColor: "bg-blue-200 dark:bg-blue-900/30",
          
          floor: "2층",
          section: "전체",
          rows: 8,
          label: "2층 전체 (S석)"
        }
      default:
        return {
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          seatColor: "bg-purple-600",
          emptySeatColor: "bg-gray-200",
          floor: "1층",
          section: "앞블럭",
          rows: 9,
          label: "좌석 정보"
        }
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center p-4">
          <Button onClick={onBack} variant="ghost" size="icon" className="p-2">
            <ArrowLeft className="h-5 w-5 text-gray-900 dark:text-white" />
          </Button>
          <h1 className="flex-1 text-center text-lg font-bold text-gray-900 dark:text-white pr-10">예매 내역 조회</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
        {/* 입력 폼 */}
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-900 dark:text-white">공연 선택</Label>
              <Select value={selectedMusicalId} onValueChange={setSelectedMusicalId}>
                <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                    <SelectValue placeholder="공연을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {musicals.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-gray-900 dark:text-white">이름</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" className="bg-white dark:bg-gray-800" />
                </div>
                <div className="space-y-2">
                    <Label className="text-gray-900 dark:text-white">학번</Label>
                    <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="1234" className="bg-white dark:bg-gray-800" />
                </div>
            </div>
            <Button onClick={handleVerify} disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-6">
              {isLoading ? <><Loader2 className="animate-spin mr-2"/> 조회 중...</> : "조회하기"}
            </Button>
          </CardContent>
        </Card>

        {/* 결과 리스트 */}
        <div className="space-y-6">
            {bookingList.map((booking, index) => {
                const config = getGradeConfig(booking.seat_grade) // 등급별 설정 가져오기

                return (
                    <Card key={booking.id} className={`shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden border-l-4 ${config.borderColor.replace('border', 'border-l')}`} style={{ animationDelay: `${index * 100}ms` }}>
                        <CardContent className="p-5 space-y-4">
                            {/* 헤더 */}
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={`${config.color} ${config.borderColor} bg-white dark:bg-gray-800`}>
                                        Ticket #{bookingList.length - index}
                                    </Badge>
                                    <span className={`text-sm font-bold ${config.color}`}>{booking.seat_grade}</span>
                                </div>
                                <span className="text-xs text-gray-500">{new Date(booking.booking_date).toLocaleString()}</span>
                            </div>

                            {/* 공연 정보 & 좌석 요약 */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                        {selectedMusical?.title || "공연 정보"}
                                    </h2>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                        <Calendar className="h-3 w-3" />
                                        {selectedMusical?.date}
                                    </div>
                                </div>
                                <div className={`px-3 py-2 rounded-lg text-center ${config.bgColor}`}>
                                    <div className={`text-xl font-bold ${config.color}`}>
                                        {booking.selected_seats.length}매
                                    </div>
                                    <div className="text-[10px] text-gray-500">예매 수량</div>
                                </div>
                            </div>

                            {/* 좌석 번호 태그 */}
                            <div className="flex flex-wrap gap-1">
                                {booking.selected_seats.map(seat => (
                                    <span key={seat} className={`text-xs px-2 py-1 rounded shadow-sm border font-medium ${config.bgColor} ${config.color} ${config.borderColor}`}>
                                        {seat.split("-").slice(-2).join(" ")}
                                    </span>
                                ))}
                            </div>

                            {/* [수정됨] 나만의 좌석 미리보기 (등급별 동적 렌더링) */}
                            <div className={`p-3 rounded-xl border ${config.borderColor} ${config.bgColor} bg-opacity-30 dark:bg-opacity-10`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className={`text-xs font-bold ${config.color} flex items-center gap-1`}>
                                        <Theater className="h-3 w-3" />
                                        {config.label} 구역
                                    </div>
                                    <div className="flex gap-2 text-[10px]">
                                        <span className="flex items-center gap-1"><div className={`w-2 h-2 rounded-full ${config.seatColor}`}></div>내 자리</span>
                                    </div>
                                </div>
                                
                                {/* 실제 좌석 렌더링 */}
                                <div className="space-y-0.5 scale-95 origin-center">
                                    {Array.from({ length: config.rows }, (_, i) => 
                                        renderSeatRow(
                                            config.floor, 
                                            config.section, 
                                            i + 1, 
                                            booking.selected_seats, 
                                            config.emptySeatColor, // 빈 좌석 색상
                                            config.seatColor // 내 좌석 강조 색상
                                        )
                                    )}
                                </div>
                            </div>
                            
                            {booking.special_request && (
                                <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                    Note: {booking.special_request}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )
            })}
        </div>

        {/* 결과 없음 */}
        {hasSearched && bookingList.length === 0 && !isLoading && (
            <div className="text-center py-10 text-gray-500">
                <Ticket className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>예매 내역이 없습니다.</p>
            </div>
        )}
      </main>
    </div>
  )
}
