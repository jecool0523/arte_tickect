import type { Metadata } from "next"
import Link from "next/link"
import { Mail, ShieldAlert, Ticket, Trash2, UserRound } from "lucide-react"
import AccountPageShell from "@/components/auth/account-page-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import LogoutButton from "@/components/auth/logout-button"
import ProfileForm from "@/components/auth/profile-form"
import AccountDeleteButton from "@/components/auth/account-delete-button"
import ResendConfirmationButton from "@/components/auth/resend-confirmation-button"
import SyncProfileButton from "@/components/auth/sync-profile-button"
import LoginCard from "@/components/auth/login-card"
import FanExperienceCard from "@/components/auth/fan-experience-card"
import ProfileGuide from "@/components/auth/profile-guide"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
import { createServerClient } from "@/lib/server/supabase-admin"
import { defaultUsername, isProfileComplete } from "@/lib/profile"
import { syncLegacyBookings } from "@/lib/server/profile-onboarding"
import { getOwnedReservations } from "@/lib/server/reservations"

export const metadata: Metadata = {
  title: "프로필",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

async function getEmailStatus(userId: string) {
  const supabase = createServerClient()
  const { data, error } = await supabase.rpc("get_user_email_status", { p_user_id: userId }) as { data: { success: boolean; email_confirmed?: boolean; email_confirmed_at?: string | null; error?: string } | null; error: Error | null }
  if (error || !data?.success) return { emailConfirmed: false, emailConfirmedAt: null }
  return { emailConfirmed: data.email_confirmed ?? false, emailConfirmedAt: data.email_confirmed_at ?? null }
}

export default async function ProfilePage() {
  // Always open the profile destination; private data still requires a verified user.
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <AccountPageShell title="프로필"><ProfileGuide /><LoginCard next="/profile" /></AccountPageShell>
  const { data: isAdmin } = await supabase.rpc("is_current_user_admin")
  const adminEntry = isAdmin ? <Button asChild className="h-11 w-full bg-purple-600 text-white hover:bg-purple-700"><Link href="/admin" prefetch={false}>관리자 · 공연 관리</Link></Button> : null

  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("display_name, student_id, avatar_url, username, contact_number, profile_completed_at, is_presale_user").eq("id", user.id).maybeSingle()
  if (profileError) throw new Error("Profile is temporarily unavailable")
  if (!isProfileComplete(profile)) {
    return (
      <AccountPageShell title="프로필">
        <ProfileGuide />
        {adminEntry}
        {profile?.is_presale_user && <p className="rounded-lg bg-purple-50 p-4 text-sm font-medium text-purple-700">선예매 권한이 있는 계정입니다. 내 정보를 등록하면 일반 예매 시작 전 예매할 수 있어요.</p>}
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">내 정보를 알려주세요</CardTitle>
            <p className="pt-1 text-base leading-6 text-gray-600">이전 공연 예약을 찾아 내 티켓에 연결해 드려요. 본인의 이름과 학번을 입력해주세요.</p>
          </CardHeader>
          <CardContent>
            <p className="mb-6 break-all text-sm text-gray-500">로그인한 이메일: {user.email}</p>
            <ProfileForm initialUsername={profile?.username ?? defaultUsername(user.email)} initialDisplayName={profile?.display_name ?? ""} initialStudentId={profile?.student_id ?? ""} initialContactNumber={profile?.contact_number ?? ""} />
          </CardContent>
        </Card>
        <FanExperienceCard />
        <LogoutButton />
      </AccountPageShell>
    )
  }

  const syncResult = await syncLegacyBookings(user.id)
  const [emailStatus, { reservations: tickets, unavailable }] = await Promise.all([
    getEmailStatus(user.id),
    getOwnedReservations(supabase, user.id),
  ])

  const displayName = profile?.display_name ?? user.user_metadata.full_name ?? user.user_metadata.name ?? "아르떼 관객"
  const avatarUrl = profile?.avatar_url ?? user.user_metadata.avatar_url ?? user.user_metadata.picture
  const initial = displayName.trim().charAt(0).toUpperCase() || "A"

  return (
    <AccountPageShell title="프로필">
      <ProfileGuide />
      {adminEntry}
      {profile?.is_presale_user && <p className="rounded-lg bg-purple-50 p-4 text-sm font-medium text-purple-700">선예매 권한이 있는 계정입니다. 일반 예매 시작 전 예매할 수 있어요.</p>}
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-100 text-xl font-bold text-purple-700">
            {avatarUrl ? <img src={avatarUrl} alt={`${displayName} 프로필 사진`} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <span aria-hidden="true">{initial}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-lg font-bold text-gray-900">{displayName}</h2>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-gray-500">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0 break-all">{user.email}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-purple-100 px-2.5 py-1 font-medium text-purple-700">예매 {tickets.length}건</span>
              <span className={emailStatus.emailConfirmed ? "text-gray-500" : "flex items-center gap-1 text-amber-700"}>
                {!emailStatus.emailConfirmed && <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />}
                {emailStatus.emailConfirmed ? "이메일 인증됨" : "이메일 미인증"}
              </span>
            </div>
            {!emailStatus.emailConfirmed && <div className="mt-3"><ResendConfirmationButton /></div>}
          </div>
        </CardContent>
      </Card>

      <FanExperienceCard />
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><UserRound className="h-5 w-5 text-purple-600" aria-hidden="true" />내 정보</CardTitle>
          <p className="text-sm leading-6 text-gray-500">예약 확인에 사용할 정보를 관리해요.</p>
        </CardHeader>
        <CardContent>
          <ProfileForm initialUsername={profile?.username ?? defaultUsername(user.email)} initialDisplayName={profile?.display_name ?? user.user_metadata.full_name ?? user.user_metadata.name ?? ""} initialStudentId={profile?.student_id ?? ""} initialContactNumber={profile?.contact_number ?? ""} identityLocked={tickets.length > 0} />
          <div className="mt-4 border-t border-gray-200 pt-4"><SyncProfileButton /></div>
        </CardContent>
      </Card>

      <Card id="tickets" className="scroll-mt-4 border-gray-200 bg-white shadow-sm">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg"><Ticket className="h-5 w-5 text-purple-600" aria-hidden="true" />예약 내역</CardTitle>
            <p className="mt-1 text-sm text-gray-500">예매 내역 {tickets.length}건</p>
          </div>
          <Link href="/performances" className="text-sm font-medium text-purple-600 hover:text-purple-700">공연 보기</Link>
        </CardHeader>
        <CardContent>
          {(!syncResult.success || unavailable) && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">예약 동기화 또는 조회가 지연되고 있어요. 잠시 후 새로고침해주세요.</p>}
          <p className="text-sm leading-6 text-gray-500">예약 내역에서 공연별 티켓과 좌석을 확인할 수 있어요.</p>
          <Button asChild className="mt-4 h-11 w-full rounded-lg bg-purple-600 text-white hover:bg-purple-700"><Link href="/profile/bookings" prefetch={false}>내 예약 내역 보기</Link></Button>
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-red-700"><Trash2 className="h-5 w-5" aria-hidden="true" />계정 탈퇴</CardTitle>
          <p className="text-sm leading-6 text-gray-600">계정을 삭제하면 개인정보가 삭제되고 예매 내역은 익명화됩니다. 복구할 수 없으니 신중히 결정해주세요.</p>
        </CardHeader>
        <CardContent><AccountDeleteButton /></CardContent>
      </Card>
      <LogoutButton />
    </AccountPageShell>
  )
}
