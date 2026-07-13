import type { Metadata } from "next"
import { notFound } from "next/navigation"
import BookingCompleteRoutePage from "@/components/booking-complete-route-page"
import { getMusicalById } from "@/data/musicals"

export const metadata: Metadata = {
  title: "예매 완료",
  robots: { index: false, follow: false },
}

export default function BookingCompletePage({ params }: { params: { musicalId: string } }) {
  const musical = getMusicalById(params.musicalId)
  if (!musical) notFound()
  return <BookingCompleteRoutePage musical={musical} />
}
