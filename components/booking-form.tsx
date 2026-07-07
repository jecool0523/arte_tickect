"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, Home, MapPin, Music, Ticket, User, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getSeatDisplayLabel } from "@/lib/seat-map"
import type { MusicalInfo } from "@/types/musical"

interface BookingFormProps {
  musicalInfo: MusicalInfo
  bookingData: {
    seatGrade: string
    name: string
    studentId: string
    specialRequest: string
  }
  selectedSeats: string[]
  onInputChange: (field: string, value: string | number | boolean) => void
  onNavigateToSeatSelection: () => void
  onSubmit: (e: React.FormEvent) => void
  onBack: () => void
  onNavigateToHome: () => void
  isSubmitting: boolean
}

export default function BookingForm({
  musicalInfo,
  bookingData,
  selectedSeats,
  onInputChange,
  onNavigateToSeatSelection,
  onSubmit,
  onBack,
  onNavigateToHome,
  isSubmitting,
}: BookingFormProps) {
  const [attendees, setAttendees] = useState<{ name: string; studentId: string }[]>([])
  const [userMemo, setUserMemo] = useState("")
  const previousSpecialRequestRef = useRef("")

  useEffect(() => {
    setAttendees((prev) => {
      const next = [...prev]

      if (next.length < selectedSeats.length) {
        for (let i = next.length; i < selectedSeats.length; i++) {
          next.push({ name: "", studentId: "" })
        }
      } else if (next.length > selectedSeats.length) {
        next.splice(selectedSeats.length)
      }

      return next
    })
  }, [selectedSeats.length])

  useEffect(() => {
    if (attendees.length === 0) return

    const representative = attendees[0]
    onInputChange("name", representative.name)
    onInputChange("studentId", representative.studentId)

    const attendeesList = attendees
      .map((attendee, index) => {
        const seatName = selectedSeats[index] ? getSeatDisplayLabel(selectedSeats[index]) : `좌석 ${index + 1}`
        const name = attendee.name || "(이름 미입력)"
        const studentId = attendee.studentId || "(학번 미입력)"
        return `[${seatName}] ${name} (${studentId})`
      })
      .join("\n")

    const finalRequest = userMemo.trim()
      ? `${userMemo}\n\n[관람자 명단]\n${attendeesList}`
      : `[관람자 명단]\n${attendeesList}`

    if (previousSpecialRequestRef.current !== finalRequest) {
      previousSpecialRequestRef.current = finalRequest
      onInputChange("specialRequest", finalRequest)
    }
  }, [attendees, userMemo, selectedSeats, onInputChange])

  const handleAttendeeChange = (index: number, field: "name" | "studentId", value: string) => {
    setAttendees((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (attendees.some((attendee) => !attendee.name.trim() || !attendee.studentId.trim())) {
      alert("모든 관람자의 이름과 학번을 입력해주세요.")
      return
    }

    onSubmit(e)
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center p-4">
          <Button onClick={onBack} variant="ghost" size="icon" className="rounded-full p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-900" />
          </Button>
          <h1 className="flex-1 pr-10 text-center text-lg font-bold text-gray-900">관람 신청</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32">
        <div className="mx-auto max-w-2xl space-y-4 p-4">
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{musicalInfo.title}</h2>
                  <p className="text-sm text-gray-600">
                    {musicalInfo.date} {musicalInfo.time}
                  </p>
                  <p className="text-sm text-gray-500">{musicalInfo.venue}</p>
                </div>
                <Badge className="border-purple-200 bg-purple-100 font-mono text-xs text-purple-700">
                  {musicalInfo.genre.replace(/[{}]/g, "")}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-purple-600 p-2">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">좌석 선택</h3>
                    {selectedSeats.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        <p className="text-sm text-purple-700">
                          {bookingData.seatGrade} {selectedSeats.length}매 선택됨
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">좌석을 선택해주세요.</p>
                    )}
                  </div>
                </div>
                <Button onClick={onNavigateToSeatSelection} size="sm" className="bg-purple-600 font-semibold text-white hover:bg-purple-700">
                  {selectedSeats.length > 0 ? "좌석 변경" : "좌석 선택"}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>

              {selectedSeats.length > 0 && (
                <div className="mt-3 border-t border-purple-200 pt-3">
                  <div className="flex flex-wrap gap-1">
                    {selectedSeats.slice(0, 8).map((seatId) => (
                      <Badge key={seatId} variant="outline" className="border-purple-300 bg-white px-1.5 py-0.5 text-xs text-purple-700">
                        {getSeatDisplayLabel(seatId)}
                      </Badge>
                    ))}
                    {selectedSeats.length > 8 && (
                      <Badge variant="outline" className="border-purple-300 bg-white px-1.5 py-0.5 text-xs text-purple-700">
                        +{selectedSeats.length - 8}개
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                <Users className="h-5 w-5" />
                관람자 정보 입력 ({selectedSeats.length}명)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-4">
              <form onSubmit={handleSubmit}>
                {attendees.map((attendee, index) => (
                  <div key={index} className="space-y-3 border-b border-dashed border-gray-200 pb-4 last:border-0 last:pb-0">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                        {selectedSeats[index] ? getSeatDisplayLabel(selectedSeats[index]) : `관람자 ${index + 1}`}
                      </Badge>
                      {index === 0 && (
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-600">
                          대표 예매자
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`name-${index}`} className="text-xs font-medium text-gray-500">
                          이름 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`name-${index}`}
                          value={attendee.name}
                          onChange={(e) => handleAttendeeChange(index, "name", e.target.value)}
                          placeholder="홍길동"
                          required
                          disabled={isSubmitting}
                          className="h-10 border-gray-300 bg-white text-gray-900 focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`studentId-${index}`} className="text-xs font-medium text-gray-500">
                          학번 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`studentId-${index}`}
                          value={attendee.studentId}
                          onChange={(e) => handleAttendeeChange(index, "studentId", e.target.value)}
                          placeholder="1323"
                          required
                          disabled={isSubmitting}
                          className="h-10 border-gray-300 bg-white text-gray-900 focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="mt-6 space-y-2">
                  <Label htmlFor="userMemo" className="text-sm font-medium text-gray-700">
                    추가 요청사항 (선택)
                  </Label>
                  <Textarea
                    id="userMemo"
                    value={userMemo}
                    onChange={(e) => setUserMemo(e.target.value)}
                    placeholder="문의사항이 있다면 적어주세요."
                    rows={2}
                    disabled={isSubmitting}
                    className="resize-none border-gray-300 bg-white text-gray-900 focus:border-purple-500"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || selectedSeats.length === 0}
                  className="mt-6 w-full bg-purple-600 py-6 text-base font-bold text-white shadow-md hover:bg-purple-700"
                >
                  {isSubmitting ? (
                    <>처리 중...</>
                  ) : (
                    <>
                      <Ticket className="mr-2 h-5 w-5" />
                      신청 완료하기 ({selectedSeats.length}매)
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <p className="mb-2 text-sm font-semibold text-blue-700">안내사항</p>
              <ul className="space-y-1 text-sm text-blue-600">
                <li>대표 예매자의 이름과 학번으로 예매 내역을 조회할 수 있습니다.</li>
                <li>동반 관람자의 정보를 정확하게 입력해주세요.</li>
                <li>공연 시간과 좌석을 확인한 뒤 입장해주세요.</li>
                <li>문의는 아르떼 인스타그램 DM으로 부탁드립니다.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-start justify-around pb-2 pt-1">
          <Button variant="ghost" className="flex h-auto flex-col items-center space-y-1 p-2 text-gray-600 hover:text-purple-600" onClick={onNavigateToHome}>
            <Home className="h-5 w-5" />
            <span className="text-xs">홈</span>
          </Button>
          <Button variant="ghost" className="flex h-auto flex-col items-center space-y-1 p-2 text-purple-600">
            <Music className="h-5 w-5" />
            <span className="text-xs font-bold">공연</span>
          </Button>
          <Button variant="ghost" className="flex h-auto flex-col items-center space-y-1 p-2 text-gray-600 hover:text-purple-600">
            <Ticket className="h-5 w-5" />
            <span className="text-xs">예매</span>
          </Button>
          <Button variant="ghost" className="flex h-auto flex-col items-center space-y-1 p-2 text-gray-600 hover:text-purple-600">
            <User className="h-5 w-5" />
            <span className="font-serif text-xs font-semibold">ARTE</span>
          </Button>
        </div>
      </footer>
    </div>
  )
}
