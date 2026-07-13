import type { Metadata } from "next"
import PerformanceList from "@/components/performance-list"

export const metadata: Metadata = {
  title: "공연 목록",
  description: "DIMI-ARTE의 공연 일정과 예매 정보를 확인하세요.",
}

export default function PerformancesPage() {
  return <PerformanceList />
}
