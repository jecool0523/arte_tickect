import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

type TypedSupabaseClient = SupabaseClient<Database>

let browserClient: TypedSupabaseClient | null = null

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !publishableKey) throw new Error("Supabase public environment variables are required.")

    browserClient = createBrowserClient<Database>(
      url,
      publishableKey,
    )
  }

  return browserClient
}
