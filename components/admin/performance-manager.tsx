"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { performanceDetailsSchema, performanceSaveSchema, fromKoreaDateTimeInput, toKoreaDateTimeInput, type PerformanceDetails } from "@/lib/performance-settings"
import type { MusicalInfo } from "@/types/musical"
type Period = { musical_name: string; start_time: string; end_time: string }
const fields: [keyof PerformanceDetails, string][] = [["title","공연명"],["subtitle","부제"],["genre","장르"],["special","안내"],["runtime","관람 시간"],["ageRating","관람 등급"],["venue","공연장"],["date","공연 날짜"],["time","공연 시간"],["posterImage","포스터 경로 / HTTPS 주소"]]

function PerformanceEditor({ musical, period }: { musical: MusicalInfo; period?: Period }) {
  const [details, setDetails] = useState<PerformanceDetails>(() => performanceDetailsSchema.parse(Object.fromEntries([...fields.map(([key]) => [key, musical[key]]), ["synopsis", musical.synopsis]])))
  const [start, setStart] = useState(toKoreaDateTimeInput(period?.start_time ?? ""))
  const [end, setEnd] = useState(toKoreaDateTimeInput(period?.end_time ?? ""))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [failed, setFailed] = useState(false)
  async function save(event: React.FormEvent) {
    event.preventDefault(); setMessage(""); setSaving(true); setFailed(false)
    try {
      const body = { musicalId: musical.id, details, startTime: fromKoreaDateTimeInput(start), endTime: fromKoreaDateTimeInput(end) }
      if (!performanceSaveSchema.safeParse(body).success) throw new Error("공연 정보와 예매 기간을 확인해주세요. 종료는 시작 이후여야 해요.")
      const response = await fetch("/api/admin/performances", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "저장하지 못했어요.")
      setMessage("저장했어요. 공연 화면에 반영되었습니다.")
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "저장하지 못했어요.") }
    finally { setSaving(false) }
  }
  return <Card><CardHeader><CardTitle>{musical.title}</CardTitle><Link className="text-sm text-purple-600" href={`/performances/${musical.id}`} prefetch={false}>공연 페이지 보기</Link></CardHeader>
    <CardContent><form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">{fields.map(([key,label]) => <label key={key} className="space-y-2 text-sm font-medium text-gray-700"><span>{label}</span><Input disabled={saving} value={details[key]} maxLength={key === "posterImage" ? 2000 : key === "venue" ? 200 : 100} required={!["subtitle","special"].includes(key)} onChange={(e)=>setDetails({...details,[key]:e.target.value})} /></label>)}</div>
      <label className="block space-y-2 text-sm font-medium text-gray-700"><span>줄거리</span><textarea disabled={saving} required maxLength={8000} value={details.synopsis} onChange={(e)=>setDetails({...details,synopsis:e.target.value})} className="min-h-32 w-full rounded-md border border-gray-200 bg-white p-3 text-base" /></label>
      <fieldset className="rounded-lg border border-purple-100 p-4"><legend className="px-2 text-sm font-semibold">일반 예매 기간 · 한국 시간</legend><div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm"><span>예매 시작</span><Input type="datetime-local" step="1" required disabled={saving} value={start} onChange={(e)=>setStart(e.target.value)} /></label>
        <label className="space-y-2 text-sm"><span>예매 종료</span><Input type="datetime-local" step="1" required disabled={saving} value={end} onChange={(e)=>setEnd(e.target.value)} /></label>
      </div><p className="mt-3 text-sm text-gray-500">기간을 변경하면 실제 일반 예매 가능 시간이 변경됩니다. 기존 예약과 선예매 코드는 유지됩니다.</p></fieldset>
      {message && <p role={failed ? "alert" : "status"} className={failed ? "text-sm text-red-700" : "text-sm text-purple-700"}>{message}</p>}
      <Button disabled={saving} className="h-11 w-full bg-purple-600 text-white hover:bg-purple-700">{saving ? "저장 중..." : "공연 정보 저장"}</Button>
    </form></CardContent></Card>
}
export default function PerformanceManager() {
  const [data,setData] = useState<{ performances: MusicalInfo[]; periods: Period[] } | null>(null)
  const [error,setError] = useState("")
  async function load() {
    setError("")
    try { const response=await fetch("/api/admin/performances",{cache:"no-store"}); const result=await response.json(); if(!response.ok)throw new Error(result.error); setData(result) }
    catch { setError("공연 정보를 불러오지 못했어요. 다시 시도해주세요.") }
  }
  useEffect(()=>{void load()},[])
  if(error)return <div role="alert" className="space-y-3"><p>{error}</p><Button onClick={load}>다시 시도</Button></div>
  if(!data)return <p role="status" className="py-8 text-gray-500">공연 정보를 불러오는 중...</p>
  return <div className="space-y-6">{data.performances.map(musical=><PerformanceEditor key={musical.id} musical={musical} period={data.periods.find(p=>p.musical_name===musical.id)} />)}</div>
}
