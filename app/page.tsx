"use client"

import type React from "react"
import HomeScreen from "@/components/home-screen"
import MusicalDetail from "@/components/musical-detail"
import MobileSeatMap from "@/components/mobile-seat-map"
import SeatSelectionButton from "@/components/seat-selection-button"
import { getMusicalById } from "@/data/musicals"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { User, CheckCircle, Ticket, ArrowLeft, Loader2, Home, Music } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type PageType = "info" | "booking" | "seat-selection" | "success"
type ScreenType = "home" | "musical"

interface BookingData {
  seatGrade: string
  name: string
  studentId: string
  specialRequest: string
  agreeTerms: boolean
}

interface SuccessData {
  bookingId: number
  bookingDate: string
}

export default function MusicalBookingSite() {
  const [currentPage, setCurrentPage] = useState<PageType>("info")
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("home")
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [bookingData, setBookingData] = useState<BookingData>({
    seatGrade: "",
    name: "",
    studentId: "",
    specialRequest: "",
    agreeTerms: false,
  })
  const [successData, setSuccessData] = useState<SuccessData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [unavailableSeats, setUnavailableSeats] = useState<Record<string, Record<string, string[]>>>({})
  const [isLoadingSeats, setIsLoadingSeats] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "demo" | "error">("connected")
  const [statistics, setStatistics] = useState({ total_bookings: 0, total_seats_booked: 0, unique_students: 0 })
  const { toast } = useToast()
  const [isMobile, setIsMobile] = useState(false)
  const [selectedMusicalId, setSelectedMusicalId] = useState<string | null>(null)

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const currentMusical = selectedMusicalId ? getMusicalById(selectedMusicalId) : getMusicalById("dead-poets-society")
  const musicalInfo = currentMusical!

  // 좌석 상태 로드 (작품별)
  useEffect(() => {
    if (currentPage !== "seat-selection" && currentPage !== "booking") return

    const loadSeatStatus = async () => {
      setIsLoadingSeats(true)
      const musicalId = selectedMusicalId || "dead-poets-society"

      try {
        const response = await fetch(`/api/seats/${musicalId}`)

        if (!response.ok) {
          console.warn(`API 응답 오류: ${response.status} ${response.statusText}`)
          setUnavailableSeats({
            "1층": { VIP: [], R: [] },
            "2층": { S: [] },
          })
          setConnectionStatus("error")
          return
        }

        const data = await response.json()

        if (data.success) {
          setUnavailableSeats(data.unavailableSeats || {})
          setStatistics(data.statistics || { total_bookings: 0, total_seats_booked: 0, unique_students: 0 })

          if (data.needsSetup) {
            setConnectionStatus("error")
            toast({
              title: "데이터베이스 설정 필요",
              description: `${musicalInfo.title} SQL 스크립트를 실행하여 데이터베이스 테이블을 생성해주세요.`,
              variant: "destructive",
            })
          } else if (data.message && data.message.includes("오류")) {
            setConnectionStatus("error")
          } else {
            setConnectionStatus("connected")
          }
        } else {
          console.warn("API 응답 실패:", data.error)
          setUnavailableSeats({
            "1층": { VIP: [], R: [] },
            "2층": { S: [] },
          })
          setConnectionStatus("error")
        }
      } catch (error) {
        console.error("좌석 상태 로드 실패:", error)
        setConnectionStatus("error")

        setUnavailableSeats({
          "1층": { VIP: [], R: [] },
          "2층": { S: [] },
        })

        toast({
          title: "연결 오류",
          description: "서버 연결에 문제가 있습니다. 기본 모드로 실행됩니다.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingSeats(false)
      }
    }

    loadSeatStatus()
  }, [toast, selectedMusicalId, currentPage])

  const handleSeatClick = (seatId: string, seatGrade: string) => {
    if (bookingData.seatGrade && bookingData.seatGrade !== seatGrade) {
      toast({
        title: "좌석 등급 오류",
        description: "같은 등급의 좌석만 선택할 수 있습니다.",
        variant: "destructive",
      })
      return
    }

    if (selectedSeats.length >= 8 && !selectedSeats.includes(seatId)) {
      toast({
        title: "선택 제한",
        description: "최대 8개의 좌석까지 선택할 수 있습니다.",
        variant: "destructive",
      })
      return
    }

    if (selectedSeats.includes(seatId)) {
      setSelectedSeats((prev) => prev.filter((seat) => seat !== seatId))
      if (selectedSeats.length === 1) {
        setBookingData((prev) => ({ ...prev, seatGrade: "" }))
      }
    } else {
      setSelectedSeats((prev) => [...prev, seatId])
      if (!bookingData.seatGrade) {
        setBookingData((prev) => ({ ...prev, seatGrade: seatGrade }))
      }
    }
  }

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setBookingData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedSeats.length === 0 || !bookingData.name || !bookingData.studentId || !bookingData.agreeTerms) {
      toast({
        title: "입력 오류",
        description: "필수 항목을 모두 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    const musicalId = selectedMusicalId || "dead-poets-society"

    try {
      const response = await fetch(`/api/bookings/${musicalId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: bookingData.name,
          studentId: bookingData.studentId,
          seatGrade: bookingData.seatGrade,
          selectedSeats: selectedSeats,
          specialRequest: bookingData.specialRequest,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 409 && errorData.conflictSeats) {
          toast({
            title: "좌석 충돌",
            description: `선택한 좌석 중 이미 예매된 좌석이 있습니다: ${errorData.conflictSeats.join(", ")}`,
            variant: "destructive",
          })
          // 좌석 상태 새로고침
          window.location.reload()
          return
        }
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setSuccessData({
          bookingId: data.bookingId,
          bookingDate: data.bookingDate,
        })
        setCurrentPage("success")
        toast({
          title: "신청 완료",
          description: data.message || "뮤지컬 관람 신청이 완료되었습니다.",
        })
      } else {
        toast({
          title: "신청 실패",
          description: data.error || "예매 처리 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("예매 요청 실패:", error)
      toast({
        title: "네트워크 오류",
        description: "서버와의 연결에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNavigateToMusical = (musicalId?: string) => {
    setSelectedMusicalId(musicalId || "dead-poets-society")
    setCurrentScreen("musical")
    setCurrentPage("info")
  }

  const handleNavigateToHome = () => {
    setCurrentScreen("home")
  }

  // 성공 페이지
  if (currentPage === "success") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border border-gray-200 bg-white shadow-lg">
          <CardContent className="pt-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <Ticket className="h-6 w-6 text-gray-900 absolute -top-1 -right-1" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">신청 완료!</h2>

            <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
              <h3 className="font-semibold text-purple-600 mb-3">신청 정보</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  <strong>예매번호:</strong> #{successData?.bookingId}
                </p>
                <p>
                  <strong>공연:</strong> {musicalInfo.title}
                </p>
                <p>
                  <strong>일시:</strong> {musicalInfo.date} {musicalInfo.time}
                </p>
                <p>
                  <strong>좌석:</strong> {bookingData.seatGrade}석 {selectedSeats.length}매
                </p>
                <p>
                  <strong>신청자:</strong> {bookingData.name} ({bookingData.studentId})
                </p>
                <p>
                  <strong>신청일시:</strong>{" "}
                  {successData?.bookingDate ? new Date(successData.bookingDate).toLocaleString("ko-KR") : ""}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg mb-6 text-sm text-gray-700">
              <p className="font-semibold text-blue-600 mb-2">안내사항</p>
              <ul className="text-left space-y-1 text-blue-700">
                <li>• 공연 시간에 맞게 입장해주세요</li>
                <li>• 자리를 기억해두세요</li>
                <li>• 학번 이름을 통해 자리를 조회할 수 있습니다.</li>
                <li>• 공연 문의: 아르떼 공식 인스타로 :)</li>
                <li>• 사이트 제작: 1323 제시원</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setCurrentPage("info")
                  setBookingData({
                    seatGrade: "",
                    name: "",
                    studentId: "",
                    specialRequest: "",
                    agreeTerms: false,
                  })
                  setSelectedSeats([])
                  setSuccessData(null)
                }}
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                처음으로
              </Button>
              <Button
                onClick={() => setCurrentPage("booking")}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                추가 신청
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 좌석 선택 페이지
  if (currentPage === "seat-selection") {
    return (
      <MobileSeatMap
        seatGrades={musicalInfo.seatGrades}
        selectedSeats={selectedSeats}
        onSeatClick={handleSeatClick}
        unavailableSeats={unavailableSeats}
        statistics={statistics}
        connectionStatus={connectionStatus}
        selectedSeatGrade={bookingData.seatGrade}
        onClose={() => setCurrentPage("booking")}
      />
    )
  }

  // 예매 페이지
  if (currentPage === "booking") {
    return (
      <div className="min-h-screen bg-gray-50 py-4 px-4 relative">
        <div className="max-w-2xl mx-auto">
          {/* 헤더 */}
          <div className="sticky top-0 z-20 bg-gray-50/90 backdrop-blur-sm -mx-4 px-4 py-4 mb-4">
            <div className="flex items-center">
              <Button
                onClick={() => setCurrentPage("info")}
                variant="ghost"
                size="icon"
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5 text-gray-900" />
              </Button>
              <h1 className="flex-1 text-center text-lg font-bold text-gray-900 pr-10">관람 신청</h1>
            </div>
          </div>

          {/* 작품 정보 */}
          <Card className="mb-4 border border-gray-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">{musicalInfo.title}</h2>
                  <p className="text-gray-600 text-sm">
                    {musicalInfo.date} {musicalInfo.time}
                  </p>
                  <p className="text-gray-500 text-sm">{musicalInfo.venue}</p>
                </div>
                <Badge className="bg-purple-100 text-purple-700 text-xs border-purple-200">
                  {musicalInfo.genre.replace(/[{}]/g, "")}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 좌석 선택 버튼 */}
          <div className="mb-4">
            <SeatSelectionButton
              onNavigateToSeatSelection={() => setCurrentPage("seat-selection")}
              selectedSeatsCount={selectedSeats.length}
            />
          </div>

          {/* 신청자 정보 */}
          <Card className="mt-4 border border-gray-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <User className="h-5 w-5" />
                신청자 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-medium text-sm text-gray-700">
                      이름 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={bookingData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="홍길동"
                      required
                      className="border-gray-300 focus:border-purple-500 bg-white text-gray-900"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="studentId" className="font-medium text-sm text-gray-700">
                      학번 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="studentId"
                      value={bookingData.studentId}
                      onChange={(e) => handleInputChange("studentId", e.target.value)}
                      placeholder="1323"
                      required
                      className="border-gray-300 focus:border-purple-500 bg-white text-gray-900"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialRequest" className="font-medium text-sm text-gray-700">
                    다수 예매
                  </Label>
                  <Textarea
                    id="specialRequest"
                    value={bookingData.specialRequest}
                    onChange={(e) => handleInputChange("specialRequest", e.target.value)}
                    placeholder="*여러명 동시 예매라면 인원 전부 이름, 학번 기재해주세요!"
                    rows={3}
                    className="border-gray-300 focus:border-purple-500 bg-white text-gray-900"
                    disabled={isSubmitting}
                  />
                </div>

                {/* 약관 동의 */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="agreeTerms"
                      checked={bookingData.agreeTerms}
                      onCheckedChange={(checked) => handleInputChange("agreeTerms", checked as boolean)}
                      disabled={isSubmitting}
                      className="border-gray-400 data-[state=checked]:bg-purple-600 data-[state=checked]:text-white"
                    />
                    <Label htmlFor="agreeTerms" className="text-sm text-gray-700">
                      관람 예절을 지키겠습니다. <span className="text-red-500">*</span>
                    </Label>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 mt-6"
                  size="lg"
                  disabled={isSubmitting || selectedSeats.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      처리중...
                    </>
                  ) : (
                    <>
                      <Ticket className="h-5 w-5 mr-2" />
                      신청하기 ({selectedSeats.length}매)
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Fixed Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
          <div className="flex justify-around items-start pt-1 pb-2">
            <Button
              variant="ghost"
              className="flex flex-col items-center space-y-1 text-gray-600 hover:text-purple-600 transition-colors h-auto p-2"
              onClick={handleNavigateToHome}
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
        </div>
      </div>
    )
  }

  // 작품 소개 페이지
  if (currentScreen === "musical") {
    return (
      <MusicalDetail
        musicalInfo={musicalInfo}
        onNavigateBack={handleNavigateToHome}
        onNavigateToBooking={() => setCurrentPage("booking")}
        isMobile={isMobile}
      />
    )
  }

  // Home Screen
  return <HomeScreen onNavigateToMusical={handleNavigateToMusical} isMobile={isMobile} />
}
