"use client"
import { Button } from "@/components/ui/button"
import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { User, ArrowLeft, ArrowRight, MapPin, Home, Music, Ticket, CheckCircle2 } from "lucide-react"
import type { MusicalInfo } from "@/types/musical"

interface BookingFormProps {
  musicalInfo: MusicalInfo
  bookingData: {
    seatGrade: string
    name: string
    studentId: string
    specialRequest: string
    agreeTerms: boolean
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

          {/* 신청자 정보 */}
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <User className="h-5 w-5" />
                신청자 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-medium text-sm text-gray-700">
                    이름 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={bookingData.name}
                    onChange={(e) => onInputChange("name", e.target.value)}
                    placeholder="ex) 제시원"
                    required
                    disabled={isSubmitting}
                    className="border-gray-300 focus:border-purple-500 bg-white text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentId" className="font-medium text-sm text-gray-700">
                    학번 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="studentId"
                    value={bookingData.studentId}
                    onChange={(e) => onInputChange("studentId", e.target.value)}
                    placeholder="1323"
                    required
                    disabled={isSubmitting}
                    className="border-gray-300 focus:border-purple-500 bg-white text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialRequest" className="font-medium text-sm text-gray-700">
                    특별 요청사항
                  </Label>
                  <Textarea
                    id="specialRequest"
                    value={bookingData.specialRequest}
                    onChange={(e) => onInputChange("specialRequest", e.target.value)}
                    placeholder="여러 자리 예약이라면 관람자 다 학번 이름 적어주세요"
                    rows={3}
                    disabled={isSubmitting}
                    className="border-gray-300 focus:border-purple-500 bg-white text-gray-900"
                  />
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="agreeTerms"
                      checked={bookingData.agreeTerms}
                      onCheckedChange={(checked) => onInputChange("agreeTerms", checked as boolean)}
                      disabled={isSubmitting}
                      className="border-gray-400 data-[state=checked]:bg-purple-600 data-[state=checked]:text-white"
                    />
                    <Label htmlFor="agreeTerms" className="text-sm text-gray-700 cursor-pointer">
                      관람 예절을 지키겠습니다. <span className="text-red-500">*</span>
                    </Label>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    selectedSeats.length === 0 ||
                    !bookingData.name ||
                    !bookingData.studentId ||
                    !bookingData.agreeTerms
                  }
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 font-bold text-base"
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
                <li>• 좌석선택 후 신청자 정보를 입력해주세요!</li>
                <li>• 다수 예약일 경우 관람자 모두 작성 !    </li>
                <li>• 공연 시간과 좌석에 맞춰 입장해주세요!    </li>
                <li>• 🙏문의: 아르떼 인스타!  </li>
                <li>• 재밌게 관람하기 🥰 </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
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
            <span className="text-xs font-bold">뮤지컬</span>
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
            <span className="text-xs">프로필</span>
          </Button>
        </div>
      </footer>
    </div>
  )
}
