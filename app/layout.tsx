import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    template: "%s | DIMI-ARTE",
    default: "DIMI-ARTE - 디미고 뮤지컬 동아리 아르떼 공식 사이트",
  },
  description: "한국 디지털 미디어 고등학교(DIMIGO)의 연극/뮤지컬 동아리 ARTE 공식 사이트입니다.",
  keywords: [
    "뮤지컬",
    "예매",
    "티켓",
    "ARTE",
    "아르떼",
    "DIMI",
    "dimigo",
    "한국디지털미디어고등학교",
    "디미고",
    "RENT",
    "죽은 시인의 사회",
  ],
  authors: [{ name: "Jesiwon in Team ARTE" }],
  creator: "ARTE",
  openGraph: {
    title: "DIMI-ARTE",
    description: "디미고 연극/뮤지컬 동아리 ARTE의 공식 사이트",
    url: "https://arte-tickecting.vercel.app",
    siteName: "DIMI-ARTE",
    images: [
      {
        url: "/poster.jpg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  icons: {
    icon: "/icon.svg",
  },
  verification: {
    google:"8dWSZu37D_Ii3mHGfkZ3bBoyxWazDyLAroX2qVjJsuA",
    other: {
      "naver-site-verification": "da49b920f4d652fbcd0b3023cf55b32790e2f792", // 네이버 서치어드바이저용
    },
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
