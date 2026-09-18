"use client"

import { FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

type ProfileFormProps = {
  initialDisplayName: string
  initialStudentId: string
}

export default function ProfileForm({ initialDisplayName, initialStudentId }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [studentId, setStudentId] = useState(initialStudentId)
  const [pending, setPending] = useState(false)
  const { toast } = useToast()

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setPending(true)

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          studentId: studentId.trim() || null,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        if (data.code === "STUDENT_ID_TAKEN") {
          toast({ title: "저장 실패", description: "이미 사용 중인 학번입니다.", variant: "destructive" })
        } else {
          toast({ title: "저장 실패", description: data.error || "프로필을 저장하지 못했습니다.", variant: "destructive" })
        }
        return
      }

      toast({ title: "저장 완료", description: "프로필이 저장되었습니다." })
    } catch {
      toast({ title: "저장 실패", description: "잠시 후 다시 시도해주세요.", variant: "destructive" })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName" className="text-sm font-semibold text-slate-700">이름</Label>
        <Input
          id="displayName"
          maxLength={100}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="이름을 입력하세요"
          className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 focus-visible:ring-purple-500"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="studentId" className="text-sm font-semibold text-slate-700">학번</Label>
        <Input
          id="studentId"
          maxLength={20}
          pattern="[A-Za-z0-9_-]{1,20}"
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
          placeholder="예: 1323"
          className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 focus-visible:ring-purple-500"
        />
        <p className="text-xs leading-5 text-slate-500">학번은 티켓 본인 확인을 돕는 정보이며 로그인에는 사용되지 않아요.</p>
      </div>
      <Button type="submit" disabled={pending} className="h-12 w-full rounded-xl bg-purple-700 font-semibold hover:bg-purple-800">
        {pending ? "저장 중…" : "변경사항 저장"}
      </Button>
    </form>
  )
}
