import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "예매 확인",
  description: "로그인한 계정의 ARTE 예매 내역을 확인합니다.",
  robots: { index: false, follow: false },
}

export default function BookingVerifyPage() {
  redirect("/profile#tickets")
}
