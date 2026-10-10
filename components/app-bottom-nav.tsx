"use client"

import Link, { useLinkStatus } from "next/link"
import { Home, Loader2, Music2, Sparkles, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

type AppSection = "home" | "performances" | "club" | "profile"

const navItems = [
  { href: "/", label: "홈", section: "home" as const, icon: Home },
  { href: "/performances", label: "공연", section: "performances" as const, icon: Music2 },
  { href: "/club", label: "아르떼", section: "club" as const, icon: Sparkles },
  { href: "/profile", label: "프로필", section: "profile" as const, icon: UserRound },
]

// Link owns the transition, including cancellation when another menu is clicked.
function NavItemContent({ item, isActive }: { item: (typeof navItems)[number]; isActive: boolean }) {
  const { pending } = useLinkStatus()
  const Icon = pending ? Loader2 : item.icon

  return (
    <>
      <Icon aria-hidden="true" className={cn("h-5 w-5 transition-transform group-active:scale-90", isActive && "stroke-[2.4]", pending && "animate-spin text-purple-700 motion-reduce:animate-none")} />
      <span className={cn("text-xs font-medium", isActive && "font-bold", pending && "text-purple-700")}>
        {item.label}
      </span>
      {pending && <span role="status" className="absolute -top-1 rounded bg-white px-1 text-[10px] text-purple-700">이동 중</span>}
      {isActive && <span aria-hidden="true" className="absolute -bottom-2 h-0.5 w-5 rounded-full bg-purple-600" />}
    </>
  )
}

export default function AppBottomNav({ active }: { active: AppSection }) {
  return (
    <nav aria-label="주요 메뉴" className="mx-auto grid w-full max-w-2xl grid-cols-4 px-2 pb-2 pt-2">
      {navItems.map((item) => {
        const isActive = item.section === active

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={item.section === "profile" ? false : undefined}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 text-gray-400 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
              isActive && "text-purple-700",
            )}
          >
            <NavItemContent item={item} isActive={isActive} />
          </Link>
        )
      })}
    </nav>
  )
}
