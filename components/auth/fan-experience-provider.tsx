"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { koreaVisitDate, type FanExperience } from "@/lib/fan-experience"

type FanState = { userId: string; experience: FanExperience | null; unavailable: boolean }
const FanContext = createContext<{ experience: FanExperience | null; unavailable: boolean }>({ experience: null, unavailable: false })

export function FanExperienceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id
  const pathname = usePathname()
  const [state, setState] = useState<FanState | null>(null)

  useEffect(() => {
    if (!userId) { setState(null); return }
    const controller = new AbortController()
    let busy = false
    let recordedDay = ""
    const refresh = async (force = false) => {
      if (document.visibilityState !== "visible" || busy || (!force && recordedDay === koreaVisitDate())) return
      busy = true
      try {
        const response = await fetch("/api/profile/fan-experience", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", cache: "no-store", signal: controller.signal })
        if (!response.ok) throw new Error("Fan activity unavailable")
        const { experience } = await response.json() as { experience: FanExperience }
        if (!controller.signal.aborted) {
          recordedDay = experience.visitDate
          setState({ userId, experience, unavailable: false })
        }
      } catch {
        if (!controller.signal.aborted) setState({ userId, experience: null, unavailable: true })
      } finally { busy = false }
    }
    const visible = () => { void refresh(true) }
    const changed = () => { void refresh(true) }
    void refresh(true)
    document.addEventListener("visibilitychange", visible)
    window.addEventListener("arte-fan-activity-changed", changed)
    const timer = window.setInterval(() => { void refresh() }, 60_000)
    return () => {
      controller.abort()
      document.removeEventListener("visibilitychange", visible)
      window.removeEventListener("arte-fan-activity-changed", changed)
      window.clearInterval(timer)
    }
  }, [userId, pathname])

  const current = state?.userId === userId ? state : null
  return <FanContext.Provider value={{ experience: current?.experience ?? null, unavailable: current?.unavailable ?? false }}>{children}</FanContext.Provider>
}
export function useFanExperience() { return useContext(FanContext) }
