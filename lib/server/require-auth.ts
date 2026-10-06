import "server-only"

import { redirect } from "next/navigation"
import { createAuthServerClient } from "@/lib/server/supabase-auth"
import { isProfileComplete } from "@/lib/profile"

function safeRelativePath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/"
}

export async function requireAuthUser(nextPath: string, allowIncomplete = false) {
  const supabase = await createAuthServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect(`/login?next=${encodeURIComponent(safeRelativePath(nextPath))}`)
  }

  if (!allowIncomplete) {
    const { data: profile, error: profileError } = await supabase.from("profiles")
      .select("username, display_name, student_id, contact_number, profile_completed_at").eq("id", user.id).maybeSingle()
    if (profileError) throw new Error("Profile is temporarily unavailable")
    if (!isProfileComplete(profile)) redirect(`/profile/setup?next=${encodeURIComponent(safeRelativePath(nextPath))}`)
  }

  return { supabase, user }
}

export async function requireAdminUser(nextPath: string) {
  const { supabase, user } = await requireAuthUser(nextPath)

  const { data: isAdmin, error } = await supabase.rpc("is_current_user_admin")

  if (error || !isAdmin) {
    redirect(`/profile?error=admin_required`)
  }

  return { supabase, user }
}
