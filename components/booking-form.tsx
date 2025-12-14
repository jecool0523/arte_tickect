"use client"
import { Button } from "@/components/ui/button"
import type React from "react"
import { useState, useEffect, useRef } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { User, ArrowLeft, ArrowRight, MapPin, Home, Music, Ticket, CheckCircle2, Users } from "lucide-react"
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
  // 관람자 명단 로컬 상태 관리
  const [attendees, setAttendees] = useState<{ name: string; studentId: string }[]>([])
  // 사용자 직접 입력 메모 로컬 상태
  const [userMemo, setUserMemo] = useState("")
  const previousSpecialRequestRef = useRef<string>("")

  // 초기화 및 좌석 수 변경 시 입력 필드 동기화
  useEffect(() => {
    setAttendees((prev) => {
      const newAttendees = [...prev]
      // 좌석 수보다 입력칸이 적으면 추가
      if (newAttendees.length < selectedSeats.length) {
        const diff = selectedSeats.length - newAttendees.length
        for (let i = 0; i < diff; i++) {
          newAttendees.push({ name: "", studentId: "" })
        }
      }
      // 좌석 수보다 입력칸이 많으면 뒤에서부터 제거
      else if (newAttendees.length > selectedSeats.length) {
        newAttendees.splice(selectedSeats.length)
      }
      return newAttendees
    })
  }, [selectedSeats.length])

  // 정보가 변경될 때마다 부모(상위 컴포넌트) 데이터 업데이트
  useEffect(() => {
    if (attendees.length === 0) return

    // 1. 첫 번째 사람을 대표자로 설정 (조회용)
    const representative = attendees[0]
    onInputChange("name", representative.name)
    onInputChange("studentId", representative.studentId)

    // 2. 전체 명단을 텍스트로 변환하여 specialRequest에 저장
    const attendeesListStr = attendees
      .map((a, i) => {
        // 좌석 번호 예쁘게 파싱 (예: 1층-앞-1줄-중앙-1번 -> 중앙 1번)
        const seatName = selectedSeats[i] ? selectedSeats[i].split("-").slice(-2).join(" ") : `좌석${i + 1}`
        // 이름/학번이 비어있으면 (미입력) 표시
        const nameStr = a.name || "(이름미입력)"
        const idStr = a.studentId || "(학번미입력)"
        return `[${seatName}] ${nameStr} (${idStr})`
      })
      .join("\n")

    // 사용자가 쓴 메모와 자동 생성된 명단을 합침
    const finalRequest = userMemo.trim()
      ? `${userMemo}\n\n[관람자 명단]\n${attendeesListStr}`
      : `[관람자 명단]\n${attendeesListStr}`

    if (previousSpecialRequestRef.current !== finalRequest) {
      previousSpecialRequestRef.current = finalRequest
      onInputChange("specialRequest", finalRequest)
    }
  }, [attendees, userMemo, selectedSeats]) // Removed onInputChange and bookingData.specialRequest from dependencies

  // 개별 입력 핸들러
  const handleAttendeeChange = (index: number, field: "name" | "studentId", value: string) => {
    setAttendees((prev) => {
      const newArr = [...prev]
      newArr[index] = { ...newArr[index], [field]: value }
      return newArr
    })
  }

  // 폼 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // 빈 값 체크
    const hasEmpty = attendees.some((a) => !a.name.trim() || !a.studentId.trim())
    if (hasEmpty) {
      alert("모든 관람자의 이름과 학번을 입력해주세요.")
      return
    }
    onSubmit(e)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center p-4">
          <Button onClick={onBack} variant="ghost" size="icon" className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-900" />
          </Button>
          <h1 className="flex-1 text-center text-lg font-bold text-gray-900 pr-10">관람 신청서</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* 작품 정보 */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">{musicalInfo.title}</h2>
                  <p className="text-gray-600 text-sm">
                    {musicalInfo.date} {musicalInfo.time}
                  </p>
                  <p className="text-gray-500 text-sm">{musicalInfo.venue}</p>
                </div>
                <Badge className="bg-purple-100 text-purple-700 text-xs border-purple-200 font-mono">
                  {musicalInfo.genre.replace(/[{}]/g, "")}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 좌석 선택 안내 */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-600 rounded-full p-2">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">좌석 선택</h3>
                    {selectedSeats.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        <p className="text-sm text-purple-700">
                          {bookingData.seatGrade}석 {selectedSeats.length}매 선택됨
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">좌석을 선택해주세요</p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={onNavigateToSeatSelection}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                >
                  {selectedSeats.length > 0 ? "좌석 변경" : "좌석 선택"}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {selectedSeats.length > 0 && (
                <div className="mt-3 pt-3 border-t border-purple-200">
                  <div className="flex flex-wrap gap-1">
                    {selectedSeats.slice(0, 8).map((seatId, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-xs bg-white text-purple-700 border-purple-300 px-1.5 py-0.5"
                      >
                        {seatId.split("-").slice(-2).join("-")}
                      </Badge>
                    ))}
                    {selectedSeats.length > 8 && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-white text-purple-700 border-purple-300 px-1.5 py-0.5"
                      >
                        +{selectedSeats.length - 8}개
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 관람자 정보 (반복 렌더링) */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="flex items-center gap-2 text-gray-900 text-lg">
                <Users className="h-5 w-5" />
                관람자 정보 입력 ({selectedSeats.length}명)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              <form onSubmit={handleSubmit}>
                {/* 좌석 수만큼 반복 */}
                {attendees.map((attendee, index) => (
                  <div
                    key={index}
                    className="space-y-3 pb-4 border-b border-dashed border-gray-200 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                        {selectedSeats[index]
                          ? selectedSeats[index].split("-").slice(-2).join(" ")
                          : `관람자 ${index + 1}`}
                      </Badge>
                      {index === 0 && (
                        <span className="text-xs text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full">
                          대표 예매자 (티켓 조회용)
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
                          className="h-10 border-gray-300 focus:border-purple-500 bg-white text-gray-900"
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
                          className="h-10 border-gray-300 focus:border-purple-500 bg-white text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="mt-6 space-y-2">
                  <Label htmlFor="userMemo" className="font-medium text-sm text-gray-700">
                    추가 요청사항 (선택)
                  </Label>
                  <Textarea
                    id="userMemo"
                    value={userMemo}
                    onChange={(e) => setUserMemo(e.target.value)}
                    placeholder="문의사항이 있다면 적어주세요."
                    rows={2}
                    disabled={isSubmitting}
                    className="border-gray-300 focus:border-purple-500 bg-white text-gray-900 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || selectedSeats.length === 0}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 mt-6 font-bold text-base shadow-md"
                >
                  {isSubmitting ? (
                    <>처리중...</>
                  ) : (
                    <>
                      <Ticket className="h-5 w-5 mr-2" />
                      신청 완료하기 ({selectedSeats.length}매)
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <p className="text-sm text-blue-700 font-semibold mb-2">📌 안내사항</p>
              <ul className="text-sm text-blue-600 space-y-1">
                <li>
                  • <strong>대표 예매자</strong>의 학번으로 예매 내역을 조회할 수 있습니다.
                </li>
                <li>• 동반인의 정보도 정확하게 입력해주세요.</li>
                <li>• 공연 시간과 좌석에 맞춰 입장해주세요!</li>
                <li>• 문의: 아르떼 인스타 DM</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-start pt-1 pb-2">
          <Button
            variant="ghost"
            className="flex flex-col items-center space-y-1 text-gray-600 hover:text-purple-600 transition-colors h-auto p-2"
            onClick={onNavigateToHome}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">홈</span>
          </Button>
          <Button variant="ghost" className="flex flex-col items-center space-y-1 text-purple-600 h-auto p-2">
            <Music className="h-5 w-5" />
            <span className="text-xs font-bold">공연</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center space-y-1 text-gray-600 hover:text-purple-600 transition-colors h-auto p-2"
          >
            <Ticket className="h-5 w-5" />
            <span className="text-xs">내 티켓</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center space-y-1 text-gray-600 hover:text-purple-600 transition-colors h-auto p-2"
          >
            <User className="h-5 w-5" />
            <span className="text-xs font-serif font-semibold">ARTE</span>
          </Button>
        </div>
      </footer>
    </div>
  )
}
