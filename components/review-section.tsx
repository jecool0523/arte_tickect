"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Film, Loader2, Maximize2, PlayCircle, Plus, Quote, Send, Star, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase"

interface Review {
  id: number
  user_name: string
  content: string
  image_url: string | null
  rating: number
  created_at: string
}

type PreviewMedia = {
  url: string
  type: "image" | "video"
}

const videoExtensions = new Set(["mp4", "webm", "ogg", "mov", "quicktime"])

function isVideoUrl(url: string) {
  const ext = url.split(".").pop()?.toLowerCase()
  return videoExtensions.has(ext || "")
}

function parseMediaUrls(urlJson: string | null): string[] {
  if (!urlJson) return []
  try {
    const parsed = JSON.parse(urlJson)
    return Array.isArray(parsed) ? parsed : [urlJson]
  } catch {
    return [urlJson]
  }
}

export default function ReviewSection({ musicalId }: { musicalId: string }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<PreviewMedia[]>([])
  const [zoomedMedia, setZoomedMedia] = useState<PreviewMedia | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const [form, setForm] = useState({
    name: "",
    password: "",
    content: "",
    rating: 5,
  })

  const fetchReviews = useCallback(async () => {
    try {
      const response = await fetch(`/api/reviews?musicalId=${encodeURIComponent(musicalId)}`, {
        cache: "no-store",
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Failed to load reviews.")

      setReviews(data.reviews || [])
    } catch (error) {
      console.error(error)
      toast({ title: "오류 발생", description: "리뷰를 불러오지 못했습니다.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [musicalId, toast])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    const newFiles = Array.from(files)
    const newPreviews = newFiles.map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
    })) satisfies PreviewMedia[]

    setSelectedFiles((prev) => [...prev, ...newFiles])
    setPreviews((prev) => [...prev, ...newPreviews])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]?.url || "")
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name || !form.password || !form.content) {
      toast({ title: "입력 오류", description: "이름, 비밀번호, 내용을 모두 입력해주세요.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    const uploadedUrls: string[] = []

    try {
      if (selectedFiles.length > 0) {
        const supabase = getSupabaseBrowserClient()
        const urls = await Promise.all(
          selectedFiles.map(async (file) => {
            const fileExt = file.name.split(".").pop()
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`

            const { error: uploadError } = await supabase.storage.from("review-images").upload(fileName, file)
            if (uploadError) throw uploadError

            const { data: publicUrlData } = supabase.storage.from("review-images").getPublicUrl(fileName)
            return publicUrlData.publicUrl
          }),
        )
        uploadedUrls.push(...urls)
      }

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          musicalId,
          name: form.name,
          password: form.password,
          content: form.content,
          rating: form.rating,
          imageUrl: uploadedUrls.length > 0 ? JSON.stringify(uploadedUrls) : null,
        }),
      })
      const responseData = await response.json()

      if (!response.ok) throw new Error(responseData.error || "Review create failed.")

      toast({ title: "작성 완료", description: "리뷰가 등록되었습니다." })
      setForm({ name: "", password: "", content: "", rating: 5 })
      setSelectedFiles([])
      setPreviews([])
      fetchReviews()
    } catch (error) {
      console.error(error)
      toast({
        title: "오류 발생",
        description: "리뷰 등록 중 문제가 발생했습니다. 파일 크기와 네트워크 상태를 확인해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    const inputPassword = prompt("등록할 때 입력한 비밀번호 4자리를 입력하세요.")
    if (!inputPassword) {
      alert("비밀번호를 입력해주세요.")
      return
    }

    const response = await fetch(`/api/reviews/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: inputPassword }),
    })

    if (response.ok) {
      toast({ title: "삭제 완료", description: "리뷰가 삭제되었습니다." })
      fetchReviews()
    } else {
      const data = await response.json().catch(() => ({}))
      alert(data.error || "비밀번호가 일치하지 않습니다.")
    }
  }

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border-none bg-white/80 shadow-lg ring-1 ring-gray-100 backdrop-blur-sm dark:bg-gray-800/80 dark:ring-gray-700">
        <div className="h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500" />
        <CardContent className="space-y-5 p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
              <span className="text-2xl">★</span>
              사진/영상 리뷰 남기기
            </h3>
            <div className="flex items-center gap-1 rounded-full border border-yellow-100 bg-yellow-50 px-2 py-1 dark:border-yellow-900 dark:bg-yellow-900/20">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setForm({ ...form, rating: star })}
                  className={`transition-transform hover:scale-125 ${star <= form.rating ? "text-yellow-500" : "text-gray-300"}`}
                >
                  <Star className="h-5 w-5 fill-current" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="이름 또는 닉네임"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="flex-1 border-gray-200 bg-gray-50 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-900"
            />
            <Input
              type="password"
              placeholder="비밀번호 4자리"
              maxLength={4}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="bg-gray-50 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-900 sm:w-36"
            />
          </div>

          <div className="relative">
            <Textarea
              placeholder="공연에 대한 기대감, 응원 메시지, 관람 후기를 남겨주세요."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="min-h-[100px] resize-none border-gray-200 bg-gray-50 p-4 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-900"
            />
            <Quote className="absolute bottom-4 right-4 h-6 w-6 text-gray-300 opacity-50" />
          </div>

          {previews.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {previews.map((preview, index) => (
                <div key={preview.url} className="group relative shrink-0">
                  <div className="relative h-24 w-24 overflow-hidden rounded-xl border-2 border-purple-100 bg-black shadow-sm dark:border-purple-900">
                    {preview.type === "video" ? (
                      <>
                        <video src={preview.url} className="h-full w-full object-cover opacity-80" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <PlayCircle className="h-8 w-8 text-white/80" />
                        </div>
                      </>
                    ) : (
                      <Image src={preview.url} alt={`미리보기 ${index + 1}`} fill className="object-cover" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute -right-2 -top-2 z-10 rounded-full bg-red-500 p-1 text-white shadow-md transition-colors hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="relative">
              <input type="file" accept="image/*,video/*" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className={`gap-2 ${selectedFiles.length > 0 ? "bg-purple-50 text-purple-600" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}
              >
                {selectedFiles.length > 0 ? <Plus className="h-4 w-4" /> : <Film className="h-4 w-4" />}
                {selectedFiles.length > 0 ? "파일 더 추가하기" : "사진/영상 추가"}
              </Button>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              등록하기
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-purple-500" />
            <p className="text-sm text-gray-500">불러오는 중...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-16 text-center dark:border-gray-700 dark:bg-gray-800/50">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-800">
              <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
            </div>
            <h3 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">첫 번째 리뷰를 남겨주세요.</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {reviews.map((review) => {
              const mediaList = parseMediaUrls(review.image_url)

              return (
                <div
                  key={review.id}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 text-lg shadow-inner dark:from-purple-900 dark:to-indigo-900">
                        {review.user_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white">{review.user_name}</span>
                          <div className="text-[10px] text-yellow-400">{"★".repeat(review.rating)}</div>
                        </div>
                        <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString("ko-KR")}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(review.id)}
                      className="rounded-full p-1.5 text-gray-300 transition-all hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="pl-[52px]">
                    <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">{review.content}</p>

                    {mediaList.length > 0 && (
                      <div className={`mt-2 grid gap-2 ${mediaList.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
                        {mediaList.map((url, idx) => {
                          const isVideo = isVideoUrl(url)
                          return (
                            <div
                              key={url}
                              className="group relative aspect-square cursor-zoom-in"
                              onClick={() => setZoomedMedia({ url, type: isVideo ? "video" : "image" })}
                            >
                              <div className="relative h-full w-full overflow-hidden rounded-xl border border-gray-100 bg-gray-100 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                                {isVideo ? (
                                  <>
                                    <video src={url} className="h-full w-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/40">
                                      <PlayCircle className="h-10 w-10 text-white/90 drop-shadow-lg transition-transform group-hover:scale-110" />
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <Image src={url} alt={`리뷰 미디어 ${idx + 1}`} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-colors group-hover:bg-black/10 group-hover:opacity-100">
                                      <Maximize2 className="h-5 w-5 text-white drop-shadow-md" />
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {zoomedMedia && (
        <div
          className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/95 backdrop-blur-sm duration-200 fade-in"
          onClick={() => setZoomedMedia(null)}
        >
          <button
            type="button"
            onClick={() => setZoomedMedia(null)}
            className="absolute right-4 top-4 z-50 rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-8 w-8" />
          </button>

          <div className="relative mx-4 flex h-[85vh] w-full max-w-5xl items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {zoomedMedia.type === "video" ? (
              <video src={zoomedMedia.url} controls autoPlay className="max-h-full max-w-full rounded-lg shadow-2xl" />
            ) : (
              <div className="relative h-full w-full">
                <Image src={zoomedMedia.url} alt="확대된 리뷰 미디어" fill className="object-contain" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
