"use client"

import { useMemo, useState } from "react"
import { CalendarDays, Check, Clock, Copy, MapPin, Share2, Ticket, UserRound } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { getSeatDisplayLabel } from "@/lib/seat-map"
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

function buildShareMessage(ticket: BookingTicketData) {
  const seatLabels = ticket.selectedSeats.map(getSeatDisplayLabel).join(", ")
  const seatSummary = `${ticket.seatGrade} ${ticket.selectedSeats.length}매${seatLabels ? ` - ${seatLabels}` : ""}`

  return [
    "[ARTE 예매 티켓]",
    `공연: ${ticket.musicalTitle}`,
    `일시: ${ticket.musicalDate} ${ticket.musicalTime}`.trim(),
    `장소: ${ticket.venue}`,
    `좌석: ${seatSummary}`,
    `예매자: ${ticket.name} (학번 ${maskStudentId(ticket.studentId)})`,
    `예매번호: #${ticket.bookingId}`,
  ].join("\n")
}

export default function BookingTicket({ ticket, variant = "list" }: BookingTicketProps) {
  const [fallbackMessage, setFallbackMessage] = useState("")
  const [copied, setCopied] = useState(false)
  const seatLabels = useMemo(() => ticket.selectedSeats.map(getSeatDisplayLabel), [ticket.selectedSeats])
  const shareMessage = useMemo(() => buildShareMessage(ticket), [ticket])
  const bookingDateText = formatDateTime(ticket.bookingDate)

  const copyMessage = async () => {
    if (!navigator.clipboard) {
      setFallbackMessage(shareMessage)
      toast({
        title: "공유 메시지를 준비했어요",
        description: "아래 메시지를 길게 눌러 복사해 주세요.",
      })
      return
    }

    await navigator.clipboard.writeText(shareMessage)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
    toast({
      title: "공유 메시지 복사 완료",
      description: "카카오톡, 문자, DM 등에 붙여넣을 수 있어요.",
    })
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${ticket.musicalTitle} 예매 티켓`,
          text: shareMessage,
        })
        toast({
          title: "티켓 공유 완료",
          description: "예매 정보를 안전하게 전달했어요.",
        })
        return
      }

      await copyMessage()
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return

      try {
        await copyMessage()
      } catch (copyError) {
        console.error("Ticket share failed:", copyError)
        setFallbackMessage(shareMessage)
        toast({
          title: "자동 공유가 어려워요",
          description: "아래 공유 메시지를 직접 복사해 주세요.",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <section
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

        <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">예매 일시: {bookingDateText}</div>

        <Button onClick={handleShare} className="h-11 w-full bg-purple-600 font-bold text-white hover:bg-purple-700">
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />}
          {copied ? "복사 완료" : "티켓 공유하기"}
        </Button>

        {fallbackMessage && (
          <div className="space-y-2 rounded-md border border-purple-100 bg-purple-50 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-700">
              <Copy className="h-3.5 w-3.5" />
              공유 메시지
            </div>
            <textarea
              readOnly
              value={fallbackMessage}
              className="h-36 w-full resize-none rounded-md border border-purple-100 bg-white p-2 text-xs leading-5 text-gray-700"
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
        )}
      </div>
    </section>
  )
}
