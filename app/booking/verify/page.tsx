import type { Metadata } from "next"
import BookingVerificationRoutePage from "@/components/booking-verification-route-page"

export const metadata: Metadata = {
  title: "예매 확인",
  description: "이름과 학번으로 ARTE 예매 내역을 확인합니다.",
  robots: { index: false, follow: false },
}

export default function BookingVerifyPage() {
  return <BookingVerificationRoutePage />
}
