"use client"

import { useState } from "react"
import { ArrowLeft, CheckCircle2, Loader2, Ticket } from "lucide-react"
import BookingTicket from "@/components/booking-ticket"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  shareToken?: string | null
}

export default function BookingVerification({ onBack }: BookingVerificationProps) {
  const [studentId, setStudentId] = useState("")
  const [name, setName] = useState("")
  const [selectedMusicalId, setSelectedMusicalId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [bookingList, setBookingList] = useState<BookingInfo[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const { toast } = useToast()

  const musicals = getAllMusicals()
  const selectedMusical = musicals.find((musical) => musical.id === selectedMusicalId)

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
          description: "입력한 정보와 일치하는 예매 내역이 없습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Booking verification failed:", error)
      toast({ title: "오류", description: "서버 연결에 실패했습니다.", variant: "destructive" })
    } finally {
      setIsLoading(false)
      setHasSearched(true)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center p-4">
          <Button onClick={onBack} variant="ghost" size="icon" className="p-2">
            <ArrowLeft className="h-5 w-5 text-gray-900 dark:text-white" />
          </Button>
          <h1 className="flex-1 pr-10 text-center text-lg font-bold text-gray-900 dark:text-white">예매 내역 조회</h1>
        </div>
      </header>

      <main className="flex-1 space-y-6 overflow-y-auto p-4 pb-20">
        <Card className="border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <Label className="text-gray-900 dark:text-white">공연 선택</Label>
              <Select value={selectedMusicalId} onValueChange={setSelectedMusicalId}>
                <SelectTrigger className="border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
                  <SelectValue placeholder="공연을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {musicals.map((musical) => (
                    <SelectItem key={musical.id} value={musical.id}>
                      {musical.title}
                    </SelectItem>
                  ))}
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

            <Button onClick={handleVerify} disabled={isLoading} className="w-full bg-purple-600 py-6 font-semibold text-white hover:bg-purple-700">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  조회 중...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  조회하기
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {bookingList.map((booking) => (
            <BookingTicket
              key={booking.id}
              variant="list"
              shareToken={booking.shareToken}
              ticket={{
                bookingId: booking.id,
                bookingDate: booking.booking_date,
                name: booking.name,
                studentId: booking.student_id,
                seatGrade: booking.seat_grade,
                selectedSeats: booking.selected_seats,
                musicalTitle: selectedMusical?.title || "공연 정보",
                musicalDate: selectedMusical?.date || "",
                musicalTime: selectedMusical?.time || "",
                venue: selectedMusical?.venue || "",
              }}
            />
          ))}
        </div>

        {hasSearched && bookingList.length === 0 && !isLoading && (
          <div className="py-10 text-center text-gray-500">
            <Ticket className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p>예매 내역이 없습니다.</p>
          </div>
        )}
      </main>
    </div>
  )
}
