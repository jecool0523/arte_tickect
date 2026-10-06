import type { Metadata } from "next"
import PerformanceList from "@/components/performance-list"
import { getLiveMusicals } from "@/lib/server/performances"
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "공연 목록",
  description: "DIMI-ARTE의 공연 일정과 예매 정보를 확인하세요.",
}

export default async function PerformancesPage() {
  return <PerformanceList musicals={await getLiveMusicals()} />
}
