import "server-only"
import { revalidateTag, unstable_cache } from "next/cache"
import { getAllMusicals } from "@/data/musicals"
import { createServerClient } from "@/lib/server/supabase-admin"
import { performanceDetailsSchema } from "@/lib/performance-settings"

const settingsTag = "arte-public-performance-settings"

async function readPerformanceSettings() {
  // Only public presentation data: never cache accounts, permissions or inventory.
  const { data, error } = await createServerClient().from("performance_settings").select("musical_id, details")
  if (error) throw new Error("Performance settings unavailable")
  return data
}

const getCachedPerformanceSettings = unstable_cache(
  readPerformanceSettings,
  [settingsTag, process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""],
  { revalidate: 60, tags: [settingsTag] },
)

export function invalidatePerformanceSettings() {
  revalidateTag(settingsTag)
}

export async function getLiveMusicals(strict = false) {
  const defaults = getAllMusicals()
  try {
    // Admin reads bypass the public cache. Failures fall back outside the cache.
    const data = await (strict ? readPerformanceSettings() : getCachedPerformanceSettings())
    return defaults.map((musical) => {
      const saved = data?.find((row) => row.musical_id === musical.id)
      const parsed = performanceDetailsSchema.safeParse(saved?.details)
      return parsed.success ? { ...musical, ...parsed.data } : musical
    })
  } catch { console.error("Performance settings unavailable"); if (strict) throw new Error("Performance settings unavailable"); return defaults }
}
export async function getLiveMusical(id: string) {
  return (await getLiveMusicals()).find((musical) => musical.id === id) ?? null
}
