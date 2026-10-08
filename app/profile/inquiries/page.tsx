import type { Metadata } from "next"
import AccountPageShell from "@/components/auth/account-page-shell"
import LoginCard from "@/components/auth/login-card"
import SupportInquiries from "@/components/auth/support-inquiries"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "관리자 문의", robots: { index: false, follow: false } }
export default async function InquiriesPage() {
  const auth = await createAuthServerClient()
  const { data: { user }, error } = await auth.auth.getUser()
  return <AccountPageShell title="관리자 문의" backHref="/profile">{!error && user ? <SupportInquiries /> : <LoginCard next="/profile/inquiries" />}</AccountPageShell>
}
