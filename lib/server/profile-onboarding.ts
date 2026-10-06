import "server-only"
import { createServerClient } from "@/lib/server/supabase-admin"

export async function syncLegacyBookings(userId: string) {
  const { data, error } = await createServerClient().rpc("sync_legacy_bookings", { p_user_id: userId })
  if (error || !data?.success) {
    console.error("Legacy booking sync unavailable", { code: error?.code ?? data?.code })
    return { success: false, linked_count: 0 }
  }
  return data
}
