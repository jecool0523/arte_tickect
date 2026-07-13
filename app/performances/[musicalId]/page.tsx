import type { Metadata } from "next"
import { notFound } from "next/navigation"
import PerformanceDetailPage from "@/components/performance-detail-page"
import { getAllMusicals, getMusicalById } from "@/data/musicals"

type PerformancePageProps = { params: { musicalId: string } }

export function generateStaticParams() {
  return getAllMusicals().map((musical) => ({ musicalId: musical.id }))
}

export function generateMetadata({ params }: PerformancePageProps): Metadata {
  const musical = getMusicalById(params.musicalId)
  if (!musical) return { title: "공연을 찾을 수 없음" }

  return {
    title: musical.title.replace(/[<>]/g, "").trim(),
    description: musical.synopsis,
    openGraph: {
      title: musical.title,
      description: musical.synopsis,
      images: [musical.posterImage],
    },
  }
}

export default function PerformancePage({ params }: PerformancePageProps) {
  const musical = getMusicalById(params.musicalId)
  if (!musical) notFound()
  return <PerformanceDetailPage musical={musical} />
}
