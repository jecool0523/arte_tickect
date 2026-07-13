"use client"

import { useRouter } from "next/navigation"
import MusicalDetail from "@/components/musical-detail"
import type { MusicalInfo } from "@/types/musical"

export default function PerformanceDetailPage({ musical }: { musical: MusicalInfo }) {
  const router = useRouter()

  return (
    <MusicalDetail
      musicalInfo={musical}
      onNavigateBack={() => router.push("/performances")}
      onNavigateToBooking={() => router.push(`/performances/${musical.id}/booking`)}
    />
  )
}
