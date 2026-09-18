import "server-only"

import { redirect } from "next/navigation"
import { createAuthServerClient } from "@/lib/server/supabase-auth"

function safeRelativePath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/"
}

export async function requireAuthUser(nextPath: string) {
  const supabase = await createAuthServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect(`/login?next=${encodeURIComponent(safeRelativePath(nextPath))}`)
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