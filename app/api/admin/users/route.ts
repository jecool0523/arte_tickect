import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/server/supabase-admin"
import { enforceRateLimit } from "@/lib/server/rate-limit"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const revalidate = 0

const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(100).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(searchParams))

    const supabase = createServerClient()
    const rate = await enforceRateLimit(supabase, request, {
      bucket: "admin-users-list",
      limit: 30,
      windowSeconds: 60,
    })
    if (rate.unavailable) return NextResponse.json({ error: "Rate limiting is unavailable." }, { status: 503, headers })
    if (!rate.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers })

    const { data, error } = await supabase.rpc("admin_get_all_users", {
      p_limit: query.limit,
      p_offset: query.offset,
      p_search: query.search ?? null,
    })

    if (error) {
      console.error("Admin get users RPC failed", { code: error.code })
      return NextResponse.json({ error: "Failed to fetch users." }, { status: 503, headers })
    }

    const result = data as { success: boolean; users: unknown[]; total: number; limit: number; offset: number; error?: string; code?: string }
    if (!result.success) {
      const status = result.code === "FORBIDDEN" ? 403 : 400
      return NextResponse.json({ error: result.error, code: result.code }, { status, headers })
    }

    return NextResponse.json({
      success: true,
      users: result.users,
      pagination: { total: result.total, limit: result.limit, offset: result.offset },
    }, { headers })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid query parameters." }, { status: 400, headers })
    console.error("Admin users list failed")
    return NextResponse.json({ error: "Failed to fetch users." }, { status: 500, headers })
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405, headers })
}