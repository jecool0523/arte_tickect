import { z } from "zod"

const text = (max: number) => z.string().trim().min(1).max(max)
export const performanceDetailsSchema = z.object({
  title: text(100), subtitle: z.string().trim().max(100), genre: text(100),
  special: z.string().trim().max(100), runtime: text(100), ageRating: text(100),
  venue: text(200), date: text(100), time: text(100), synopsis: text(8000),
  posterImage: text(2000).refine((value) => /^\/(?!\/)/.test(value) || (() => {
    try { return new URL(value).protocol === "https:" } catch { return false }
  })(), "포스터는 사이트 내 경로나 HTTPS 주소를 사용해주세요."),
}).strict()
export type PerformanceDetails = z.infer<typeof performanceDetailsSchema>
export const performanceSaveSchema = z.object({
  musicalId: z.enum(["toctoc", "rent", "dead-poets-society"]),
  details: performanceDetailsSchema,
  startTime: z.string().datetime({ offset: true }),
  endTime: z.string().datetime({ offset: true }),
}).strict().refine((v) => new Date(v.startTime) < new Date(v.endTime), "예매 종료는 시작 이후여야 합니다.")

export function toKoreaDateTimeInput(iso: string) {
  if (!iso || Number.isNaN(Date.parse(iso))) return ""
  return new Date(Date.parse(iso) + 9 * 3600000).toISOString().slice(0, 19)
}
export function fromKoreaDateTimeInput(value: string) {
  return new Date(`${value.length === 16 ? value + ":00" : value}+09:00`).toISOString()
}
