import { createClient } from "@supabase/supabase-js"

type UntypedSupabaseClient = any

let browserClient: UntypedSupabaseClient | null = null
let serverClient: UntypedSupabaseClient | null = null

function requireEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is required to create a Supabase client.`)
  }

  return value
}

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    )
  }

  return browserClient
}

export const createServerClient = () => {
  if (!serverClient) {
    serverClient = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    )
  }

  return serverClient
}
