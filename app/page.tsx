"use client"

import type React from "react"
import HomeScreen from "@/components/home-screen"
import MusicalDetail from "@/components/musical-detail"
import BookingForm from "@/components/booking-form"
import SeatSelectionWindow from "@/components/seat-selection-window"
import BookingVerification from "@/components/booking-verification"
import { getMusicalById } from "@/data/musicals"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Ticket, Loader2, AlertCircle, CircleAlert } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type PageType = "info" | "form" | "seats" | "success" | "not_in_period"
type ScreenType = "home" | "musical" | "verification"

interface BookingData {
  seatGrade: string
  name: string
  studentId: string
  specialRequest: string
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
  })
  const [successData, setSuccessData] = useState<SuccessData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [unavailableSeats, setUnavailableSeats] = useState<Record<string, Record<string, string[]>>>({})
  const [isLoadingSeats, setIsLoadingSeats] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "demo" | "error">("connected")
  const [statistics, setStatistics] = useState({ total_bookings: 0, total_seats_booked: 0, unique_students: 0 })
  const { toast } = useToast()
  const [isMobile, setIsMobile] = useState(false)
  const [selectedMusicalId, setSelectedMusicalId] = useState<string>("dead-poets-society")

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // 좌석 상태 로드 (작품별) - 캐시 방지
  useEffect(() => {
    const loadSeatStatus = async () => {
      setIsLoadingSeats(true)
      const musicalId = selectedMusicalId || "dead-poets-society"

      try {
        // 캐시 방지를 위한 타임스탬프 추가
        const timestamp = new Date().getTime()
        const response = await fetch(`/api/seats/${musicalId}?t=${timestamp}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        })

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

          console.log(`[${data.timestamp}] 좌석 상태 업데이트:`, data.statistics)

          if (data.needsSetup) {
            setConnectionStatus("error")
            toast({
              title: "데이터베이스 설정 필요",
              description: `${data.musicalTitle} SQL 스크립트를 실행하여 데이터베이스 테이블을 생성해주세요.`,
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

    // 좌석 선택 화면에서는 5초마다 자동 새로고침
    let intervalId: NodeJS.Timeout | null = null
    if (currentPage === "seats") {
      intervalId = setInterval(loadSeatStatus, 5000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [toast, selectedMusicalId, currentPage])

  const getMusicalInfo = () => {
    const musicalId = selectedMusicalId || "dead-poets-society"
    const musical = getMusicalById(musicalId)

    if (!musical) {
      console.error(`Musical not found for ID: ${musicalId}`)
      // 기본값으로 대체
      return getMusicalById("dead-poets-society")
    }

    return musical
  }

  const musicalInfo = getMusicalInfo()

  // musicalInfo가 여전히 null인 경우 오류 화면 표시
  if (!musicalInfo) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md border border-red-200 bg-white shadow-lg">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">오류 발생</h2>
            <p className="text-gray-600 mb-4">공연 정보를 불러올 수 없습니다.</p>
            <Button
              onClick={() => {
                setSelectedMusicalId("dead-poets-society")
                setCurrentScreen("home")
                window.location.reload()
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSeatClick = (seatId: string, seatGrade: string) => {
    if (bookingData.seatGrade && bookingData.seatGrade !== seatGrade) {
      toast({
        title: "좌석 등급 오류",
        description: "같은 등급의 좌석만 선택할 수 있습니다.",
        variant: "destructive",
      })
      return
    }

    if (selectedSeats.length >= 100 && !selectedSeats.includes(seatId)) {
      toast({
        title: "선택 제한",
        description: "최대 100개의 좌석까지 선택할 수 있습니다.",
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

  const handleSeatSelectionConfirm = () => {
    if (selectedSeats.length === 0) {
      toast({
        title: "좌석 미선택",
        description: "좌석을 선택해주세요.",
        variant: "destructive",
      })
      return
    }
    setCurrentPage("form")
    toast({
      title: "좌석 선택 완료",
      description: `${selectedSeats.length}개의 좌석이 선택되었습니다.`,
    })
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedSeats.length === 0 || !bookingData.name || !bookingData.studentId) {
      toast({
        title: "입력 오류",
        description: "필수 항목을 모두 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // 캐시 방지
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/bookings/${musicalId}?t=${timestamp}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
        body: JSON.stringify({
          name: bookingData.name,
          studentId: bookingData.studentId,
          seatGrade: bookingData.seatGrade,
          selectedSeats: selectedSeats,
          specialRequest: bookingData.specialRequest,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        toast({
          title: "요청 실패",
          // 서버에서 보낸 error 메시지가 있으면 보여주고, 없으면 상태 텍스트 표시
          description: errorData.error || `오류 발생 (${response.status}): ${response.statusText}`,
          variant: "destructive",
        })

        if (response.status === 409 && errorData.conflictSeats) {
          toast({
            title: "좌석 충돌",
            description: `선택한 좌석 중 이미 예매된 좌석이 있습니다. 페이지를 새로고침합니다.`,
            variant: "destructive",
          })
          // 좌석 상태 새로고침
          setTimeout(() => {
            window.location.reload()
          }, 2000)
          return
        } else if (response.status === 403) {
          setCurrentPage("not_in_period")
          toast({
            title: "신청 실패",
            description: "예매 기간이 아닙니다.",
            variant: "destructive",
          })
          console.error("예매 기간 아님 오류:", errorData.error)
          return
        }
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        return
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

      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
      
      toast({
        title: "시스템 오류",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNavigateToMusical = (musicalId?: string) => {
    const targetMusicalId = musicalId || "dead-poets-society"
    const targetMusical = getMusicalById(targetMusicalId)

    if (!targetMusical) {
      toast({
        title: "오류",
        description: "선택한 공연 정보를 찾을 수 없습니다.",
        variant: "destructive",
      })
      return
    }

    setSelectedMusicalId(targetMusicalId)
    setCurrentScreen("musical")
    setCurrentPage("info")
  }

  const handleNavigateToHome = () => {
    setCurrentScreen("home")
  }

  const handleNavigateToVerification = () => {
    setCurrentScreen("verification")
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">신청이 완료되었습니다!</h2>

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
                  <strong>좌석:</strong> {bookingData.seatGrade} {selectedSeats.length}매
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
                <li>• -12월 14일 오후 9시</li>
                <li>• 문의: 아르떼 인스타로</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setCurrentPage("info")
                  setCurrentScreen("home")
                  setBookingData({
                    seatGrade: "",
                    name: "",
                    studentId: "",
                    specialRequest: "",
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
                onClick={() => {
                  setCurrentPage("form")
                  setBookingData({
                    seatGrade: "",
                    name: bookingData.name,
                    studentId: bookingData.studentId,
                    specialRequest: "",
                  })
                  setSelectedSeats([])
                }}
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

  // 성공 페이지
  if (currentPage === "not_in_period") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border border-gray-200 bg-white shadow-lg">
          <CardContent className="pt-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <CircleAlert className="h-16 w-16 text-red-500" />
                <Ticket className="h-6 w-6 text-gray-900 absolute -top-1 -right-1" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">현재는 예매 기간이 아닙니다.</h2>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setCurrentPage("info")
                  setCurrentScreen("home")
                  setBookingData({
                    seatGrade: "",
                    name: "",
                    studentId: "",
                    specialRequest: "",
                  })
                  setSelectedSeats([])
                  setSuccessData(null)
                }}
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                처음으로
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 신청서 페이지
  if (currentPage === "form") {
    return (
      <BookingForm
        musicalInfo={musicalInfo}
        bookingData={bookingData}
        selectedSeats={selectedSeats}
        onInputChange={handleInputChange}
        onNavigateToSeatSelection={() => setCurrentPage("seats")}
        onSubmit={handleBookingSubmit}
        onBack={() => setCurrentPage("info")}
        onNavigateToHome={handleNavigateToHome}
        isSubmitting={isSubmitting}
      />
    )
  }

  // 좌석 선택 페이지
  if (currentPage === "seats") {
    return (
      <SeatSelectionWindow
        seatGrades={musicalInfo.seatGrades}
        selectedSeats={selectedSeats}
        onSeatClick={handleSeatClick}
        unavailableSeats={unavailableSeats}
        statistics={statistics}
        connectionStatus={connectionStatus}
        selectedSeatGrade={bookingData.seatGrade}
        onBack={() => setCurrentPage("form")}
        onConfirm={handleSeatSelectionConfirm}
        musicalTitle={musicalInfo.title}
      />
    )
  }

  // Verification Screen
  if (currentScreen === "verification") {
    return <BookingVerification onBack={handleNavigateToHome} />
  }

  // 작품 소개 페이지
  if (currentScreen === "musical") {
    return (
      <MusicalDetail
        musicalInfo={musicalInfo}
        onNavigateBack={handleNavigateToHome}
        onNavigateToBooking={() => setCurrentPage("form")}
        isMobile={isMobile}
      />
    )
  }

  // Home Screen
  return (
    <HomeScreen
      onNavigateToMusical={handleNavigateToMusical}
      isMobile={isMobile}
      onNavigateToVerification={handleNavigateToVerification}
    />
  )
}
