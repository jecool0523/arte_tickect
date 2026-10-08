import { z } from "zod"

export function defaultUsername(email?: string | null) {
  return (email?.split("@")[0] ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 30)
}

export const profileInputSchema = z.object({
  username: z.string().trim().regex(/^[A-Za-z0-9]{1,30}$/, "아이디는 영문·숫자 1~30자로 입력해주세요."),
  displayName: z.string().trim().min(1, "이름을 입력해주세요.").max(100),
  studentId: z.string().trim().regex(/^[A-Za-z0-9_-]{1,20}$/, "학번을 확인해주세요."),
  contactNumber: z.string().trim().max(30).transform((value) => value.replace(/[\s()-]/g, ""))
    .pipe(z.string().regex(/^\+?[0-9]{9,15}$/, "연락처는 숫자 9~15자리로 입력해주세요.")),
}).strict()

export function isProfileComplete(profile: {
  username?: string | null; display_name?: string | null; student_id?: string | null;
  contact_number?: string | null; profile_completed_at?: string | null;
} | null) {
  return !!(profile?.profile_completed_at && profile.username && profile.display_name && profile.student_id && profile.contact_number)
}

export function safeProfileNext(value?: string | null) {
  try {
    const base = "https://local.invalid"
    const target = new URL(value || "/profile", base)
    if (target.origin !== base || target.pathname.startsWith("/profile/setup") || target.pathname.startsWith("/profile/membership") || target.pathname.startsWith("/auth/")) return "/profile"
    return `${target.pathname}${target.search}${target.hash}`
  } catch { return "/profile" }
}
