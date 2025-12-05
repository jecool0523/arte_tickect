"use client" // 에러 컴포넌트는 반드시 Client Component여야 합니다.

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RotateCcw } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 에러 발생 시 콘솔에도 로그를 남깁니다 (선택 사항)
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md border-red-200 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl text-gray-900">오류가 발생했습니다</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-4 text-sm">
            시스템 처리 중 문제가 발생했습니다.<br />
            잠시 후 다시 시도해 주세요.
          </p>
          
          {/* 개발 모드이거나, 구체적인 에러 내용을 보여주고 싶다면 아래 코드 주석 해제 */}
          <div className="bg-gray-100 p-3 rounded-md text-left text-xs text-red-500 font-mono overflow-auto max-h-32 mb-4">
            {error.message || "알 수 없는 오류"}
          </div>
          
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button 
            onClick={() => window.location.href = '/'} 
            variant="outline" 
            className="flex-1"
          >
            홈으로 이동
          </Button>
          <Button 
            onClick={() => reset()} 
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            다시 시도
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
