"use client"

import { Award, CalendarCheck, MessageSquare, Ticket } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFanExperience } from "@/components/auth/fan-experience-provider"
import { FAN_LEVELS, FAN_POINTS } from "@/lib/fan-experience"

export default function FanExperienceCard() {
  const { experience, unavailable } = useFanExperience()
  return <Card className="overflow-hidden border-purple-200 bg-white shadow-sm">
    <CardHeader className="bg-purple-50 pb-4">
      <CardTitle className="flex items-center gap-2 text-lg"><Award className="h-5 w-5 text-purple-600" aria-hidden="true" />팬 경험치</CardTitle>
    </CardHeader>
    <CardContent className="pt-5">
      {unavailable ? <p role="status" className="text-sm leading-6 text-amber-800">경험치 조회가 잠시 지연되고 있어요. 잠시 후 다시 방문해주세요.</p> : !experience ? <p role="status" className="text-sm text-gray-500">내 팬 경험치를 불러오고 있어요.</p> : <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-purple-100 px-3 py-1.5 text-base font-semibold text-purple-700">{experience.level}</span>
          <p className="text-2xl font-bold text-gray-900">{experience.totalXp.toLocaleString("ko-KR")} <span className="text-sm font-medium text-gray-500">XP</span></p>
        </div>
        <progress aria-label={experience.nextLevel ? `${experience.nextLevel}까지의 진행도` : "최고 팬 등급 달성"} max={100} value={experience.progress} className="mt-4 h-2.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-purple-100 [&::-webkit-progress-value]:bg-purple-600 [&::-moz-progress-bar]:bg-purple-600" />
        <p className="mt-2 text-sm leading-6 text-gray-600">{experience.nextLevel ? `${experience.nextLevel}까지 ${experience.remainingXp.toLocaleString("ko-KR")} XP 남았어요.` : "최고 등급이에요. 앞으로도 경험치는 계속 쌓여요."}</p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[
            { title: "예약", count: experience.bookingCount, points: FAN_POINTS.booking, Icon: Ticket, unit: "건" },
            { title: "리뷰", count: experience.reviewCount, points: FAN_POINTS.review, Icon: MessageSquare, unit: "개" },
            { title: "방문", count: experience.visitCount, points: FAN_POINTS.visit, Icon: CalendarCheck, unit: "일" },
          ].map(({ title, count, points, Icon, unit }) => <div key={title} className="rounded-lg bg-gray-50 px-2 py-3">
            <Icon className="mx-auto mb-2 h-4 w-4 text-purple-600" aria-hidden="true" />
            <p className="text-sm text-gray-600">{title}</p><p className="mt-1 text-base font-semibold text-gray-900">{count.toLocaleString("ko-KR")}{unit}</p>
            <p className="mt-1 text-sm text-purple-700">{(count * points).toLocaleString("ko-KR")} XP</p>
          </div>)}
        </div>
        <p className="mt-3 text-sm text-gray-500">{experience.visitedToday ? "오늘 방문 +10 XP 적립 완료" : "로그인하고 방문하면 하루 10 XP"}</p>
      </>}
      <details className="mt-5 border-t border-gray-200 pt-4 text-sm">
        <summary className="cursor-pointer font-medium text-gray-700">경험치·등급 기준</summary>
        <p className="mt-3 leading-6 text-gray-600">예약 완료 1건 {FAN_POINTS.booking} XP · 로그인 리뷰 1개 {FAN_POINTS.review} XP · 로그인 방문 하루 {FAN_POINTS.visit} XP</p>
        <p className="mt-2 leading-6 text-gray-500">방문은 한국 시간 기준 하루 한 번 적립해요. 계정에 연결된 기존 예약도 포함되며, 취소·삭제된 예약과 삭제한 리뷰는 제외돼요. 로그인 전에 작성한 리뷰는 포함되지 않아요.</p>
        <ul className="mt-3 space-y-1 text-gray-600">{FAN_LEVELS.map((level) => <li key={level.name}>{level.name} · {level.minXp.toLocaleString("ko-KR")} XP 이상</li>)}</ul>
      </details>
    </CardContent>
  </Card>
}
