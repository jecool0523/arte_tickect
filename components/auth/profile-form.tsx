"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { profileInputSchema, safeProfileNext } from "@/lib/profile"

type ProfileFormProps = {
  initialUsername: string
  initialDisplayName: string
  initialStudentId: string
  initialContactNumber: string
  identityLocked?: boolean
  nextPath?: string
}

export default function ProfileForm(props: ProfileFormProps) {
  const [username, setUsername] = useState(props.initialUsername)
  const [displayName, setDisplayName] = useState(props.initialDisplayName)
  const [studentId, setStudentId] = useState(props.initialStudentId)
  const [contactNumber, setContactNumber] = useState(props.initialContactNumber)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useToast()
  const save = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    const parsed = profileInputSchema.safeParse({ username, displayName, studentId, contactNumber })
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    setPending(true)
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      })
      const data = await response.json()
      if (!response.ok) { setError(data.error || "프로필을 저장하지 못했습니다."); return }
      toast({ title: "저장 완료", description: data.linkedCount > 0 ? `이전 예약 ${data.linkedCount}건을 내 티켓에 연결했어요.` : "프로필을 저장하고 이전 예약을 확인했어요." })
      if (props.nextPath) router.replace(safeProfileNext(props.nextPath))
      router.refresh()
    } catch { setError("잠시 후 다시 시도해주세요.") }
    finally { setPending(false) }
  }
  const inputClass = "h-11 rounded-lg border-gray-300 bg-white px-3 text-base text-gray-900 placeholder:text-gray-400 read-only:bg-gray-100 focus-visible:ring-purple-600"
  return (
    <form onSubmit={save} className="space-y-4">
      <fieldset disabled={pending} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium text-gray-700">아이디</Label>
          <Input id="username" required autoComplete="username" maxLength={30} pattern="[A-Za-z0-9]{1,30}" value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} />
          <p className="text-sm leading-5 text-gray-500">이메일의 @ 앞부분을 기본으로 넣었어요. 영문·숫자 1~30자로 수정할 수 있어요. 대소문자는 구분하지 않아요.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-sm font-medium text-gray-700">이름</Label>
          <Input id="displayName" required autoComplete="name" readOnly={props.identityLocked} maxLength={100} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="예약에 사용한 이름" className={inputClass} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="studentId" className="text-sm font-medium text-gray-700">학번</Label>
          <Input id="studentId" required readOnly={props.identityLocked} maxLength={20} pattern="[A-Za-z0-9_-]{1,20}" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="예: 1323" className={inputClass} />
          <p className="text-sm leading-5 text-gray-500">입력한 이름과 학번이 모두 일치하는 이전 예약을 자동 연결해요.</p>
          {props.identityLocked && <p className="text-sm leading-5 text-gray-500">예약이 연결된 이름·학번은 변경할 수 없어요. 정정이 필요하면 운영자에게 문의해주세요.</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactNumber" className="text-sm font-medium text-gray-700">연락처</Label>
          <Input id="contactNumber" type="tel" inputMode="tel" autoComplete="tel" required maxLength={30} value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="010-1234-5678" className={inputClass} />
          <p className="text-sm leading-5 text-gray-500">예매 관련 연락을 받을 번호를 입력해주세요. 다른 이용자에게 공개되지 않아요.</p>
        </div>
      </fieldset>
      <p role="status" aria-live="polite" className="text-sm text-red-600">{error}</p>
      <Button type="submit" disabled={pending} className="h-11 w-full rounded-lg bg-purple-600 font-semibold text-white shadow-sm hover:bg-purple-700">
        {pending ? "예약 확인 및 저장 중…" : props.nextPath ? "저장하고 시작하기" : "저장하고 이전 예약 동기화"}
      </Button>
    </form>
  )
}
