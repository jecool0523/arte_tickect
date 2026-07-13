"use client"

import { useRouter } from "next/navigation"
import BookingVerification from "@/components/booking-verification"

export default function BookingVerificationRoutePage() {
  const router = useRouter()
  return <BookingVerification onBack={() => router.push("/")} />
}
