import type { Metadata } from "next"
import { notFound } from "next/navigation"
import SeatSelectionRoutePage from "@/components/seat-selection-route-page"
import { getMusicalById } from "@/data/musicals"

export const metadata: Metadata = {
  title: "좌석 선택",
  robots: { index: false, follow: false },
}

export default function SeatSelectionPage({ params }: { params: { musicalId: string } }) {
  const musical = getMusicalById(params.musicalId)
  if (!musical) notFound()
  return <SeatSelectionRoutePage musical={musical} />
}
