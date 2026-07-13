import Link from "next/link"
import { CircleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-gray-50 p-4">
      <div className="max-w-sm text-center">
        <CircleAlert className="mx-auto h-12 w-12 text-purple-600" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">페이지를 찾을 수 없습니다.</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">공연 주소가 올바른지 확인하거나 공연 목록에서 다시 선택해주세요.</p>
        <Button asChild className="mt-5 bg-purple-600 text-white hover:bg-purple-700">
          <Link href="/performances">공연 목록 보기</Link>
        </Button>
      </div>
    </main>
  )
}
