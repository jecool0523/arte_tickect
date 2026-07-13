"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { AlertCircle, CheckCircle, CircleAlert, KeyRound, Ticket } from "lucide-react"
import ArteInfo from "@/components/arte-info"
import BookingForm from "@/components/booking-form"
import BookingTicket from "@/components/booking-ticket"
import BookingVerification from "@/components/booking-verification"
import HomeScreen from "@/components/home-screen"
import MusicalDetail from "@/components/musical-detail"
import SeatSelectionWindow from "@/components/seat-selection-window"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getAllMusicals, getMusicalById } from "@/data/musicals"
import { useToast } from "@/hooks/use-toast"
import { createEmptyUnavailableSeats } from "@/lib/musical-config"

type PageType = "info" | "form" | "seats" | "success" | "not_in_period"
type ScreenType = "home" | "musical" | "verification" | "arte"

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

type BookingBlock = {
  code: string
  message: string
}

type BookingPeriodStatus = {
  success?: boolean
  isOpen?: boolean
  code?: string
  message?: string
  error?: string
}

const emptyBookingData: BookingData = {
  seatGrade: "",
  name: "",
  studentId: "",
  specialRequest: "",
}

const emptyBookingBlock: BookingBlock = {
  code: "",
  message: "현재는 일반 예매 기간이 아닙니다.",
}

export default function MusicalBookingSite() {
  const [currentPage, setCurrentPage] = useState<PageType>("info")
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("home")
  const [selectedMusicalId, setSelectedMusicalId] = useState("dead-poets-society")
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [bookingData, setBookingData] = useState<BookingData>(emptyBookingData)
  const [successData, setSuccessData] = useState<SuccessData | null>(null)
  const [presaleKey, setPresaleKey] = useState("")
  const [presaleSeatLimit, setPresaleSeatLimit] = useState<number | null>(null)
  const [bookingBlock, setBookingBlock] = useState<BookingBlock>(emptyBookingBlock)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingBookingPeriod, setIsCheckingBookingPeriod] = useState(false)
  const [isValidatingPresaleKey, setIsValidatingPresaleKey] = useState(false)
  const [unavailableSeats, setUnavailableSeats] = useState<Record<string, Record<string, string[]>>>(
    createEmptyUnavailableSeats(),
  )
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "demo" | "error">("connected")
  const [statistics, setStatistics] = useState({ total_bookings: 0, total_seats_booked: 0, unique_students: 0 })
  const [isMobile, setIsMobile] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    const loadSeatStatus = async () => {
      const musicalId = selectedMusicalId || "dead-poets-society"

      try {
        const timestamp = Date.now()
        const response = await fetch(`/api/seats/${musicalId}?t=${timestamp}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        })

        if (!response.ok) {
          setUnavailableSeats(createEmptyUnavailableSeats())
          setConnectionStatus("error")
          return
        }

        const data = await response.json()

        if (data.success) {
          setUnavailableSeats(data.unavailableSeats || createEmptyUnavailableSeats())
          setStatistics(data.statistics || { total_bookings: 0, total_seats_booked: 0, unique_students: 0 })

          if (data.needsSetup) {
            setConnectionStatus("error")
            toast({
              title: "데이터베이스 설정 필요",
              description: "예약 테이블이 준비되지 않았습니다. Supabase SQL 설정을 확인해주세요.",
              variant: "destructive",
            })
          } else {
            setConnectionStatus("connected")
          }
        } else {
          setUnavailableSeats(createEmptyUnavailableSeats())
          setConnectionStatus("error")
        }
      } catch (error) {
        console.error("Seat status load failed:", error)
        setConnectionStatus("error")
        setUnavailableSeats(createEmptyUnavailableSeats())
        toast({
          title: "연결 오류",
          description: "좌석 현황을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
          variant: "destructive",
        })
      }
    }

    loadSeatStatus()

    let intervalId: NodeJS.Timeout | null = null
    if (currentPage === "seats") {
      intervalId = setInterval(loadSeatStatus, 5000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [toast, selectedMusicalId, currentPage])

  const musicalInfo = getMusicalById(selectedMusicalId) || getMusicalById("dead-poets-society")

  const handleInputChange = useCallback((field: string, value: string | number | boolean) => {
    setBookingData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [])

  const resetBooking = () => {
    setCurrentPage("info")
    setBookingData(emptyBookingData)
    setSelectedSeats([])
    setSuccessData(null)
    setPresaleKey("")
    setPresaleSeatLimit(null)
    setBookingBlock(emptyBookingBlock)
  }

  if (!musicalInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4">
        <Card className="w-full max-w-md border border-red-200 bg-white shadow-lg">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
            <h2 className="mb-2 text-2xl font-bold text-gray-900">오류 발생</h2>
            <p className="mb-4 text-gray-600">공연 정보를 불러올 수 없습니다.</p>
            <Button onClick={() => window.location.reload()} className="bg-purple-600 text-white hover:bg-purple-700">
              새로고침
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
        description: "같은 등급의 좌석만 함께 선택할 수 있습니다.",
        variant: "destructive",
      })
      return
    }

    const maxSelectableSeats = presaleKey.trim() ? (presaleSeatLimit ?? 100) : 100

    if (selectedSeats.length >= maxSelectableSeats && !selectedSeats.includes(seatId)) {
      toast({
        title: "선택 제한",
        description:
          maxSelectableSeats < 100
            ? `이 예매 코드는 최대 ${maxSelectableSeats}석까지 예매할 수 있습니다.`
            : "최대 100개의 좌석까지 선택할 수 있습니다.",
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
        setBookingData((prev) => ({ ...prev, seatGrade }))
      }
    }
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
      description: `${selectedSeats.length}개의 좌석을 선택했습니다.`,
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
      const timestamp = Date.now()
      const response = await fetch(`/api/bookings/${selectedMusicalId}?t=${timestamp}`, {
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
          selectedSeats,
          specialRequest: bookingData.specialRequest,
          presaleKey: presaleKey.trim() || undefined,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 409 && data.conflictSeats) {
          toast({
            title: "좌석 충돌",
            description: "선택한 좌석 중 이미 예매된 좌석이 있습니다. 좌석 현황을 새로고침합니다.",
            variant: "destructive",
          })
          setTimeout(() => window.location.reload(), 2000)
          return
        }

        if (response.status === 403) {
          setBookingBlock({
            code: data.code || "BOOKING_NOT_ALLOWED",
            message: data.error || "현재는 예매 기간이 아닙니다.",
          })
          setCurrentPage("not_in_period")
          toast({
            title: "예매 불가",
            description: data.error || "현재는 예매 기간이 아닙니다.",
            variant: "destructive",
          })
          return
        }

        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      if (data.success) {
        setSuccessData({
          bookingId: data.bookingId,
          bookingDate: data.bookingDate,
        })
        setCurrentPage("success")
        toast({
          title: data.presale ? "사전예매 완료" : "예매 완료",
          description: data.message || "예매 신청이 완료되었습니다.",
        })
      } else {
        toast({
          title: "예매 실패",
          description: data.error || "예매 처리 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Booking request failed:", error)
      toast({
        title: "시스템 오류",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUsePresaleKey = async () => {
    if (!presaleKey.trim()) {
      toast({
        title: "예매 코드 필요",
        description: "전달받은 예매 코드를 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsValidatingPresaleKey(true)

    try {
      const response = await fetch("/api/presale-keys/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
        body: JSON.stringify({
          musicalId: selectedMusicalId,
          presaleKey: presaleKey.trim(),
        }),
      })
      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
        maxSeats?: number | null
      }

      if (!response.ok || !data.success) {
        toast({
          title: "예매 코드 확인 실패",
          description: data.error || "예매 코드를 확인할 수 없습니다.",
          variant: "destructive",
        })
        return
      }

      setPresaleSeatLimit(typeof data.maxSeats === "number" ? data.maxSeats : null)
      setCurrentPage("form")
      toast({
        title: "예매 코드 확인 완료",
        description: "예매 코드가 확인되었습니다. 예매를 계속 진행해주세요.",
      })
    } catch (error) {
      console.error("Presale key validation failed:", error)
      toast({
        title: "예매 코드 확인 실패",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsValidatingPresaleKey(false)
    }
  }

  const handleNavigateToBooking = async () => {
    setIsCheckingBookingPeriod(true)

    try {
      const response = await fetch(`/api/booking-period/${selectedMusicalId}?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })
      const data = (await response.json().catch(() => ({}))) as BookingPeriodStatus

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "예매 기간을 확인할 수 없습니다.")
      }

      if (data.isOpen) {
        setCurrentPage("form")
        return
      }

      setBookingBlock({
        code: data.code || "PRESALE_KEY_REQUIRED",
        message: data.message || "현재는 일반 예매 기간이 아닙니다.",
      })
      setCurrentPage("not_in_period")
    } catch (error) {
      console.error("Booking period check failed:", error)
      toast({
        title: "예매 기간 확인 실패",
        description: error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsCheckingBookingPeriod(false)
    }
  }

  const handleNavigateToMusical = (musicalId?: string) => {
    const allMusicals = getAllMusicals()
    const targetMusicalId = musicalId || allMusicals[0]?.id || "dead-poets-society"
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
    setCurrentPage("info")
  }

  if (currentPage === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4">
        <Card className="w-full max-w-lg border border-gray-200 bg-white shadow-lg">
          <CardContent className="pt-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="relative">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <Ticket className="absolute -right-1 -top-1 h-6 w-6 text-gray-900" />
              </div>
            </div>
            <h2 className="mb-4 text-2xl font-bold text-gray-900">예매가 완료되었습니다.</h2>

            {successData && (
              <div className="mb-6">
                <BookingTicket
                  variant="success"
                  ticket={{
                    bookingId: successData.bookingId,
                    bookingDate: successData.bookingDate,
                    name: bookingData.name,
                    studentId: bookingData.studentId,
                    seatGrade: bookingData.seatGrade,
                    selectedSeats,
                    musicalTitle: musicalInfo.title,
                    musicalDate: musicalInfo.date,
                    musicalTime: musicalInfo.time,
                    venue: musicalInfo.venue,
                  }}
                />
              </div>
            )}

            <div className="mb-6 rounded-lg bg-blue-50 p-4 text-sm text-gray-700">
              <p className="mb-2 font-semibold text-blue-600">안내사항</p>
              <ul className="space-y-1 text-left text-blue-700">
                <li>공연 시간에 맞춰 입장해주세요.</li>
                <li>문의는 아르떼 인스타그램 DM으로 부탁드립니다.</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  resetBooking()
                  setCurrentScreen("home")
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
                className="flex-1 bg-purple-600 text-white hover:bg-purple-700"
              >
                추가 예매
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (currentPage === "not_in_period") {
    const isAfterBookingPeriod = bookingBlock.message.includes("종료")

    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4">
        <Card className="w-full max-w-lg border border-gray-200 bg-white shadow-lg">
          <CardContent className="space-y-5 pt-6 text-center">
            <div className="flex justify-center">
              <CircleAlert className="h-16 w-16 text-red-500" />
            </div>
            <div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900">
                {isAfterBookingPeriod ? "예매 기간이 종료되었습니다." : "아직 예매기간이 아닙니다."}
              </h2>
              <p className="text-sm leading-6 text-gray-600">{bookingBlock.message}</p>
            </div>

            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-left">
              <div className="mb-3 flex items-center gap-2 text-purple-700">
                <KeyRound className="h-4 w-4" />
                <span className="text-sm font-bold">예매 코드가 있다면?</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="presaleKey" className="text-xs font-medium text-gray-600">
                  전달받은 예매 코드를 입력해주세요.
                </Label>
                <Input
                  id="presaleKey"
                  value={presaleKey}
                  onChange={(event) => setPresaleKey(event.target.value)}
                  placeholder="예매 코드"
                  className="border-purple-200 bg-white font-mono text-sm"
                />
              </div>
              <Button
                onClick={handleUsePresaleKey}
                disabled={isValidatingPresaleKey}
                className="mt-3 w-full bg-purple-600 text-white hover:bg-purple-700"
              >
                {isValidatingPresaleKey ? "예매 코드 확인 중..." : "예매 코드로 예매하기"}
              </Button>
              <p className="mt-2 text-xs leading-5 text-purple-700">
                선예매 코드를 받고싶다면 2325제시원에게 연락해주세요!
              </p>
            </div>

            <Button
              onClick={() => {
                resetBooking()
                setCurrentScreen("home")
              }}
              variant="outline"
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              처음으로
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

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

  if (currentScreen === "verification") {
    return <BookingVerification onBack={handleNavigateToHome} />
  }

  if (currentScreen === "arte") {
    return (
      <ArteInfo
        onNavigateToHome={handleNavigateToHome}
        onNavigateToMusical={() => handleNavigateToMusical()}
        onNavigateToVerification={() => setCurrentScreen("verification")}
      />
    )
  }

  if (currentScreen === "musical") {
    return (
      <MusicalDetail
        musicalInfo={musicalInfo}
        onNavigateBack={handleNavigateToHome}
        onNavigateToBooking={handleNavigateToBooking}
        isCheckingBookingPeriod={isCheckingBookingPeriod}
        isMobile={isMobile}
      />
    )
  }

  return (
    <HomeScreen
      onNavigateToMusical={handleNavigateToMusical}
      isMobile={isMobile}
      onNavigateToVerification={() => setCurrentScreen("verification")}
      onNavigateToArte={() => setCurrentScreen("arte")}
    />
  )
}
