import type { Metadata } from "next"
import { redirect } from "next/navigation"
import ProfileForm from "@/components/auth/profile-form"
import LogoutButton from "@/components/auth/logout-button"
import AppBottomNav from "@/components/app-bottom-nav"
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
    <div className="min-h-[100dvh] bg-slate-50 px-4 pb-28 pt-10 text-slate-950">
      <main className="mx-auto max-w-lg space-y-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-purple-700">DIMI ARTE</p>
          <h1 className="mt-3 text-3xl font-bold">내 정보를 알려주세요</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">처음 한 번만 입력하면 이전 공연 예약을 찾아 내 티켓에 연결해 드려요. 반드시 본인의 이름과 학번을 입력해주세요.</p>
        </div>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-6 break-all text-sm text-slate-500">로그인한 이메일: {user.email}</p>
          <ProfileForm initialUsername={profile?.username ?? defaultUsername(user.email)} initialDisplayName={profile?.display_name ?? ""} initialStudentId={profile?.student_id ?? ""} initialContactNumber={profile?.contact_number ?? ""} nextPath={nextPath} />
        </section>
        <LogoutButton />
      </main>
      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"><AppBottomNav active="profile" /></footer>
    </div>
  )
}
