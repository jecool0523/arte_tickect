import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

type AdminClient = SupabaseClient<Database>

let adminClient: AdminClient | null = null

function requireServerEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required to create the server Supabase client.`)
  return value
}

export function createServerClient() {
  if (!adminClient) {
    adminClient = createClient<Database>(
      requireServerEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
  }

  return adminClient
}
