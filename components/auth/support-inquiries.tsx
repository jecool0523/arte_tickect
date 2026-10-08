"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { SupportInquiry, SupportInquiryPage } from "@/types/support"

const date = (value: string) => new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })

export default function SupportInquiries({ admin = false, compact = false }: { admin?: boolean; compact?: boolean }) {
  const endpoint = admin ? "/api/admin/inquiries" : "/api/profile/inquiries"
  const [content, setContent] = useState("")
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [items, setItems] = useState<SupportInquiry[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(!compact)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const sending = useRef(false)
  const submission = useRef<{ key: string; content: string } | null>(null)
  const sequence = useRef(0)

  const refresh = useCallback(async (page: number) => {
    const version = ++sequence.current
    setLoading(true); setError("")
    try {
      const response = await fetch(`${endpoint}?offset=${page}`, { cache: "no-store" })
      const data: SupportInquiryPage & { error?: string } = await response.json()
      if (version !== sequence.current) return
      if (!response.ok || !data.success || !Array.isArray(data.inquiries) || !Number.isInteger(data.total))
        throw new Error(data.error || "문의 내역을 불러오지 못했습니다.")
      setItems(data.inquiries); setTotal(data.total); setOffset(page)
    } catch (failure) {
      if (version === sequence.current) setError(failure instanceof Error ? failure.message : "문의 내역을 불러오지 못했습니다.")
    } finally { if (version === sequence.current) setLoading(false) }
  }, [endpoint])
  useEffect(() => {
    if (!compact) void refresh(0)
    return () => { sequence.current++ }
  }, [compact, refresh])

  const send = async (inquiry?: SupportInquiry) => {
    if (sending.current) return
    const text = (inquiry ? replies[inquiry.id] || "" : content).trim()
    if (!text || text.length > 2000) { setError("내용을 1~2,000자로 입력해주세요."); return }
    sending.current = true; setBusy(inquiry?.id || "new"); setError(""); setNotice("")
    try {
      if (!inquiry && submission.current?.content !== text) submission.current = { key: crypto.randomUUID(), content: text }
      const response = await fetch(endpoint, {
        method: inquiry ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inquiry ? { inquiryId: inquiry.id, reply: text } : { requestKey: submission.current!.key, content: text }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "문의 요청을 처리하지 못했습니다.")
      if (inquiry) setReplies(current => ({ ...current, [inquiry.id]: "" }))
      else { setContent(""); submission.current = null }
      setNotice(inquiry ? "답변을 등록했습니다. 문의자가 내 문의 내역에서 확인할 수 있어요." : "문의를 접수했습니다. 답변은 내 문의 내역에서 확인해주세요.")
      if (!compact) await refresh(0)
    } catch (failure) { setError(failure instanceof Error ? failure.message : "잠시 후 다시 시도해주세요.") }
    finally { sending.current = false; setBusy(null) }
  }

  return (
    <Card id="admin-contact" className="border-gray-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><MessageCircle className="h-5 w-5 text-purple-600" aria-hidden="true" />{admin ? "사용자 문의" : "관리자에게 문의"}</CardTitle>
        <p className="text-sm leading-6 text-gray-600">{admin ? "답변 대기 문의부터 표시합니다. 등록한 답변은 문의자에게만 공개돼요." : "예약·계정 이용 중 궁금한 점을 남겨주세요. 답변은 사이트 안에서 확인할 수 있어요."}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {!admin && <form onSubmit={event => { event.preventDefault(); void send() }} className="space-y-3">
          <Label htmlFor="support-content" className="text-sm">문의 내용</Label>
          <Textarea id="support-content" value={content} onChange={event => setContent(event.target.value)} required maxLength={2000} rows={4} disabled={!!busy}
            placeholder="공연명이나 예약 상황을 함께 적어주시면 확인에 도움이 돼요." aria-describedby="support-privacy" className="resize-y text-base" />
          <p id="support-privacy" className="text-sm leading-6 text-gray-500">문의는 본인과 관리자만 볼 수 있어요. 비밀번호나 민감한 개인정보는 적지 마세요.</p>
          <Button type="submit" disabled={!!busy || !content.trim()} className="h-11 w-full bg-purple-600 text-white hover:bg-purple-700">{busy === "new" ? "보내는 중…" : "문의 보내기"}</Button>
        </form>}
        {notice && <p role="status" className="rounded-lg bg-purple-50 p-3 text-sm leading-6 text-purple-700">{notice}</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</p>}
        {compact ? <Button asChild variant="outline" className="h-11 w-full"><Link href="/profile/inquiries" prefetch={false}>내 문의 내역 · 답변 확인</Link></Button> : <>
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold text-gray-900">{admin ? "문의 목록" : "내 문의 내역"} {total}건</h2><Button variant="outline" disabled={loading || !!busy} onClick={() => void refresh(offset)}>새로고침</Button></div>
          {loading ? <p role="status" className="text-sm text-gray-500">문의 내역을 불러오는 중…</p> : !error && items.length === 0 ? <p className="text-sm text-gray-500">{admin ? "접수된 문의가 없습니다." : "아직 보낸 문의가 없습니다."}</p> : items.map(item => (
            <article key={item.id} className="space-y-3 rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-gray-900">{item.reply === null ? "답변 대기" : "답변 완료"}</h3><time className="text-sm text-gray-500" dateTime={item.createdAt}>{date(item.createdAt)}</time></div>
              {admin && <p className="break-words text-sm text-gray-600">문의자: {item.displayName} · 학번 {item.studentId || "미등록"}</p>}
              <p className="whitespace-pre-wrap break-words text-base leading-7 text-gray-800">{item.content}</p>
              {item.reply !== null ? <div className="space-y-2 rounded-lg bg-purple-50 p-4"><h4 className="text-sm font-semibold text-purple-800">관리자 답변</h4><p className="whitespace-pre-wrap break-words text-base leading-7 text-gray-800">{item.reply}</p>{item.repliedAt && <time className="block text-sm text-gray-500" dateTime={item.repliedAt}>{date(item.repliedAt)}</time>}</div> : admin && <form className="space-y-3" onSubmit={event => { event.preventDefault(); void send(item) }}>
                <Label htmlFor={`support-reply-${item.id}`} className="text-sm">답변 내용</Label>
                <Textarea id={`support-reply-${item.id}`} required maxLength={2000} rows={3} value={replies[item.id] || ""} disabled={!!busy} onChange={event => setReplies(current => ({ ...current, [item.id]: event.target.value }))} className="text-base" />
                <Button type="submit" disabled={!!busy || !replies[item.id]?.trim()} className="h-11 bg-purple-600 text-white hover:bg-purple-700">{busy === item.id ? "등록 중…" : "답변 등록"}</Button>
              </form>}
            </article>
          ))}
          <nav aria-label="문의 페이지" className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" disabled={loading || !!busy || offset === 0} onClick={() => void refresh(Math.max(0,offset - 20))}>이전</Button>
            <span className="text-sm text-gray-500">{Math.floor(offset / 20) + 1} / {Math.max(1,Math.ceil(total / 20))} 페이지</span>
            <Button variant="outline" disabled={loading || !!busy || offset + 20 >= total} onClick={() => void refresh(offset + 20)}>다음</Button>
          </nav>
        </>}
      </CardContent>
    </Card>
  )
}
