"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Theater, ArrowRight } from "lucide-react"

interface SeatSelectionButtonProps {
  onNavigateToSeatSelection: () => void
  selectedSeatsCount: number
}

export default function SeatSelectionButton({
  onNavigateToSeatSelection,
  selectedSeatsCount,
}: SeatSelectionButtonProps) {
  return (
    <Card
      className="bg-white border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={onNavigateToSeatSelection}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Theater className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">좌석 선택</h3>
              <p className="text-sm text-gray-600">
                {selectedSeatsCount > 0 ? `${selectedSeatsCount}개 좌석 선택됨` : "원하는 좌석을 선택해주세요"}
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
        </div>
      </CardContent>
    </Card>
  )
}
