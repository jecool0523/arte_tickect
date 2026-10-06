import AccountPageShell from "@/components/auth/account-page-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function ProfileLoading() {
  return (
    <AccountPageShell title="프로필">
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardContent className="flex items-center justify-center gap-2 p-8 text-gray-600" role="status">
          <Loader2 className="h-5 w-5 animate-spin text-purple-600" aria-hidden="true" />프로필을 불러오는 중…
        </CardContent>
      </Card>
    </AccountPageShell>
  )
}
