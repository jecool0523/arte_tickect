import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { createServerClient } from "@/lib/server/supabase-admin"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { isKnownMusicalId } from "@/lib/musical-config"

const MAX_BYTES = 10 * 1024 * 1024
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "video/mp4": "mp4", "video/webm": "webm", "video/ogg": "ogv",
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const musicalId = String(form.get("musicalId") || "")
    const file = form.get("file")
    if (!isKnownMusicalId(musicalId) || !(file instanceof File)) return NextResponse.json({ error: "Invalid upload." }, { status: 400 })
    const extension = MIME_EXTENSIONS[file.type]
    if (!extension || file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ error: "Unsupported or oversized file." }, { status: 415 })
    const supabase = createServerClient()
    const rate = await enforceRateLimit(supabase, request, { bucket: "review-upload", limit: 12, windowSeconds: 600 }, musicalId)
    if (rate.unavailable) return NextResponse.json({ error: "Rate limiting is unavailable." }, { status: 503 })
    if (!rate.allowed) return NextResponse.json({ error: "Too many uploads." }, { status: 429 })
    const path = `${musicalId}/${randomUUID()}.${extension}`
    const { error } = await supabase.storage.from("review-images").upload(path, file, { contentType: file.type, upsert: false })
    if (error) return NextResponse.json({ error: "Upload failed." }, { status: 503 })
    const { data } = supabase.storage.from("review-images").getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl })
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 })
  }
}
