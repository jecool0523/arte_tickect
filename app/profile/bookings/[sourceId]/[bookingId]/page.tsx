import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import AccountPageShell from "@/components/auth/account-page-shell"
import BookingTicket from "@/components/booking-ticket"
import { Card, CardContent } from "@/components/ui/card"
import { requireAuthUser } from "@/lib/server/require-auth"
import { getOwnedReservation } from "@/lib/server/reservations"
import { isTicketReady, reservationStatusLabel, reservationTicketData } from "@/lib/reservations"
import { getLiveMusical } from "@/lib/server/performances"

export const metadata: Metadata = { title: "내 티켓", robots: { index: false, follow: false, nocache: true } }
export const dynamic = "force-dynamic"

export default async function OwnedTicketPage({ params }: { params: Promise<{ sourceId: string; bookingId: string }> }) {
  const { sourceId, bookingId } = await params
  const path = `/profile/bookings/${encodeURIComponent(sourceId)}/${encodeURIComponent(bookingId)}`
  const { user, supabase } = await requireAuthUser(path)
  const reservation = await getOwnedReservation(supabase, user.id, sourceId, bookingId)
  if (!reservation) notFound()
  const musical = reservation.sourceId === "legacy" ? null : await getLiveMusical(reservation.sourceId)
  const ticket = { ...reservationTicketData(reservation), ...(musical ? { musicalTitle: musical.title, musicalDate: musical.date, musicalTime: musical.time, venue: musical.venue } : {}) }
  return (
    <AccountPageShell title="내 티켓">
      <Link href="/profile/bookings" className="inline-block text-sm font-medium text-purple-600 hover:text-purple-700">예약 내역으로 돌아가기</Link>
      {isTicketReady(reservation.status) ? <BookingTicket ticket={ticket} showShareActions={false} showSeatMap={reservation.sourceId !== "legacy"} /> : (
        <Card className="border-gray-200 bg-white shadow-sm"><CardContent className="space-y-2 p-6">
          <h2 className="font-bold text-gray-900">{reservationStatusLabel(reservation.status)}</h2>
          <p className="text-gray-600">완료된 예약만 티켓을 확인할 수 있어요.</p>
        </CardContent></Card>
      )}
    </AccountPageShell>
  )
}
