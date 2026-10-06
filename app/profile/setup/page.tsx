import type { Metadata } from "next"
import { redirect } from "next/navigation"
import ProfileForm from "@/components/auth/profile-form"
import LogoutButton from "@/components/auth/logout-button"
import AccountPageShell from "@/components/auth/account-page-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireAuthUser } from "@/lib/server/require-auth"
import { defaultUsername, isProfileComplete, safeProfileNext } from "@/lib/profile"

export const metadata: Metadata = { title: "내 정보 등록", robots: { index: false, follow: false } }
export const dynamic = "force-dynamic"

export default async function ProfileSetupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const nextPath = safeProfileNext((await searchParams).next)
  const { supabase, user } = await requireAuthUser(`/profile/setup?next=${encodeURIComponent(nextPath)}`, true)
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
  if (error) throw new Error("Profile is temporarily unavailable")
  if (isProfileComplete(profile)) redirect(nextPath)
  return (
    <AccountPageShell title="내 정보 등록">
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">내 정보를 알려주세요</CardTitle>
          <p className="pt-1 text-base leading-6 text-gray-600">이전 공연 예약을 찾아 내 티켓에 연결해 드려요. 본인의 이름과 학번을 입력해주세요.</p>
        </CardHeader>
        <CardContent>
          <p className="mb-6 break-all text-sm text-gray-500">로그인한 이메일: {user.email}</p>
          <ProfileForm initialUsername={profile?.username ?? defaultUsername(user.email)} initialDisplayName={profile?.display_name ?? ""} initialStudentId={profile?.student_id ?? ""} initialContactNumber={profile?.contact_number ?? ""} nextPath={nextPath} />
        </CardContent>
      </Card>
      <LogoutButton />
    </AccountPageShell>
  )
}
