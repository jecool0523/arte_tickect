"use client"

import { useState } from "react"
import Image from "next/image"
import { ArrowLeft, Home, Music, Ticket, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import ReviewSection from "@/components/review-section"
import type { MusicalInfo } from "@/types/musical"

interface MusicalDetailProps {
  musicalInfo: MusicalInfo
  onNavigateBack: () => void
  onNavigateToBooking: () => void
  isMobile: boolean
}

const tabs = ["공연정보", "캐스트", "기대평/관람후기"] as const
type DetailTab = (typeof tabs)[number]

export default function MusicalDetail({ musicalInfo, onNavigateBack, onNavigateToBooking }: MusicalDetailProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("공연정보")

  const renderCastList = () => (
    <div className="space-y-6">
      <div className="-mx-5 flex items-center space-x-4 overflow-x-auto px-5 pb-2">
        {musicalInfo.cast.map((castMember) => (
          <div key={`${castMember.name}-${castMember.actor}`} className="w-20 shrink-0 text-center">
            <div className="mx-auto h-16 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              {castMember.image ? (
                <Image
                  src={castMember.image || "/placeholder.svg"}
                  alt={castMember.name}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{castMember.actor}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{castMember.name}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {musicalInfo.cast.map((castMember) => (
          <Card key={`${castMember.name}-${castMember.actor}`} className="border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  {castMember.image ? (
                    <Image
                      src={castMember.image || "/placeholder.svg"}
                      alt={castMember.name}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-white">{castMember.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{castMember.actor}</p>
                </div>
              </div>
              <div className="rounded border-l-4 border-purple-500 bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-sm italic text-gray-700 dark:text-gray-300">&ldquo;{castMember.intro}&rdquo;</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white dark:bg-gray-900">
      <header className="sticky top-0 z-20 bg-white/90 shadow-sm backdrop-blur-sm dark:bg-gray-900/90">
        <div className="flex items-center p-4">
          <Button onClick={onNavigateBack} variant="ghost" size="icon" className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="h-5 w-5 text-gray-900 dark:text-white" />
          </Button>
          <h1 className="flex-1 pr-10 text-center text-lg font-bold text-gray-900 dark:text-white">{musicalInfo.title}</h1>
        </div>
      </header>

      <main className="grow pb-32">
        <div className="relative">
          <div className="relative h-80 w-full overflow-hidden bg-gray-200">
            <Image src={musicalInfo.posterImage || "/placeholder.svg"} alt={musicalInfo.title} fill className="object-cover" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <h2 className="text-3xl font-bold text-white">{musicalInfo.title}</h2>
            <p className="mt-1 text-sm text-gray-200">{musicalInfo.date}</p>
          </div>
        </div>

        <div className="p-5">
          <div className="space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700">
              <div className="font-semibold text-gray-600 dark:text-gray-400">장소</div>
              <div className="text-right text-gray-900 dark:text-white">{musicalInfo.venue}</div>
            </div>
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700">
              <div className="font-semibold text-gray-600 dark:text-gray-400">관람시간</div>
              <div className="text-right text-gray-900 dark:text-white">{musicalInfo.runtime}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-600 dark:text-gray-400">관람연령</div>
              <div className="text-right text-gray-900 dark:text-white">{musicalInfo.ageRating}</div>
            </div>
          </div>

          <div className="mt-6 flex space-x-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-lg border py-3 text-center text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "border-purple-500 bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="h-2.5 bg-gray-100 dark:bg-gray-800" />

        <div className="p-5">
          {activeTab === "공연정보" && (
            <div>
              <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">작품 소개</h3>
              <p className="mb-6 leading-relaxed text-gray-700 dark:text-gray-300">{musicalInfo.synopsis}</p>
              <div className="mb-8 grid grid-cols-2 gap-3">
                {musicalInfo.highlights.map((highlight) => (
                  <div key={highlight} className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{highlight}</p>
                  </div>
                ))}
              </div>
              <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">캐스트 정보</h3>
              {renderCastList()}
            </div>
          )}

          {activeTab === "캐스트" && (
            <div>
              <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">캐스트 정보</h3>
              {renderCastList()}
            </div>
          )}

          {activeTab === "기대평/관람후기" && (
            <div>
              <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">기대평/관람후기</h3>
              <ReviewSection musicalId={musicalInfo.id} />
            </div>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-gray-700 dark:bg-gray-900">
        <div className="px-4 pb-2 pt-3">
          <Button
            onClick={onNavigateToBooking}
            className="h-12 w-full rounded-lg bg-purple-600 px-5 text-base font-bold tracking-wide text-white shadow-lg transition-colors duration-200 hover:bg-purple-700"
          >
            예매하기
          </Button>
        </div>

        <div className="flex items-start justify-around pb-2 pt-1">
          <Button variant="ghost" className="flex h-auto flex-col items-center space-y-1 p-2 text-gray-600 transition-colors hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400" onClick={onNavigateBack}>
            <Home className="h-5 w-5" />
            <span className="text-xs">홈</span>
          </Button>
          <Button variant="ghost" className="flex h-auto flex-col items-center space-y-1 p-2 text-purple-600 dark:text-purple-400">
            <Music className="h-5 w-5" />
            <span className="text-xs font-bold">공연</span>
          </Button>
          <Button variant="ghost" className="flex h-auto flex-col items-center space-y-1 p-2 text-gray-600 transition-colors hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400">
            <Ticket className="h-5 w-5" />
            <span className="text-xs">예매</span>
          </Button>
          <Button variant="ghost" className="flex h-auto flex-col items-center space-y-1 p-2 text-gray-600 transition-colors hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400">
            <User className="h-5 w-5" />
            <span className="font-serif text-xs font-semibold">ARTE</span>
          </Button>
        </div>
      </footer>
    </div>
  )
}
