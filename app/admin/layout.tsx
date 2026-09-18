import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireAdminUser } from "@/lib/server/require-auth"

export const metadata: Metadata = {
  title: "관리자 대시보드",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminUser("/admin")
  return <>{children}</>
}