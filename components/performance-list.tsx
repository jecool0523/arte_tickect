import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import AppBottomNav from "@/components/app-bottom-nav"
import { Button } from "@/components/ui/button"
import { getAllMusicals } from "@/data/musicals"

export default function PerformanceList() {
  const musicals = getAllMusicals()

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gray-50">
      <header className="shrink-0 border-b border-gray-200 bg-white">
        <div className="flex items-center p-4">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link href="/" aria-label="홈으로 돌아가기">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="flex-1 pr-10 text-center text-lg font-bold text-gray-900">공연 목록</h1>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {musicals.map((musical) => (
            <Link
              key={musical.id}
              href={`/performances/${musical.id}`}
              className="flex gap-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-[620/877] w-24 shrink-0 overflow-hidden rounded-md bg-gray-100">
                <Image src={musical.posterImage} alt={musical.title} fill unoptimized sizes="96px" className="object-contain" />
              </div>
              <div className="min-w-0 py-1">
                <p className="text-xs font-semibold text-purple-600">{musical.genre.replace(/[{}]/g, "")}</p>
                <h2 className="mt-1 break-words font-bold text-gray-900">{musical.title}</h2>
                <p className="mt-2 text-sm text-gray-500">{musical.date}</p>
                <p className="mt-1 text-sm text-gray-500">{musical.venue}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="shrink-0 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <AppBottomNav active="performances" />
      </footer>
    </div>
  )
}
