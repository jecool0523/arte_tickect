"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Star, Image as ImageIcon, Trash2, Loader2, Send, X, Maximize2, Quote } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

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
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  
  // 👇 [추가] 이미지 확대 보기를 위한 상태
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.password || !form.content) {
      toast({ title: "입력 오류", description: "이름, 비밀번호, 내용을 모두 입력해주세요.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    let imageUrl = null

    try {
      if (selectedImage) {
        const fileExt = selectedImage.name.split(".").pop()
        const fileName = `${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from("review-images")
          .upload(fileName, selectedImage)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from("review-images")
          .getPublicUrl(fileName)
        
        imageUrl = publicUrlData.publicUrl
      }

      const { error: insertError } = await supabase.from("reviews").insert({
        musical_id: musicalId,
        user_name: form.name,
        password: form.password,
        content: form.content,
        rating: form.rating,
        image_url: imageUrl,
      })

      if (insertError) throw insertError

      toast({ title: "작성 완료", description: "소중한 후기가 등록되었습니다!" })
      
      setForm({ name: "", password: "", content: "", rating: 5 })
      setSelectedImage(null)
      setPreviewUrl(null)
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
      {/* 1. 작성 폼 (디자인 다듬음) */}
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

          {/* 이미지 미리보기 */}
          {previewUrl && (
            <div className="relative inline-block group">
              <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-purple-100 dark:border-purple-900 shadow-sm">
                <Image src={previewUrl} alt="Preview" fill className="object-cover" />
              </div>
              <button 
                onClick={() => { setSelectedImage(null); setPreviewUrl(null); }}
                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <div className="relative">
              <input 
                type="file" 
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageChange}
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className={`gap-2 ${selectedImage ? "text-purple-600 bg-purple-50" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}
              >
                <ImageIcon className="w-4 h-4" />
                {selectedImage ? "사진 변경" : "사진 추가"}
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

      {/* 2. 후기 목록 (세련된 카드 디자인) */}
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
            {reviews.map((review) => (
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
                  
                  {/* 👇 [개선] 이미지 영역 (클릭 시 확대) */}
                  {review.image_url && (
                    <div className="relative group cursor-zoom-in mt-2 mb-1" onClick={() => setZoomedImage(review.image_url)}>
                      <div className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden shadow-sm bg-gray-100 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                        <Image 
                          src={review.image_url} 
                          alt="Review Image" 
                          fill 
                          className="object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                        {/* 확대 아이콘 오버레이 */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="bg-white/90 p-2 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                            <Maximize2 className="w-5 h-5 text-gray-800" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 👇 [추가] 이미지 전체화면 모달 */}
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
          
          <div className="relative w-full max-w-4xl h-[80vh] mx-4" onClick={(e) => e.stopPropagation()}>
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
