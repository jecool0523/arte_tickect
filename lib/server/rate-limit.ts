import "server-only"

import { createHash, createHmac } from "node:crypto"
import type { createServerClient } from "@/lib/server/supabase-admin"

type ServerClient = ReturnType<typeof createServerClient>

export type RateLimitRule = {
  bucket: string
  limit: number
  windowSeconds: number
}

function getClientAddress(request: Request) {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}

export function createRateLimitSubject(request: Request, discriminator = "") {
  const secret = process.env.RATE_LIMIT_SECRET || process.env.TICKET_SHARE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret || secret.length < 32) throw new Error("RATE_LIMIT_SECRET must be configured with at least 32 characters.")
  const address = getClientAddress(request)
  return createHmac("sha256", secret).update(`${address}:${discriminator}`).digest("hex")
}

export async function enforceRateLimit(
  supabase: ServerClient,
  request: Request,
  rule: RateLimitRule,
  discriminator = "",
) {
  const subjectHash = createRateLimitSubject(request, createHash("sha256").update(discriminator).digest("hex"))
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_bucket: rule.bucket,
    p_subject_hash: subjectHash,
    p_limit: rule.limit,
    p_window_seconds: rule.windowSeconds,
  })

  if (error) {
    console.error("Rate limit check failed", { bucket: rule.bucket, code: error.code })
    return { allowed: false, unavailable: true }
  }

  return { allowed: data === true, unavailable: false }
}
