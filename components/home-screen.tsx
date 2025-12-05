"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Home, Music, Ticket, User, CheckCircle2 } from "lucide-react"
import Image from "next/image"
import { getAllMusicals } from "@/data/musicals"

interface HomeScreenProps {
  onNavigateToMusical: (musicalId: string) => void
  isMobile: boolean
  onNavigateToVerification: () => void
  onNavigateToArte: () => void
}

export default function HomeScreen({ onNavigateToMusical, isMobile, onNavigateToVerification,onNavigateToArte }: HomeScreenProps) {
  const allMusicals = getAllMusicals()

  const popularTickets = allMusicals.map((musical, index) => ({
    id: index + 1,
    musicalId: musical.id,
    title: musical.title.replace(/[<>]/g, ""),
    subtitle: musical.subtitle,
    venue: musical.venue,
    date:
      musical.date.split(" ")[0] +
      "." +
      musical.date.split(" ")[1] +
      "." +
      musical.date.split(" ")[2].replace("일", ""),
    image: musical.posterImage,
    category: musical.genre.replace(/[{}]/g, ""),
    isHot: index === 0,
  }))

  const popularEvents = allMusicals.map((musical, index) => ({
    id: index + 1,
    musicalId: musical.id,
    title: musical.title.replace(/[<>]/g, ""),
    venue: musical.venue,
    date:
      musical.date.split(" ")[0] +
      "." +
      musical.date.split(" ")[1] +
      "." +
      musical.date.split(" ")[2].replace("일", ""),
    category: musical.genre.replace(/[{}]/g, ""),
    image: musical.posterImage,
  }))

  return (
    <div className="flex h-screen w-full flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="flex-shrink-0 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between p-4">
          <div className="w-10"></div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">뮤지컬</h1>
          <Button variant="ghost" size="icon" className="text-gray-900 dark:text-white">
            <Search className="h-6 w-6" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="검색"
              className="pl-10 pr-4 py-2.5 bg-gray-200 dark:bg-gray-800/50 border-transparent rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-purple-600 focus:ring-purple-600"
            />
          </div>
        </div>

        {/* 예매 확인 버튼 */}
        <div className="px-4 pb-4">
          <Button
            onClick={onNavigateToVerification}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg shadow-md"
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            예매 확인
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Popular Tickets Section */}
        <section className="pb-6">
          <h2 className="px-4 pb-3 text-xl font-bold text-gray-900 dark:text-white">인기 티켓</h2>
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 scrollbar-hide">
            {popularTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="w-40 flex-shrink-0 snap-center cursor-pointer"
                onClick={ticket.musicalId ? () => onNavigateToMusical(ticket.musicalId) : undefined}
              >
                <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingBottom: "133.33%" }}>
                  <Image src={ticket.image || "/placeholder.svg"} alt={ticket.title} fill className="object-cover" />
                  {ticket.isHot && <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs">HOT</Badge>}
                </div>
                <div className="pt-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{ticket.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{ticket.venue}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ARTE 소개 배너 (인기 이벤트 바로 위) */}
        <div className="px-4 pb-8">
          <div 
            onClick={onNavigateToArte}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-gray-900 p-5 shadow-lg cursor-pointer transition-all active:scale-95"
          >
            {/* 배경 데코레이션 */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-16 w-16 rounded-full bg-purple-500/20 blur-lg"></div>

            <div className="relative z-10 flex items-center justify-between">
              <div>
                <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white mb-2 backdrop-blur-sm">
                  KSA ARTE
                </span>
                <h3 className="text-lg font-bold text-white leading-tight">
                  아르떼가 궁금하다면?
                </h3>
                <p className="mt-1 text-xs text-gray-300">
                  동아리 소개 및 부원 모집 안내
                </p>
              </div>
              
              {/* 아이콘 버튼 */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 shadow-sm group-hover:scale-110 transition-transform">
                <Info className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Popular Events Section */}
        <section className="px-4 pb-20">
          <h2 className="pb-3 text-xl font-bold text-gray-900 dark:text-white">인기 이벤트</h2>
          <div className="space-y-4">
            {popularEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                onClick={event.musicalId ? () => onNavigateToMusical(event.musicalId) : undefined}
              >
                <div className="flex-1">
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">{event.category}</p>
                  <h3 className="font-bold text-gray-900 dark:text-white">{event.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {event.venue} · {event.date}
                  </p>
                </div>
                <div className="relative h-20 w-28 rounded-lg overflow-hidden flex-shrink-0">
                  <Image src={event.image || "/placeholder.svg"} alt={event.title} fill className="object-cover" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <footer className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <nav className="flex items-center justify-around px-4 pt-2 pb-4">
          <Button variant="ghost" className="flex flex-col items-center gap-1 text-purple-600 dark:text-purple-400">
            <Home className="h-6 w-6" />
            <span className="text-xs font-medium">홈</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            onClick={onNavigateToMusical}
          >
            <Music className="h-6 w-6" />
            <span className="text-xs font-medium">공연</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            onClick={onNavigateToVerification}
          >
            <Ticket className="h-6 w-6" />
            <span className="text-xs font-medium">내 티켓</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            onClick={onNavigateToArte}
          >
            <User className="h-6 w-6" />
            <span className="text-xs font-semibold font-serif">{"ARTE"}</span>
          </Button>
        </nav>
      </footer>
    </div>
  )
}
