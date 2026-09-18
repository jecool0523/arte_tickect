import "server-only"

import { createServerClient } from "@/lib/server/supabase-admin"
import { createAuthServerClient } from "@/lib/server/supabase-auth"

export async function syncProfileFromAuth(userId: string) {
  const authClient = await createAuthServerClient()
  const { data: { user }, error } = await authClient.auth.getUser()

  if (error || !user || user.id !== userId) {
    return { success: false, error: "User not found" }
  }

  const meta = user.user_metadata || {}
  const displayName = meta.full_name || meta.name || null
  const avatarUrl = meta.avatar_url || meta.picture || null

  if (!displayName && !avatarUrl) {
    return { success: true, synced: false, message: "No metadata to sync" }
  }

  const supabase = createServerClient()
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      display_name: displayName ? displayName.slice(0, 100) : null,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (updateError) {
    console.error("Profile sync failed", { userId, code: updateError.code })
    return { success: false, error: updateError.message }
  }

  return { success: true, synced: true, displayName, avatarUrl }
}