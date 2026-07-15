import type { Metadata } from "next"
import { notFound } from "next/navigation"
import BookingRoutePage from "@/components/booking-route-page"
import { getMusicalById } from "@/data/musicals"

export const metadata: Metadata = {
  title: "예매 정보 입력",
  robots: { index: false, follow: false },
}

export default async function BookingPage({ params }: { params: Promise<{ musicalId: string }> }) {
  const { musicalId } = await params
  const musical = getMusicalById(musicalId)
  if (!musical) notFound()
  return <BookingRoutePage musical={musical} />
}
