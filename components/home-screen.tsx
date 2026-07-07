"use client"

import Image from "next/image"
import { CheckCircle2, Home, Info, Music, Search, Ticket, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAllMusicals } from "@/data/musicals"

interface HomeScreenProps {
  onNavigateToMusical: (musicalId?: string) => void
  isMobile: boolean
  onNavigateToVerification: () => void
  onNavigateToArte: () => void
}

function formatDate(date: string) {
  return date.replace(/년 |월 /g, ".").replace("일", "")
}

export default function HomeScreen({
  onNavigateToMusical,
  onNavigateToVerification,
  onNavigateToArte,
}: HomeScreenProps) {
  const musicals = getAllMusicals()

  return (
    <div className="flex h-screen w-full flex-col bg-gray-50 dark:bg-gray-900">
      <header className="shrink-0 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between p-4">
          <div className="w-10" />
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">뮤지컬</h1>
          <Button variant="ghost" size="icon" className="text-gray-900 dark:text-white">
            <Search className="h-6 w-6" />
          </Button>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="공연 검색"
              className="rounded-lg border-transparent bg-gray-200 py-2.5 pl-10 pr-4 text-gray-900 placeholder-gray-400 focus:border-purple-600 focus:ring-purple-600 dark:bg-gray-800/50 dark:text-white dark:placeholder-gray-500"
            />
          </div>
        </div>

        <div className="px-4 pb-4">
          <Button
            onClick={onNavigateToVerification}
            className="w-full rounded-lg bg-purple-600 py-3 font-semibold text-white shadow-md hover:bg-purple-700"
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            예매 확인
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <section className="pb-6">
          <h2 className="px-4 pb-3 text-xl font-bold text-gray-900 dark:text-white">인기 티켓</h2>
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4">
            {musicals.map((musical, index) => (
              <button
                key={musical.id}
                type="button"
                className="w-40 shrink-0 snap-center cursor-pointer text-left"
                onClick={() => onNavigateToMusical(musical.id)}
              >
                <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingBottom: "133.33%" }}>
                  <Image src={musical.posterImage || "/placeholder.svg"} alt={musical.title} fill className="object-cover" />
                  {index === 0 && <Badge className="absolute left-2 top-2 bg-red-500 text-xs text-white">HOT</Badge>}
                </div>
                <div className="pt-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{musical.title.replace(/[<>]/g, "")}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{musical.venue}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <div className="px-4 pb-8">
          <button
            type="button"
            onClick={onNavigateToArte}
            className="group relative w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-left shadow-lg shadow-gray-200 transition-all active:scale-95"
          >
            <div className="absolute right-0 top-0 -mr-6 -mt-6 h-32 w-32 rounded-full bg-purple-500/20 blur-2xl" />
            <div className="absolute bottom-0 left-0 -mb-6 -ml-6 h-24 w-24 rounded-full bg-indigo-500/10 blur-xl" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <span className="mb-2 inline-block rounded-full border border-white/5 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-400 backdrop-blur-sm">
                  DIMI-ARTE
                </span>
                <h3 className="text-lg font-bold leading-tight tracking-wide text-white">What is ARTE?</h3>
                <p className="mt-1 text-xs font-medium text-gray-400">연극과 뮤지컬 동아리 소개</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white shadow-sm transition-all duration-300 group-hover:bg-white group-hover:text-black">
                <Info className="h-5 w-5" />
              </div>
            </div>
          </button>
        </div>

        <section className="px-4 pb-20">
          <h2 className="pb-3 text-xl font-bold text-gray-900 dark:text-white">공연 목록</h2>
          <div className="space-y-4">
            {musicals.map((musical) => (
              <button
                key={musical.id}
                type="button"
                className="flex w-full cursor-pointer items-center gap-4 rounded-lg p-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => onNavigateToMusical(musical.id)}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">{musical.genre.replace(/[{}]/g, "")}</p>
                  <h3 className="font-bold text-gray-900 dark:text-white">{musical.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {musical.venue} · {formatDate(musical.date)}
                  </p>
                </div>
                <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg">
                  <Image src={musical.posterImage || "/placeholder.svg"} alt={musical.title} fill className="object-cover" />
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="shrink-0 border-t border-gray-200 bg-gray-50/80 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">
        <nav className="flex items-center justify-around px-4 pb-4 pt-2">
          <Button variant="ghost" className="flex flex-col items-center gap-1 text-purple-600 dark:text-purple-400">
            <Home className="h-6 w-6" />
            <span className="text-xs font-medium">홈</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            onClick={() => onNavigateToMusical()}
          >
            <Music className="h-6 w-6" />
            <span className="text-xs font-medium">공연</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            onClick={onNavigateToVerification}
          >
            <Ticket className="h-6 w-6" />
            <span className="text-xs font-medium">예매</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            onClick={onNavigateToArte}
          >
            <User className="h-6 w-6" />
            <span className="font-serif text-xs font-semibold">ARTE</span>
          </Button>
        </nav>
      </footer>
    </div>
  )
}
