import type { Metadata } from "next"
import { notFound } from "next/navigation"
import BookingCompleteRoutePage from "@/components/booking-complete-route-page"
import { getMusicalById } from "@/data/musicals"
import { requireAuthUser } from "@/lib/server/require-auth"

export const metadata: Metadata = {
  title: "예매 완료",
  robots: { index: false, follow: false },
}

export default async function BookingCompletePage({ params }: { params: Promise<{ musicalId: string }> }) {
  const { musicalId } = await params
  const musical = getMusicalById(musicalId)
  if (!musical) notFound()
  await requireAuthUser(`/performances/${musicalId}/booking/complete`)
  return <BookingCompleteRoutePage musical={musical} />
}
