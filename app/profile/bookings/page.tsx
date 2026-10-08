import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, Ticket } from "lucide-react"
import AccountPageShell from "@/components/auth/account-page-shell"
import LoginCard from "@/components/auth/login-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
import { syncLegacyBookings } from "@/lib/server/profile-onboarding"
import { getOwnedReservations } from "@/lib/server/reservations"
import { isProfileComplete } from "@/lib/profile"
import { isTicketReady, reservationStatusLabel } from "@/lib/reservations"
import ReservationActions from "@/components/auth/reservation-actions"

export const metadata: Metadata = { title: "예약 내역", robots: { index: false, follow: false } }
export const dynamic = "force-dynamic"

export default async function ReservationHistoryPage() {
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <AccountPageShell title="예약 내역"><LoginCard next="/profile/bookings" /></AccountPageShell>
  const { data: profile, error } = await supabase.from("profiles")
    .select("username, display_name, student_id, contact_number, profile_completed_at").eq("id", user.id).maybeSingle()
  if (error) throw new Error("Profile is temporarily unavailable")
  if (!isProfileComplete(profile)) return (
    <AccountPageShell title="예약 내역"><Card className="border-gray-200 bg-white shadow-sm"><CardContent className="space-y-4 p-6">
      <p className="text-gray-700">이전 예약을 연결하려면 내 정보를 먼저 입력해주세요.</p>
      <Button asChild className="bg-purple-600 text-white hover:bg-purple-700"><Link href="/profile/setup?next=%2Fprofile%2Fbookings" prefetch={false}>내 정보 입력하기</Link></Button>
    </CardContent></Card></AccountPageShell>
  )
  const sync = await syncLegacyBookings(user.id)
  const { reservations, unavailable } = await getOwnedReservations(supabase, user.id)
  return (
    <AccountPageShell title="예약 내역">
      <Link href="/profile" className="inline-block text-sm font-medium text-purple-600 hover:text-purple-700">프로필로 돌아가기</Link>
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Ticket className="h-5 w-5 text-purple-600" aria-hidden="true" />내 예약 내역</CardTitle><p className="text-sm text-gray-500">총 {reservations.length}건</p></CardHeader>
        <CardContent>
          {(!sync.success || unavailable) && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">예약 조회가 지연되고 있어요. 잠시 후 다시 확인해주세요.</p>}
          {reservations.length === 0 ? <div className="rounded-lg bg-gray-50 px-4 py-8 text-center">
            <Ticket className="mx-auto h-8 w-8 text-gray-400" aria-hidden="true" />
            <p className="mt-3 font-semibold text-gray-900">예약 내역이 없어요</p>
            <Button asChild className="mt-4 bg-purple-600 text-white hover:bg-purple-700"><Link href="/performances">공연 둘러보기</Link></Button>
          </div> : <ul className="space-y-3">{reservations.map((reservation) => (
            <li key={`${reservation.sourceId}-${reservation.id}`} className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="break-words font-bold text-gray-900">{reservation.musicalTitle}</h2>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isTicketReady(reservation.status) ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>{reservationStatusLabel(reservation.status)}</span>
              </div>
              <p className="mt-2 break-words text-sm leading-6 text-gray-600">{reservation.seat_grade} · {reservation.selected_seats.join(", ")}</p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{new Date(reservation.booking_date).toLocaleString("ko-KR")}</p>
              <ReservationActions reservation={reservation} showTicketLink />
            </li>
          ))}</ul>}
        </CardContent>
      </Card>
    </AccountPageShell>
  )
}
