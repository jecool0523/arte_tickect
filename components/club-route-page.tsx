"use client"

import { useRouter } from "next/navigation"
import ArteInfo from "@/components/arte-info"

export default function ClubRoutePage() {
  const router = useRouter()

  return (
    <ArteInfo
      onNavigateToHome={() => router.push("/")}
    />
  )
}
