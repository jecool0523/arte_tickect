"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, Ticket } from "lucide-react"
import BookingTicket from "@/components/booking-ticket"
import { useBookingDrafts } from "@/components/booking-draft-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { MusicalInfo } from "@/types/musical"

export default function BookingCompleteRoutePage({ musical }: { musical: MusicalInfo }) {
  const router = useRouter()
  const { hydrated, getCompletion, clearCompletion, updateDraft } = useBookingDrafts()
  const completion = getCompletion(musical.id)

  useEffect(() => {
    if (hydrated && !completion) router.replace(`/performances/${musical.id}/booking`)
  }, [completion, hydrated, musical.id, router])

  if (!hydrated || !completion) {
    return <div className="flex min-h-[100dvh] items-center justify-center text-sm text-gray-500">예매 완료 정보를 확인하고 있습니다.</div>
  }

  return (
    <div className="min-h-[100dvh] bg-white p-4 sm:py-8">
      <Card className="mx-auto w-full max-w-lg border border-gray-200 bg-white shadow-lg">
        <CardContent className="pt-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <Ticket className="absolute -right-1 -top-1 h-6 w-6 text-gray-900" />
            </div>
          </div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900">예매가 완료되었습니다.</h1>
          <div className="mb-6">
            <BookingTicket variant="success" ticket={completion.ticket} shareToken={completion.shareToken} />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                clearCompletion(musical.id)
                router.push("/")
              }}
            >
              처음으로
            </Button>
            <Button
              className="flex-1 bg-purple-600 text-white"
              onClick={() => {
                updateDraft(musical.id, {
                  name: completion.ticket.name,
                  studentId: completion.ticket.studentId,
                  accessGranted: true,
                })
                clearCompletion(musical.id)
                router.push(`/performances/${musical.id}/booking`)
              }}
            >
              추가 예매
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
