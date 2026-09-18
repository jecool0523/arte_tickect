import type { Metadata } from "next"
import { CalendarDays, ChevronRight, Mail, Search, Shield, Ticket, Trash2, UserCheck, UserPlus, Users, X } from "lucide-react"
import Link from "next/link"
import AdminDashboard from "@/components/admin/admin-dashboard"

export const metadata: Metadata = {
  title: "관리자 대시보드",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default function AdminPage() {
  return <AdminDashboard />
}