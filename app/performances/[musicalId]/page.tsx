import type { Metadata } from "next"
import { notFound } from "next/navigation"
import PerformanceDetailPage from "@/components/performance-detail-page"
import { getAllMusicals, getMusicalById } from "@/data/musicals"

type PerformancePageProps = { params: Promise<{ musicalId: string }> }

export function generateStaticParams() {
  return getAllMusicals().map((musical) => ({ musicalId: musical.id }))
}

export async function generateMetadata({ params }: PerformancePageProps): Promise<Metadata> {
  const { musicalId } = await params
  const musical = getMusicalById(musicalId)
  if (!musical) return { title: "공연을 찾을 수 없음" }

  return {
    title: musical.title.replace(/[<>]/g, "").trim(),
    description: musical.synopsis,
    openGraph: {
      title: musical.title,
      description: musical.synopsis,
      images: ["/toc-toc/poster.jpg"],
    },
    twitter: {
      card: "summary_large_image",
      title: musical.title,
      description: musical.synopsis,
      images: ["/toc-toc/poster.jpg"],
    },
  }
}

export default async function PerformancePage({ params }: PerformancePageProps) {
  const { musicalId } = await params
  const musical = getMusicalById(musicalId)
  if (!musical) notFound()
  return <PerformanceDetailPage musical={musical} />
}
