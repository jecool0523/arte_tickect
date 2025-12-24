"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Star, Image as ImageIcon, Trash2, Loader2, Send, X, Maximize2, Quote, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"

interface Review {
  id: number
  user_name: string
  content: string
  image_url: string | null
  rating: number
  created_at: string
}

export default function ReviewSection({ musicalId }: { musicalId: string }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 👇 [수정] 여러 장의 이미지를 다루기 위해 배열로 변경
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const [form, setForm] = useState({
    name: "",
    password: "",
    content: "",
    rating: 5,
  })

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("musical_id", musicalId)
      .order("created_at", { ascending: false })

    if (!error && data) setReviews(data)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchReviews()
  }, [musicalId])

  // 👇 [수정] 이미지 파일 선택 핸들러 (다중 선택 지원)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const newFiles = Array.from(files)
      const newPreviews = newFiles.map(file => URL.createObjectURL(file))
      
      setSelectedImages(prev => [...prev, ...newFiles])
      setPreviewUrls(prev => [...prev, ...newPreviews])
    }
    // 입력값 초기화 (같은 파일 다시 선택 가능하게)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // 👇 [추가] 선택한 이미지 개별 삭제
  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  // 👇 [추가] 저장된 이미지 URL을 배열로 변환하는 헬퍼 함수
  const parseImageUrls = (urlJson: string | null): string[] => {
    if (!urlJson) return []
    try {
      // JSON 배열 형태(["url1", "url2"])인 경우 파싱
      const parsed = JSON.parse(urlJson)
      return Array.isArray(parsed) ? parsed : [urlJson]
    } catch {
      // 옛날 데이터(단일 URL 문자열)인 경우 배열로 감싸서 반환
      return [urlJson]
    }
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
      // 1. 이미지 업로드 (병렬 처리)
      if (selectedImages.length > 0) {
        const uploadPromises = selectedImages.map(async (file) => {
          const fileExt = file.name.split(".").pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
          
          const { error: uploadError } = await supabase.storage
            .from("review-images")
            .upload(fileName, file)

          if (uploadError) throw uploadError

          const { data: publicUrlData } = supabase.storage
            .from("review-images")
            .getPublicUrl(fileName)
            
          return publicUrlData.publicUrl
        })

        const urls = await Promise.all(uploadPromises)
        uploadedUrls.push(...urls)
      }

      // 2. DB 저장 (이미지 URL들을 JSON 문자열로 변환하여 저장)
      // 예: '["https://...", "https://..."]'
      const imageUrlValue = uploadedUrls.length > 0 
        ? JSON.stringify(uploadedUrls) 
        : null

      const { error: insertError } = await supabase.from("reviews").insert({
        musical_id: musicalId,
        user_name: form.name,
        password: form.password,
        content: form.content,
        rating: form.rating,
        image_url: imageUrlValue, // 단일 컬럼에 JSON 문자열로 저장
      })

      if (insertError) throw insertError

      toast({ title: "작성 완료", description: "소중한 후기가 등록되었습니다!" })
      
      setForm({ name: "", password: "", content: "", rating: 5 })
      setSelectedImages([])
      setPreviewUrls([])
      fetchReviews()

    } catch (error) {
      console.error(error)
      toast({ title: "오류 발생", description: "후기 등록 중 문제가 발생했습니다.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number, correctPassword: string) => {
    const inputPassword = prompt("등록할 때 입력한 비밀번호 4자리를 입력하세요.")
    if (inputPassword !== correctPassword) {
      alert("비밀번호가 일치하지 않습니다.")
      return
    }

    const { error } = await supabase.from("reviews").delete().eq("id", id)
    if (!error) {
      toast({ title: "삭제 완료", description: "후기가 삭제되었습니다." })
      fetchReviews()
    }
  }

  return (
    <div className="space-y-8">
      {/* 1. 작성 폼 */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 overflow-hidden ring-1 ring-gray-100 dark:ring-gray-700">
        <div className="h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500"></div>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
              <span className="text-2xl">✍️</span>
              기대평 남기기
            </h3>
            <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full border border-yellow-100 dark:border-yellow-900">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setForm({ ...form, rating: star })}
                  className={`transition-transform hover:scale-125 ${star <= form.rating ? "text-yellow-500" : "text-gray-300"}`}
                >
                  <Star className="w-5 h-5 fill-current" />
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex gap-3 flex-col sm:flex-row">
            <Input 
              placeholder="이름 (닉네임)" 
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              className="flex-1 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:ring-purple-500" 
            />
            <Input 
              type="password" 
              placeholder="비밀번호 4자리" 
              maxLength={4}
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
              className="sm:w-32 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:ring-purple-500" 
            />
          </div>

          <div className="relative">
            <Textarea 
              placeholder="공연에 대한 기대감이나 응원의 메시지를 남겨주세요! (따뜻한 말 한마디가 큰 힘이 됩니다)" 
              value={form.content}
              onChange={(e) => setForm({...form, content: e.target.value})}
              className="min-h-[100px] bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:ring-purple-500 resize-none p-4"
            />
            <Quote className="absolute right-4 bottom-4 text-gray-300 w-6 h-6 opacity-50" />
          </div>

          {/* 이미지 미리보기 목록 */}
          {previewUrls.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative flex-shrink-0 group">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-purple-100 dark:border-purple-900 shadow-sm">
                    <Image src={url} alt={`Preview ${index}`} fill className="object-cover" />
                  </div>
                  <button 
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors z-10"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <div className="relative">
              {/* 👇 multiple 속성 추가됨 */}
              <input 
                type="file" 
                accept="image/*"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageChange}
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className={`gap-2 ${selectedImages.length > 0 ? "text-purple-600 bg-purple-50" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}
              >
                {selectedImages.length > 0 ? <Plus className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                {selectedImages.length > 0 ? "사진 더 추가하기" : "사진 추가"}
              </Button>
            </div>
            
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              등록하기
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. 후기 목록 */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500 mb-2" />
            <p className="text-gray-500 text-sm">소중한 후기를 불러오는 중...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">첫 번째 리뷰어가 되어주세요!</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">여러분의 기대평이 배우들에게 큰 힘이 됩니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {reviews.map((review) => {
              // 이미지 URL 파싱 (단일 or 다중)
              const images = parseImageUrls(review.image_url)

              return (
                <div 
                  key={review.id} 
                  className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-300"
                >
                  {/* 헤더 */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900 dark:to-indigo-900 flex items-center justify-center text-lg shadow-inner">
                        {review.user_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white">{review.user_name}</span>
                          <div className="flex text-yellow-400 text-[10px]">
                            {"⭐".repeat(review.rating)}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(review.id, review.password || "")}
                      className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-all"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* 내용 */}
                  <div className="pl-[52px]">
                    <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed mb-4">
                      {review.content}
                    </p>
                    
                    {/* 👇 [수정] 다중 이미지 렌더링 (그리드 형태) */}
                    {images.length > 0 && (
                      <div className={`grid gap-2 mt-2 ${
                        images.length === 1 ? "grid-cols-1" : 
                        images.length === 2 ? "grid-cols-2" : 
                        "grid-cols-2 sm:grid-cols-3"
                      }`}>
                        {images.map((imgUrl, idx) => (
                          <div 
                            key={idx} 
                            className="relative group cursor-zoom-in aspect-square" 
                            onClick={() => setZoomedImage(imgUrl)}
                          >
                            <div className="relative w-full h-full rounded-xl overflow-hidden shadow-sm bg-gray-100 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                              <Image 
                                src={imgUrl} 
                                alt={`Review Image ${idx + 1}`} 
                                fill 
                                className="object-cover transition-transform duration-500 group-hover:scale-110" 
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <Maximize2 className="w-5 h-5 text-white drop-shadow-md" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 이미지 전체화면 모달 */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <button 
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
          
          <div className="relative w-full max-w-5xl h-[85vh] mx-4" onClick={(e) => e.stopPropagation()}>
            <Image 
              src={zoomedImage} 
              alt="Full Review Image" 
              fill 
              className="object-contain" 
            />
          </div>
        </div>
      )}
    </div>
  )
}
