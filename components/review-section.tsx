"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Star, Image as ImageIcon, Trash2, Loader2, Send } from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"

// Supabase 클라이언트 직접 생성 (클라이언트 사이드 업로드용)
// .env.local 파일에 있는 키를 사용합니다.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // 폼 상태
  const [form, setForm] = useState({
    name: "",
    password: "",
    content: "",
    rating: 5,
  })

  // 후기 불러오기
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

  // 이미지 파일 선택 핸들러
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  // 후기 작성 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.password || !form.content) {
      toast({ title: "입력 오류", description: "이름, 비밀번호, 내용을 모두 입력해주세요.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    let imageUrl = null

    try {
      // 1. 이미지 업로드 (이미지가 있다면)
      if (selectedImage) {
        const fileExt = selectedImage.name.split(".").pop()
        const fileName = `${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from("review-images")
          .upload(fileName, selectedImage)

        if (uploadError) throw uploadError

        // 이미지 공개 주소 가져오기
        const { data: publicUrlData } = supabase.storage
          .from("review-images")
          .getPublicUrl(fileName)
        
        imageUrl = publicUrlData.publicUrl
      }

      // 2. DB 저장
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
      
      // 초기화 및 목록 갱신
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

  // 후기 삭제
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
      {/* 작성 폼 */}
      <Card className="border-gray-200 shadow-sm bg-gray-50/50">
        <CardContent className="p-4 space-y-4">
          <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
            <Star className="w-4 h-4 text-purple-500 fill-purple-500" />
            후기 작성하기
          </h3>
          
          <div className="flex gap-2">
            <Input 
              placeholder="이름" 
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              className="flex-1 bg-white" 
            />
            <Input 
              type="password" 
              placeholder="비번(4자리)" 
              maxLength={4}
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
              className="w-24 bg-white" 
            />
             <select 
              className="bg-white border border-gray-200 rounded-md px-2 text-sm"
              value={form.rating}
              onChange={(e) => setForm({...form, rating: Number(e.target.value)})}
            >
              <option value="5">⭐⭐⭐⭐⭐</option>
              <option value="4">⭐⭐⭐⭐</option>
              <option value="3">⭐⭐⭐</option>
            </select>
          </div>

          <Textarea 
            placeholder="공연 어떠셨나요? 솔직한 후기를 남겨주세요!" 
            value={form.content}
            onChange={(e) => setForm({...form, content: e.target.value})}
            className="bg-white resize-none h-24"
          />

          {/* 이미지 미리보기 */}
          {previewUrl && (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
              <Image src={previewUrl} alt="Preview" fill className="object-cover" />
              <button 
                onClick={() => { setSelectedImage(null); setPreviewUrl(null); }}
                className="absolute top-0 right-0 bg-black/50 text-white p-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex justify-between items-center">
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
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-600 gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                사진 추가
              </Button>
            </div>
            
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              등록
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 후기 목록 */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-10 text-gray-500">불러오는 중...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            아직 작성된 후기가 없습니다. 첫 번째 후기를 남겨보세요!
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{review.user_name}</span>
                  <span className="text-xs text-yellow-500">{"⭐".repeat(review.rating)}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button 
                  onClick={() => handleDelete(review.id, review.password || "")} // 실제 비밀번호 전달
                  className="text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-gray-700 text-sm whitespace-pre-wrap mb-3">{review.content}</p>
              
              {review.image_url && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                  <Image src={review.image_url} alt="Review Image" fill className="object-cover" />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
