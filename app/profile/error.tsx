"use client"

import AccountPageShell from "@/components/auth/account-page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ProfileError({ reset }: { reset: () => void }) {
  return (
    <AccountPageShell title="프로필">
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardContent className="space-y-4 p-6 text-center">
          <p role="alert" className="text-gray-700">프로필을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
          <Button onClick={reset} className="rounded-lg bg-purple-600 text-white hover:bg-purple-700">다시 시도</Button>
        </CardContent>
      </Card>
    </AccountPageShell>
  )
}
