import Link from "next/link"
import { CircleAlert, Clock3, TicketX } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TicketShareError({ reason }: { reason: "invalid" | "expired" | "not-found" | "unavailable" }) {
  const expired = reason === "expired"
  const unavailable = reason === "unavailable"
  const Icon = expired ? Clock3 : unavailable ? CircleAlert : TicketX
  const title = expired ? "공유 링크가 만료되었습니다." : unavailable ? "티켓을 불러올 수 없습니다." : "유효하지 않은 티켓 링크입니다."
  const description = expired
    ? "예매자에게 새로운 공유 링크를 요청해주세요."
    : unavailable
      ? "잠시 후 다시 시도해주세요."
      : "링크가 변경되었거나 존재하지 않는 예약입니다."

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md text-center">
        <Icon className="mx-auto h-14 w-14 text-purple-500" />
        <h1 className="mt-5 text-xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
        <Button asChild className="mt-6 bg-purple-600 text-white hover:bg-purple-700">
          <Link href="/">ARTE 홈으로</Link>
        </Button>
      </div>
    </main>
  )
}
