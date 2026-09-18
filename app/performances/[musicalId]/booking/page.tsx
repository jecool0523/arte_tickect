import type { Metadata } from "next"
import { notFound } from "next/navigation"
import BookingRoutePage from "@/components/booking-route-page"
import { getMusicalById } from "@/data/musicals"
import { requireAuthUser } from "@/lib/server/require-auth"

export const metadata: Metadata = {
  title: "예매 정보 입력",
  robots: { index: false, follow: false },
}

export default async function BookingPage({ params }: { params: Promise<{ musicalId: string }> }) {
  const { musicalId } = await params
  const musical = getMusicalById(musicalId)
  if (!musical) notFound()
  await requireAuthUser(`/performances/${musicalId}/booking`)
  return <BookingRoutePage musical={musical} />
}
