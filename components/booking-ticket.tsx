"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CalendarDays, Check, Clock, Copy, Download, Link2, Loader2, MapPin, Share2, Ticket, UserRound } from "lucide-react"
import { toPng } from "html-to-image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { getSeatDisplayLabel, getSeatRows, getSeatSectionsByFloor, parseSeatId } from "@/lib/seat-map"
import { cn } from "@/lib/utils"

export interface BookingTicketData {
  bookingId: number
  bookingDate?: string | null
  name: string
  studentId: string
  seatGrade: string
  selectedSeats: string[]
  musicalTitle: string
  musicalDate: string
  musicalTime: string
  venue: string
}

interface BookingTicketProps {
  ticket: BookingTicketData
  variant?: "success" | "list"
  shareToken?: string | null
}

function maskStudentId(studentId: string) {
  const trimmed = studentId.trim()

  if (!trimmed) return "학번 미입력"
  if (trimmed.length <= 2) return "*".repeat(trimmed.length)

  return `${"*".repeat(trimmed.length - 2)}${trimmed.slice(-2)}`
}

function formatDateTime(value?: string | null) {
  if (!value) return "예매 일시 확인 중"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "예매 일시 확인 중"

  return date.toLocaleString("ko-KR")
}

function isMobileShareDevice() {
  if (typeof navigator === "undefined") return false

  const userAgent = navigator.userAgent

  return /Android|iPhone|iPad|iPod/i.test(userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(userAgent))
}

function getTicketImageFileName(ticket: BookingTicketData) {
  const safeTitle = ticket.musicalTitle
    .replace(/[<>:"/\\|?*]/g, "")
    .trim()
    .replace(/\s+/g, "-")

  return `ARTE-${safeTitle || "ticket"}-${ticket.bookingId}.png`
}

const seatMapGridTemplate = {
  gridTemplateColumns:
    "16px repeat(6, minmax(0, 1fr)) 12px repeat(12, minmax(0, 1fr)) 12px repeat(6, minmax(0, 1fr))",
}

function SeatLocationMap({ selectedSeats }: { selectedSeats: string[] }) {
  const parsedSeats = selectedSeats.map(parseSeatId).filter((seat): seat is NonNullable<ReturnType<typeof parseSeatId>> => Boolean(seat))

  if (!parsedSeats.length) return null

  const selectedSeatIds = new Set(parsedSeats.map((seat) => seat.id))
  const selectedSections = Array.from(new Set(parsedSeats.map((seat) => `${seat.floor}-${seat.grade}`))).map((sectionKey) => {
    const [floor, grade] = sectionKey.split("-")
    return getSeatSectionsByFloor(floor as (typeof parsedSeats)[number]["floor"]).find((section) => section.grade === grade)
  })

  return (
    <div className="rounded-lg border border-purple-100 bg-purple-50/60 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-purple-800">좌석 위치</p>
          <p className="mt-0.5 text-[11px] text-purple-600">보라색으로 표시된 점이 예매 좌석입니다.</p>
        </div>
        <div className="rounded-full bg-purple-600 px-2 py-1 text-[11px] font-bold text-white">{selectedSeats.length}매</div>
      </div>

      <div className="mb-3 rounded-md bg-gradient-to-r from-purple-600 to-fuchsia-600 py-1.5 text-center text-[11px] font-bold text-white shadow-sm">
        무대
      </div>

      <div className="space-y-3">
        {selectedSections.map((section) => {
          if (!section) return null

          return (
            <div key={section.id} className="rounded-md bg-white p-2 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="font-bold text-gray-700">
                  {section.floor} {section.grade}
                </span>
                <span className="text-gray-400">앞쪽이 무대 방향</span>
              </div>

              <div className="mb-1.5 grid text-center text-[10px] font-semibold text-gray-400" style={seatMapGridTemplate}>
                <span className="col-start-2 col-span-6">왼쪽</span>
                <span className="col-start-9 col-span-12">중앙</span>
                <span className="col-start-[22] col-span-6">오른쪽</span>
              </div>

              <div className="space-y-1.5">
                {getSeatRows(section).map(({ row, areas }) => (
                  <div key={row} className="grid items-center" style={seatMapGridTemplate}>
                    <div className="pr-1 text-right text-[9px] font-bold text-gray-400">{row}</div>
                    {areas.map(({ area, seats }, areaIndex) => (
                      <div key={area.id} className="contents">
                        {areaIndex > 0 && <span aria-hidden="true" className="mx-auto h-3 w-0.5 rounded-full bg-purple-300" />}
                        {seats.map((seat) => {
                          const isSelected = selectedSeatIds.has(seat.id)

                          return (
                            <span
                              key={seat.id}
                              title={seat.label}
                              className={cn(
                                "mx-auto h-2 w-2 rounded-[2px] bg-gray-200",
                                isSelected && "relative z-10 bg-purple-600 ring-2 ring-purple-200",
                              )}
                            />
                          )
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function BookingTicket({ ticket, variant = "list", shareToken }: BookingTicketProps) {
  const ticketRef = useRef<HTMLElement>(null)
  const [fallbackUrl, setFallbackUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [isSavingImage, setIsSavingImage] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const seatLabels = useMemo(() => ticket.selectedSeats.map(getSeatDisplayLabel), [ticket.selectedSeats])
  const bookingDateText = formatDateTime(ticket.bookingDate)

  useEffect(() => {
    setIsMobile(isMobileShareDevice())
  }, [])

  const getShareUrl = () =>
    shareToken ? `${window.location.origin}/tickets/${encodeURIComponent(shareToken)}` : null

  const copyShareUrl = async () => {
    const shareUrl = getShareUrl()
    if (!shareUrl) {
      toast({
        title: "공유 링크를 만들 수 없어요",
        description: "잠시 후 예매 내역을 다시 조회해 주세요.",
        variant: "destructive",
      })
      return
    }

    if (!navigator.clipboard) {
      setFallbackUrl(shareUrl)
      toast({
        title: "공유 링크를 준비했어요",
        description: "아래 링크를 길게 눌러 복사해 주세요.",
      })
      return
    }

    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
    toast({
      title: "티켓 URL 복사 완료",
      description: "카카오톡, 문자, DM 등에 붙여넣을 수 있어요.",
    })
  }

  const downloadTicketImage = async () => {
    if (!ticketRef.current) throw new Error("Ticket element is not ready")

    setIsSavingImage(true)

    try {
      await document.fonts?.ready
      const dataUrl = await toPng(ticketRef.current, {
        backgroundColor: "#ffffff",
        cacheBust: true,
        pixelRatio: 2,
        filter: (node) => !(node instanceof HTMLElement && node.dataset.ticketCaptureExclude === "true"),
      })
      const downloadLink = document.createElement("a")
      downloadLink.download = getTicketImageFileName(ticket)
      downloadLink.href = dataUrl
      document.body.appendChild(downloadLink)
      downloadLink.click()
      downloadLink.remove()

      toast({
        title: "티켓 이미지 저장 완료",
        description: "다운로드 폴더에서 PNG 티켓을 확인할 수 있어요.",
      })
    } finally {
      setIsSavingImage(false)
    }
  }

  const handleImageDownload = async () => {
    try {
      await downloadTicketImage()
    } catch (error) {
      console.error("Ticket image download failed:", error)
      toast({
        title: "티켓 이미지 저장 실패",
        description: "잠시 후 다시 시도해 주세요.",
        variant: "destructive",
      })
    }
  }

  const handleShare = async () => {
    const shareUrl = getShareUrl()
    if (!shareUrl) {
      await copyShareUrl()
      return
    }

    try {
      if (!navigator.share) {
        await copyShareUrl()
        return
      }

      await navigator.share({
        title: "ARTE 예매 티켓",
        text: "예매 티켓을 확인해 주세요.",
        url: shareUrl,
      })
      toast({ title: "티켓 공유 완료", description: "티켓 링크를 전달했어요." })
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      try {
        await copyShareUrl()
      } catch (copyError) {
        console.error("Ticket share failed:", copyError)
        setFallbackUrl(shareUrl)
        toast({
          title: "자동 공유가 어려워요",
          description: "아래 티켓 링크를 직접 복사해 주세요.",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <section
      ref={ticketRef}
      className={cn(
        "overflow-hidden rounded-lg border border-purple-200 bg-white text-left shadow-sm",
        variant === "success" && "shadow-lg",
      )}
      aria-label={`${ticket.musicalTitle} 예매 티켓`}
    >
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-600 px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-100">ARTE TICKET</p>
            <h3 className="mt-2 break-words text-xl font-black leading-tight">{ticket.musicalTitle}</h3>
          </div>
          <div className="shrink-0 rounded-full bg-white/15 p-2">
            <Ticket className="h-6 w-6" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-purple-50">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {ticket.musicalDate}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {ticket.musicalTime}
          </span>
        </div>
      </div>

      <div className="relative border-y border-dashed border-purple-200 px-5 py-4">
        <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-purple-200 bg-gray-50" />
        <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-purple-200 bg-gray-50" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase text-gray-400">Booking No.</p>
            <p className="mt-1 font-mono text-lg font-black text-gray-900">#{ticket.bookingId}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-gray-400">Seat</p>
            <p className="mt-1 text-lg font-black text-purple-700">
              {ticket.seatGrade} {ticket.selectedSeats.length}매
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex items-start gap-2 text-sm text-gray-700">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
          <span>{ticket.venue}</span>
        </div>

        <div className="flex items-start gap-2 text-sm text-gray-700">
          <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
          <span>
            {ticket.name} <span className="text-gray-400">(학번 {maskStudentId(ticket.studentId)})</span>
          </span>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold text-gray-500">선택 좌석</p>
          <div className="flex flex-wrap gap-1.5">
            {seatLabels.map((seatLabel) => (
              <Badge key={seatLabel} variant="outline" className="border-purple-200 bg-purple-50 px-2 py-1 text-xs text-purple-700">
                {seatLabel}
              </Badge>
            ))}
          </div>
        </div>

        <SeatLocationMap selectedSeats={ticket.selectedSeats} />

        <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">예매 일시: {bookingDateText}</div>

        <div data-ticket-capture-exclude="true" className={cn("grid gap-2", !isMobile && shareToken && "sm:grid-cols-2")}>
          {isMobile ? (
            <Button onClick={handleShare} className="h-11 w-full bg-purple-600 font-bold text-white hover:bg-purple-700">
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />}
              {copied ? "URL 복사 완료" : "티켓 공유하기"}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleImageDownload}
                disabled={isSavingImage}
                className="h-11 w-full bg-purple-600 font-bold text-white hover:bg-purple-700"
              >
                {isSavingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {isSavingImage ? "이미지 저장 중..." : "티켓 이미지 저장"}
              </Button>
              {shareToken && (
                <Button onClick={copyShareUrl} variant="outline" className="h-11 w-full border-purple-200 font-bold text-purple-700">
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Link2 className="mr-2 h-4 w-4" />}
                  {copied ? "URL 복사 완료" : "티켓 URL 복사"}
                </Button>
              )}
            </>
          )}
        </div>

        {fallbackUrl && (
          <div data-ticket-capture-exclude="true" className="space-y-2 rounded-md border border-purple-100 bg-purple-50 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-700">
              <Copy className="h-3.5 w-3.5" />
              공유 링크
            </div>
            <input
              readOnly
              value={fallbackUrl}
              className="h-10 w-full rounded-md border border-purple-100 bg-white px-2 text-xs text-gray-700"
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
        )}
      </div>
    </section>
  )
}
