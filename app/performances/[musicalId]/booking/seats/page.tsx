import type { Metadata } from "next"
import { notFound } from "next/navigation"
import SeatSelectionRoutePage from "@/components/seat-selection-route-page"
import { getMusicalById } from "@/data/musicals"
import { requireAuthUser } from "@/lib/server/require-auth"

export const metadata: Metadata = {
  title: "좌석 선택",
  robots: { index: false, follow: false },
}

export default async function SeatSelectionPage({ params }: { params: Promise<{ musicalId: string }> }) {
  const { musicalId } = await params
  const musical = getMusicalById(musicalId)
  if (!musical) notFound()
  await requireAuthUser(`/performances/${musicalId}/booking/seats`)
  return <SeatSelectionRoutePage musical={musical} />
}
