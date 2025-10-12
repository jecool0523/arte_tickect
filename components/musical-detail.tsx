"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Home, Music, Ticket, User } from "lucide-react"
import Image from "next/image"
import type { MusicalInfo } from "@/types/musical"
import { useState } from "react"

interface MusicalDetailProps {
  musicalInfo: MusicalInfo
  onNavigateBack: () => void
  onNavigateToBooking: () => void
  isMobile: boolean
}

export default function MusicalDetail({
  musicalInfo,
  onNavigateBack,
  onNavigateToBooking,
  isMobile,
}: MusicalDetailProps) {
  const [activeTab, setActiveTab] = useState("공연정보")

  const tabs = ["공연정보", "캐스팅", "관람후기"]

  return (
    <div className="relative flex flex-col min-h-screen w-full bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-sm">
        <div className="flex items-center p-4">
          <Button
            onClick={onNavigateBack}
            variant="ghost"
            size="icon"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5 text-gray-900 dark:text-white" />
          </Button>
          <h1 className="flex-1 text-center text-lg font-bold text-gray-900 dark:text-white pr-10">
            {musicalInfo.title}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow pb-32">
        {/* Hero Image */}
        <div className="relative">
          <div className="w-full h-80 bg-center bg-cover relative overflow-hidden">
            <Image
              src={musicalInfo.posterImage || "/placeholder.svg"}
              alt={musicalInfo.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
            <h2 className="text-3xl font-bold text-white">{musicalInfo.title}</h2>
            <p className="text-sm text-gray-200 mt-1">{musicalInfo.date}</p>
          </div>
        </div>

        {/* Performance Info */}
        <div className="p-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="font-semibold text-gray-600 dark:text-gray-400">장소</div>
            <div className="text-gray-900 dark:text-white">{musicalInfo.venue}</div>
            <div className="font-semibold text-gray-600 dark:text-gray-400">관람시간</div>
            <div className="text-gray-900 dark:text-white">{musicalInfo.runtime}</div>
            <div className="font-semibold text-gray-600 dark:text-gray-400">관람연령</div>
            <div className="text-gray-900 dark:text-white">{musicalInfo.ageRating}</div>
          </div>

          {/* Tab Menu */}
          <div className="mt-6 flex space-x-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-center border rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "border-purple-500 bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                    : "border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-2.5 bg-gray-100 dark:bg-gray-800"></div>

        {/* Tab Content */}
        <div className="p-5">
          {activeTab === "공연정보" && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">작품 소개</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">{musicalInfo.synopsis}</p>
              <div className="grid grid-cols-2 gap-3">
                {musicalInfo.highlights.map((highlight, index) => (
                  <div key={index} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{highlight}</p>
                  </div>
                ))}
              </div>
              <div>-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">캐스팅 정보</h3>
              <div className="flex items-center space-x-4 overflow-x-auto pb-2 -mx-5 px-5">
                {musicalInfo.cast.map((castMember, index) => (
                  <div key={index} className="flex-shrink-0 text-center w-20">
                    <div className="w-16 h-16 rounded-full mx-auto overflow-hidden bg-gray-200 dark:bg-gray-700">
                      {castMember.image ? (
                        <Image
                          src={castMember.image || "/placeholder.svg"}
                          alt={castMember.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{castMember.actor}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{castMember.name} 역</p>
                  </div>
                ))}
              </div>

              {/* Cast Details */}
              <div className="mt-6 space-y-4">
                {musicalInfo.cast.map((castMember, index) => (
                  <Card key={index} className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                          {castMember.image ? (
                            <Image
                              src={castMember.image || "/placeholder.svg"}
                              alt={castMember.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 dark:text-white">{castMember.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{castMember.actor}</p>
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded border-l-4 border-purple-500">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{castMember.intro}"</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "캐스팅" && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">캐스팅 정보</h3>
              <div className="flex items-center space-x-4 overflow-x-auto pb-2 -mx-5 px-5">
                {musicalInfo.cast.map((castMember, index) => (
                  <div key={index} className="flex-shrink-0 text-center w-20">
                    <div className="w-16 h-16 rounded-full mx-auto overflow-hidden bg-gray-200 dark:bg-gray-700">
                      {castMember.image ? (
                        <Image
                          src={castMember.image || "/placeholder.svg"}
                          alt={castMember.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{castMember.actor}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{castMember.name} 역</p>
                  </div>
                ))}
              </div>

              {/* Cast Details */}
              <div className="mt-6 space-y-4">
                {musicalInfo.cast.map((castMember, index) => (
                  <Card key={index} className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                          {castMember.image ? (
                            <Image
                              src={castMember.image || "/placeholder.svg"}
                              alt={castMember.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 dark:text-white">{castMember.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{castMember.actor}</p>
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded border-l-4 border-purple-500">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{castMember.intro}"</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "관람후기" && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">관람후기</h3>
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">아직 등록된 관람후기가 없습니다.</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">공연 관람 후 첫 번째 후기를 남겨보세요!</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Fixed Bottom Section */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-30">
        {/* Booking Button */}
        <div className="px-4 pt-3 pb-2">
          <Button
            onClick={onNavigateToBooking}
            className="w-full h-12 px-5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-base font-bold tracking-wide shadow-lg transition-colors duration-200"
          >
            예매하기
          </Button>
        </div>

        {/* Bottom Navigation */}
        <div className="flex justify-around items-start pt-1 pb-2">
          <Button
            variant="ghost"
            className="flex flex-col items-center space-y-1 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors h-auto p-2"
            onClick={onNavigateBack}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">홈</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center space-y-1 text-purple-600 dark:text-purple-400 h-auto p-2"
          >
            <Music className="h-5 w-5" />
            <span className="text-xs font-bold">공연</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center space-y-1 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors h-auto p-2"
          >
            <Ticket className="h-5 w-5" />
            <span className="text-xs">내 티켓</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center space-y-1 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors h-auto p-2"
          >
            <User className="h-5 w-5" />
            <span className="text-xs font-semibold font-serif">{"ARTE"}</span>
          </Button>
        </div>
      </footer>
    </div>
  )
}
