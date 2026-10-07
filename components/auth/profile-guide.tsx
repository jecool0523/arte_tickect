"use client"

import { useEffect, useState } from "react"
import { Award, CircleHelp, Ticket, UserRound } from "lucide-react"
import LayerPopup from "@/components/layer-popup"
import { Button } from "@/components/ui/button"
import { dismissProfileGuide, shouldShowProfileGuide } from "@/lib/profile-guide"

function browserStorage() {
  try { return window.localStorage } catch { return null }
}

export default function ProfileGuide() {
  const [open, setOpen] = useState(false)
  useEffect(() => { setOpen(shouldShowProfileGuide(browserStorage())) }, [])

  const onOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) dismissProfileGuide(browserStorage())
    setOpen(nextOpen)
  }

  return <LayerPopup open={open} onOpenChange={onOpenChange} title="프로필, 이렇게 사용해요" description="Google 로그인 후 내 정보와 티켓, 팬 등급을 한곳에서 확인해요."
    trigger={<Button type="button" variant="ghost" className="h-10 gap-2 text-sm text-purple-700 hover:bg-purple-50"><CircleHelp className="h-4 w-4" aria-hidden="true" />프로필 사용 안내</Button>}>
    <div className="space-y-3">
      {[
        { Icon: UserRound, title: "내 정보와 이전 예약 연결", description: "아이디·이름·학번·연락처를 등록해요. 입력한 이름과 학번이 모두 일치하는 미연결 예약을 내 계정에 연결해요." },
        { Icon: Ticket, title: "예약 내역에서 내 티켓 확인", description: "‘내 예약 내역 보기’에서 공연별 예약을 확인해요. 완료된 예약의 티켓·좌석을 보고 티켓을 이미지로 저장할 수 있어요." },
        { Icon: Award, title: "활동할수록 올라가는 팬 등급", description: "예약 완료 100 XP, 로그인 리뷰 50 XP, 하루 방문 10 XP를 쌓아요. 팬 경험치에서 현재 등급과 다음 등급까지 남은 점수를 확인해요." },
      ].map(({ Icon, title, description }) => <section key={title} className="flex gap-3 rounded-xl bg-gray-50 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600"><Icon className="h-5 w-5" aria-hidden="true" /></span>
        <div className="min-w-0"><h3 className="text-base font-semibold leading-6">{title}</h3><p className="mt-1 text-sm leading-6 text-gray-600">{description}</p></div>
      </section>)}
    </div>
    <p className="mt-4 text-sm leading-6 text-gray-500">안내를 닫으면 이 브라우저에서는 다시 자동으로 표시하지 않아요. 언제든 ‘프로필 사용 안내’에서 다시 볼 수 있어요.</p>
  </LayerPopup>
}
