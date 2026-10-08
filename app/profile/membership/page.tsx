import type { Metadata } from "next"
import { redirect } from "next/navigation"
import AccountPageShell from "@/components/auth/account-page-shell"
import ArteMembershipCard from "@/components/auth/arte-membership-card"
import { requireAuthUser } from "@/lib/server/require-auth"
import { createServerClient } from "@/lib/server/supabase-admin"
import { safeProfileNext } from "@/lib/profile"

export const metadata: Metadata = { title: "아르떼 부원 확인", robots: { index: false, follow: false } }
export const dynamic = "force-dynamic"

export default async function MembershipPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const nextPath = safeProfileNext((await searchParams).next)
  const { user } = await requireAuthUser(`/profile/membership?next=${encodeURIComponent(nextPath)}`)
  const { data: state, error } = await createServerClient().rpc("get_arte_membership_state", { p_user_id: user.id })
  if (error || !state) throw new Error("Membership status is temporarily unavailable")
  if (!state.eligible || state.status !== "unanswered") redirect(nextPath)
  return <AccountPageShell title="아르떼 부원 확인"><ArteMembershipCard initialState={state} nextPath={nextPath} /></AccountPageShell>
}
