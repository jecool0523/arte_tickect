import type { Metadata } from "next"
import BookingTicket from "@/components/booking-ticket"
import TicketShareError from "@/components/ticket-share-error"
import { getMusicalById } from "@/data/musicals"
import { getBookingTableName } from "@/lib/musical-config"
import { createServerClient } from "@/lib/supabase"
import { verifyTicketShareToken } from "@/lib/ticket-share-token"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "공유 티켓",
  description: "ARTE 예매 티켓을 확인합니다.",
  robots: { index: false, follow: false, nocache: true },
}

function maskName(name: string) {
  const characters = Array.from(name.trim())
  if (!characters.length) return "예매자"
  if (characters.length === 1) return "*"
  if (characters.length === 2) return `${characters[0]}*`
  return `${characters[0]}${"*".repeat(characters.length - 2)}${characters.at(-1)}`
}

function maskStudentId(studentId: string) {
  const trimmed = studentId.trim()
  const suffix = trimmed.slice(-2)
  return `${"*".repeat(Math.max(2, trimmed.length - suffix.length))}${suffix}`
}

export default async function SharedTicketPage({ params }: { params: { shareToken: string } }) {
  const validation = verifyTicketShareToken(params.shareToken)
  if (!validation.valid) {
    return <TicketShareError reason={validation.reason === "expired" ? "expired" : "invalid"} />
  }

  const tableName = getBookingTableName(validation.musicalId)
  const musical = getMusicalById(validation.musicalId)
  if (!tableName || !musical) return <TicketShareError reason="invalid" />

  try {
    const supabase = createServerClient()
    const { data: booking, error } = await supabase
      .from(tableName)
      .select("id, name, student_id, seat_grade, selected_seats, booking_date, status")
      .eq("id", validation.bookingId)
      .eq("status", "confirmed")
      .maybeSingle()

    if (error) {
      console.error("Shared ticket lookup failed")
      return <TicketShareError reason="unavailable" />
    }
    if (!booking) return <TicketShareError reason="not-found" />

    return (
      <main className="min-h-[100dvh] bg-gray-50 px-4 py-6 sm:py-10">
        <div className="mx-auto max-w-lg">
          <p className="mb-3 text-center text-xs font-semibold text-purple-700">ARTE 공유 티켓</p>
          <BookingTicket
            variant="success"
            shareToken={params.shareToken}
            ticket={{
              bookingId: booking.id,
              bookingDate: booking.booking_date,
              name: maskName(booking.name),
              studentId: maskStudentId(booking.student_id),
              seatGrade: booking.seat_grade,
              selectedSeats: booking.selected_seats,
              musicalTitle: musical.title,
              musicalDate: musical.date,
              musicalTime: musical.time,
              venue: musical.venue,
            }}
          />
          <p className="mt-4 text-center text-xs leading-5 text-gray-500">개인정보 보호를 위해 예매자 정보 일부를 가렸습니다.</p>
        </div>
      </main>
    )
  } catch {
    console.error("Shared ticket rendering failed")
    return <TicketShareError reason="unavailable" />
  }
}
