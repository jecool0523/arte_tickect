import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import AppBottomNav from "@/components/app-bottom-nav"
import { Button } from "@/components/ui/button"

// Match the existing ARTE/performance page frame, without changing global tokens.
export default function AccountPageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gray-50 text-gray-900">
      <header className="z-20 shrink-0 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center p-4">
          <Button asChild variant="ghost" size="icon" className="shrink-0 rounded-full hover:bg-gray-100">
            <Link href="/" aria-label="홈으로 돌아가기"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="min-w-0 flex-1 pr-10 text-center text-lg font-bold">{title}</h1>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto p-4 pb-6">
        <div className="mx-auto max-w-2xl space-y-6">{children}</div>
      </main>
      <footer className="z-30 shrink-0 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <AppBottomNav active="profile" />
      </footer>
    </div>
  )
}
