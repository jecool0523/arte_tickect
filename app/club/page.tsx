import type { Metadata } from "next"
import ClubRoutePage from "@/components/club-route-page"

export const metadata: Metadata = {
  title: "ARTE 소개",
  description: "디미고 연극·뮤지컬 동아리 ARTE를 소개합니다.",
}

export default function ClubPage() {
  return <ClubRoutePage />
}
