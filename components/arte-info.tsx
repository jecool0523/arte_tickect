"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Home, Music, Ticket, User, Instagram } from "lucide-react"
import Link from "next/link"

interface ArteInfoProps {
  onNavigateToHome: () => void
  onNavigateToMusical: () => void
  onNavigateToVerification: () => void
}

export default function ArteInfo({
  onNavigateToHome,
  onNavigateToMusical,
  onNavigateToVerification,
}: ArteInfoProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center p-4">
          <Button onClick={onNavigateToHome} variant="ghost" size="icon" className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-900" />
          </Button>
          <h1 className="flex-1 text-center text-lg font-bold text-gray-900 pr-10">ARTE 소개</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-32 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 로고/대표 이미지 영역 */}
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
               <span className="font-serif text-3xl font-bold text-purple-700">ARTE</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">DIMI Musical ARTE</h2>
            <p className="text-gray-500 mt-1">디미고 유일 뮤지컬 동아리</p>
          </div>

          {/* 소개 카드 */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">About ARTE</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-700 space-y-4 leading-relaxed">
              <p>
                ARTE(아르떼)는 뮤지컬을 사랑하는 학생들이 모여 함께 작품을 만들고 공연하는 동아리입니다.
              </p>
              <p>
                연기, 노래, 춤뿐만 아니라 무대 연출, 음향, 조명 등 공연의 모든 과정을 학생들이 주도적으로 이끌어갑니다.
              </p>
            </CardContent>
          </Card>

          {/* 활동 카드 */}
          <Card className="border border-gray-200 shadow-sm">
             <CardContent className="p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                   <Instagram className="h-5 w-5 text-pink-600" />
                   공식 인스타그램
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                   ARTE의 새로운 소식과 연습 과정, 비하인드 스토리를 인스타그램에서 확인하세요!
                </p>
                <Link href="https://www.instagram.com/arte_dimigo" target="_blank">
                  <Button variant="outline" className="w-full border-pink-200 text-pink-700 hover:bg-pink-50 hover:text-pink-800">
                     @arte_dimigo
                  </Button>
                </Link>
             </CardContent>
          </Card>
        </div>
      </main>

      {/* Bottom Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="flex justify-around items-start pt-1 pb-2">
          <Button
            variant="ghost"
            className="flex flex-col items-center space-y-1 text-gray-600 hover:text-purple-600 transition-colors h-auto p-2"
            onClick={onNavigateToHome}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">홈</span>
          </Button>
          <Button 
            variant="ghost" 
            className="flex flex-col items-center space-y-1 text-gray-600 hover:text-purple-600 transition-colors h-auto p-2"
            onClick={onNavigateToMusical}
          >
            <Music className="h-5 w-5" />
            <span className="text-xs">공연</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center space-y-1 text-gray-600 hover:text-purple-600 transition-colors h-auto p-2"
            onClick={onNavigateToVerification}
          >
            <Ticket className="h-5 w-5" />
            <span className="text-xs">내 티켓</span>
          </Button>
          <Button
            variant="ghost"
            className="flex flex-col items-center space-y-1 text-purple-600 h-auto p-2"
          >
            <User className="h-5 w-5" />
            <span className="text-xs font-serif font-semibold">ARTE</span>
          </Button>
        </div>
      </footer>
    </div>
  )
}
