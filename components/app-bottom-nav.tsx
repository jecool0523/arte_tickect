import Link from "next/link"
import { Home, Music, Ticket, User } from "lucide-react"
import { cn } from "@/lib/utils"

type AppSection = "home" | "performances" | "booking" | "club"

const navItems = [
  { href: "/", label: "홈", section: "home" as const, icon: Home },
  { href: "/performances", label: "공연", section: "performances" as const, icon: Music },
  { href: "/booking/verify", label: "예매", section: "booking" as const, icon: Ticket },
  { href: "/club", label: "ARTE", section: "club" as const, icon: User },
]

export default function AppBottomNav({ active }: { active: AppSection }) {
  return (
    <nav aria-label="주요 메뉴" className="flex items-center justify-around px-4 pb-3 pt-2">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = item.section === active

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-w-14 flex-col items-center gap-1 rounded-md px-3 py-1.5 text-gray-500 transition-colors hover:text-gray-900",
              isActive && "text-purple-600",
            )}
          >
            <Icon className="h-5 w-5" />
            <span className={cn("text-xs", item.section === "club" && "font-serif font-semibold", isActive && "font-bold")}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
