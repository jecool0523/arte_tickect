import AppBottomNav from "@/components/app-bottom-nav"

export default function PageLoading({ title, active }: { title: string; active: "home" | "performances" | "club" }) {
  return (
    <div className="flex h-dvh flex-col bg-gray-50 text-gray-900">
      <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-5 text-center">
        <h1 className="text-lg font-bold">{title}</h1>
      </header>
      <main className="mx-auto min-h-0 w-full max-w-2xl flex-1 overflow-y-auto p-4" aria-busy="true">
        <p role="status" className="mb-5 text-sm text-gray-600">{title} 페이지를 불러오는 중…</p>
        <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
          {[0, 1, 2].map((index) => <div key={index} className="h-32 rounded-xl border border-gray-200 bg-gray-100" />)}
        </div>
      </main>
      <footer className="shrink-0 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <AppBottomNav active={active} />
      </footer>
    </div>
  )
}
