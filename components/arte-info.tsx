"use client"

import Link from "next/link"
import { ArrowLeft, Home, Instagram, Music, Ticket, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ArteInfoProps {
  onNavigateToHome: () => void
  onNavigateToMusical: () => void
  onNavigateToVerification: () => void
}

export default function ArteInfo({ onNavigateToHome, onNavigateToMusical, onNavigateToVerification }: ArteInfoProps) {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center p-4">
          <Button onClick={onNavigateToHome} variant="ghost" size="icon" className="rounded-full p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-900" />
          </Button>
          <h1 className="flex-1 pr-10 text-center text-lg font-bold text-gray-900">ARTE 소개</h1>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-4 pb-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-purple-100 shadow-inner">
              <span className="font-serif text-3xl font-bold text-purple-700">ARTE</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">DIMI Musical ARTE</h2>
            <p className="mt-1 text-gray-500">디미고 연극·뮤지컬 동아리</p>
          </div>

          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">About ARTE</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 leading-relaxed text-gray-700">
              <p>ARTE는 연극과 뮤지컬을 사랑하는 학생들이 모여 함께 작품을 만들고 공연하는 동아리입니다.</p>
              <p>
                연기, 노래, 춤뿐 아니라 무대 연출, 음향, 조명 등 공연의 모든 과정을 학생들이 주도적으로 만들어갑니다.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-900">
                <Instagram className="h-5 w-5 text-pink-600" />
                공식 랜딩페이지
              </h3>
              <p className="mb-4 text-sm text-gray-600">
                ARTE의 새로운 소식, 연습 과정, 비하인드 스토리를 확인하세요.(PC 환경 감상을 추천드립니다.)
              </p>
              <Link href="https://arte-randingpage.vercel.app/" target="_blank">
                <Button variant="outline" className="w-full border-pink-200 text-pink-700 hover:bg-pink-50 hover:text-pink-800">
                  @arte_dimigo
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="z-30 shrink-0 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-start justify-around pb-2 pt-1">
          <Button variant="ghost" className="flex h-auto flex-col items-center space-y-1 p-2 text-gray-600 hover:text-purple-600" onClick={onNavigateToHome}>
            <Home className="h-5 w-5" />
            <span className="text-xs">홈</span>
          </Button>
          <Button variant="ghost" className="flex h-auto flex-col items-center space-y-1 p-2 text-gray-600 hover:text-purple-600" onClick={onNavigateToMusical}>
            <Music className="h-5 w-5" />
            <span className="text-xs">공연</span>
          </Button>
          <Button variant="ghost" className="flex h-auto flex-col items-center space-y-1 p-2 text-gray-600 hover:text-purple-600" onClick={onNavigateToVerification}>
            <Ticket className="h-5 w-5" />
            <span className="text-xs">예매</span>
          </Button>
          <Button variant="ghost" className="flex h-auto flex-col items-center space-y-1 p-2 text-purple-600">
            <User className="h-5 w-5" />
            <span className="font-serif text-xs font-semibold">ARTE</span>
          </Button>
        </div>
      </footer>
    </div>
  )
}
