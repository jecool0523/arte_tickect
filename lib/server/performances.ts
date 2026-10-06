import "server-only"
import { getAllMusicals } from "@/data/musicals"
import { createServerClient } from "@/lib/server/supabase-admin"
import { performanceDetailsSchema } from "@/lib/performance-settings"

export async function getLiveMusicals(strict = false) {
  const defaults = getAllMusicals()
  try {
    const { data, error } = await createServerClient().from("performance_settings").select("musical_id, details")
    if (error) { console.error("Performance settings unavailable", { code: error.code }); if (strict) throw new Error("Performance settings unavailable"); return defaults }
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
