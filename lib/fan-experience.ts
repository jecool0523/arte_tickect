export const FAN_POINTS = { booking: 100, review: 50, visit: 10 } as const
export const FAN_LEVELS = [
  { name: "새싹 팬", minXp: 0 },
  { name: "단골 팬", minXp: 200 },
  { name: "열성 팬", minXp: 500 },
  { name: "아르떼 서포터", minXp: 1000 },
] as const

export type FanActivity = { bookingCount: number; reviewCount: number; visitCount: number; visitedToday: boolean; visitDate: string }
export type FanExperience = FanActivity & { totalXp: number; level: string; nextLevel: string | null; nextLevelXp: number | null; remainingXp: number; progress: number }

export function calculateFanExperience(activity: FanActivity): FanExperience {
  const totalXp = activity.bookingCount * FAN_POINTS.booking + activity.reviewCount * FAN_POINTS.review + activity.visitCount * FAN_POINTS.visit
  let index = 0
  FAN_LEVELS.forEach((level, i) => { if (totalXp >= level.minXp) index = i })
  const current = FAN_LEVELS[index]
  const next = FAN_LEVELS[index + 1]
  return { ...activity, totalXp, level: current.name, nextLevel: next?.name ?? null, nextLevelXp: next?.minXp ?? null,
    remainingXp: next ? next.minXp - totalXp : 0,
    progress: next ? Math.min(100, Math.max(0, (totalXp - current.minXp) / (next.minXp - current.minXp) * 100)) : 100 }
}

// A browser hint only. The database, not the browser clock, assigns the rewarded day.
export function koreaVisitDate() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
}
