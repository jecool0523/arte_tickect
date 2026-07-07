import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

type TypedSupabaseClient = SupabaseClient<Database>

let browserClient: TypedSupabaseClient | null = null
let serverClient: TypedSupabaseClient | null = null

function requireEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is required to create a Supabase client.`)
  }

  return value
}

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createClient<Database>(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    )
  }

  return browserClient
}

export const createServerClient = () => {
  if (!serverClient) {
    serverClient = createClient<Database>(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    )
  }

  return serverClient
}
