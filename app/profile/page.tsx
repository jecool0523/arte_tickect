import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, ChevronRight, Mail, ShieldAlert, Sparkles, Ticket, Trash2, UserRound } from "lucide-react"
import AppBottomNav from "@/components/app-bottom-nav"
import LogoutButton from "@/components/auth/logout-button"
import ProfileForm from "@/components/auth/profile-form"
import AccountDeleteButton from "@/components/auth/account-delete-button"
import ResendConfirmationButton from "@/components/auth/resend-confirmation-button"
import SyncProfileButton from "@/components/auth/sync-profile-button"
import { requireAuthUser } from "@/lib/server/require-auth"
import { createServerClient } from "@/lib/server/supabase-admin"

export const metadata: Metadata = {
  title: "프로필",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

const bookingSources = [
  { table: "dead_poets_society_bookings" as const, title: "죽은 시인의 사회" },
  { table: "rent_bookings" as const, title: "RENT" },
  { table: "toctoc_bookings" as const, title: "TOC TOC" },
]

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    confirmed: "예매 완료",
    completed: "예매 완료",
    cancelled: "취소됨",
    canceled: "취소됨",
  }

  return labels[status.toLowerCase()] ?? status
}

async function getEmailStatus(userId: string) {
  const supabase = createServerClient()
  const { data, error } = await supabase.rpc("get_user_email_status", { p_user_id: userId }) as { data: { success: boolean; email_confirmed?: boolean; email_confirmed_at?: string | null; error?: string } | null; error: Error | null }
  if (error || !data?.success) return { emailConfirmed: false, emailConfirmedAt: null }
  return { emailConfirmed: data.email_confirmed ?? false, emailConfirmedAt: data.email_confirmed_at ?? null }
}

export default async function ProfilePage() {
  const { supabase, user } = await requireAuthUser("/profile")
  const [{ data: profile }, emailStatus, ...bookingResults] = await Promise.all([
    supabase.from("profiles").select("display_name, student_id, avatar_url").eq("id", user.id).maybeSingle(),
    getEmailStatus(user.id),
    ...bookingSources.map(({ table }) =>
      supabase
        .from(table)
        .select("id, booking_date, seat_grade, selected_seats, status")
        .eq("user_id", user.id)
        .order("booking_date", { ascending: false }),
    ),
  ])

  const tickets = bookingResults
    .flatMap((result, index) =>
      (result.data ?? []).map((booking) => ({ ...booking, musicalTitle: bookingSources[index].title })),
    )
    .sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())

  const displayName = profile?.display_name ?? user.user_metadata.full_name ?? user.user_metadata.name ?? "아르떼 관객"
  const avatarUrl = profile?.avatar_url ?? user.user_metadata.avatar_url ?? user.user_metadata.picture
  const initial = displayName.trim().charAt(0).toUpperCase() || "A"

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-950">
      <main className="mx-auto w-full max-w-2xl pb-28">
        <section className="relative overflow-hidden bg-slate-950 px-5 pb-24 pt-6 text-white">
          <div aria-hidden="true" className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-purple-600/35 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="relative mx-auto max-w-xl">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">DIMI ARTE</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight">프로필</h1>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10">
                <Sparkles className="h-5 w-5 text-purple-200" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-purple-500 to-fuchsia-500 text-2xl font-bold shadow-xl shadow-purple-950/30">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={`${displayName} 프로필 사진`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span aria-hidden="true">{initial}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold">{displayName}</p>
                <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-slate-300">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{user.email}</span>
                  {!emailStatus.emailConfirmed && (
                    <>
                      <ShieldAlert className="h-3.5 w-3.5 text-yellow-300" aria-hidden="true" />
                      <span className="text-xs text-yellow-300">이메일 미인증</span>
                    </>
                  )}
                  {emailStatus.emailConfirmed && (
                    <span className="text-xs text-green-300">이메일 인증됨</span>
                  )}
                </p>
                {!emailStatus.emailConfirmed && (
                  <p className="mt-2">
                    <ResendConfirmationButton />
                  </p>
                )}
                <div className="mt-3 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-purple-100 ring-1 ring-inset ring-white/10">
                  예매 {tickets.length}건
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="relative -mt-14 space-y-5 px-4">
          <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-lg shadow-slate-200/60">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">내 정보</h2>
                <p className="mt-0.5 text-sm leading-5 text-slate-500">티켓 확인에 사용할 이름과 학번을 관리해요.</p>
              </div>
            </div>
            <ProfileForm
              initialDisplayName={profile?.display_name ?? user.user_metadata.full_name ?? user.user_metadata.name ?? ""}
              initialStudentId={profile?.student_id ?? ""}
            />
            <div className="mt-4 pt-4 border-t border-slate-100">
              <SyncProfileButton />
            </div>
          </section>

          <section id="tickets" className="scroll-mt-5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">내 티켓</h2>
                  <p className="text-sm text-slate-500">예매 내역 {tickets.length}건</p>
                </div>
              </div>
              <Link href="/performances" className="flex items-center gap-0.5 text-sm font-semibold text-purple-700 hover:text-purple-800">
                공연 보기
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {tickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                  <Ticket className="h-5 w-5" />
                </div>
                <p className="mt-3 font-semibold text-slate-800">아직 예매한 티켓이 없어요</p>
                <p className="mt-1 text-sm text-slate-500">공연을 둘러보고 첫 티켓을 예매해 보세요.</p>
                <Link href="/performances" className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                  공연 둘러보기
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {tickets.map((ticket) => (
                  <li key={`${ticket.musicalTitle}-${ticket.id}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-stretch">
                      <div className="w-1.5 shrink-0 bg-purple-600" />
                      <div className="min-w-0 flex-1 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900">{ticket.musicalTitle}</p>
                            <p className="mt-1 text-sm text-slate-600">
                              {ticket.seat_grade} · {ticket.selected_seats.join(", ")}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">
                            {getStatusLabel(ticket.status)}
                          </span>
                        </div>
                        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {new Date(ticket.booking_date).toLocaleString("ko-KR")}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-3xl border border-red-100 bg-red-50 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-red-900">계정 탈퇴</h2>
                <p className="mt-0.5 text-sm leading-5 text-red-700">
                  계정을 삭제하면 예매 내역이 익명화되고 복구할 수 없습니다. 신중히 결정해주세요.
                </p>
              </div>
            </div>
            <AccountDeleteButton />
          </section>

          <LogoutButton />
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <AppBottomNav active="profile" />
      </footer>
    </div>
  )
}
