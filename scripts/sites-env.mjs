import { createRequire } from "node:module"
import { dirname } from "node:path"

const require = createRequire(import.meta.url)
const nextRoot = dirname(require.resolve("next/package.json"))
const { loadEnvConfig } = require(require.resolve("@next/env", { paths: [nextRoot] }))

export function loadSiteEnvironment() {
  loadEnvConfig(process.cwd(), false, { info() {}, error(message) { console.error(message) } })
  return process.env
}

function jwtRole(key) {
  try { return JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role } catch { return undefined }
}

export function checkSiteEnvironment(env = process.env) {
  const errors = []
  const publicKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!env.NEXT_PUBLIC_SUPABASE_URL) errors.push("NEXT_PUBLIC_SUPABASE_URL is missing")
  else {
    try { if (new URL(env.NEXT_PUBLIC_SUPABASE_URL).protocol !== "https:") throw new Error() }
    catch { errors.push("NEXT_PUBLIC_SUPABASE_URL must be an HTTPS URL") }
  }
  if (!publicKey) errors.push("A Supabase public key is missing")
  else if (!publicKey.startsWith("sb_publishable_") && jwtRole(publicKey) !== "anon") {
    errors.push("The browser key must be a publishable or anon key, never a privileged key")
  }
  const adminKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!adminKey) errors.push("SUPABASE_SERVICE_ROLE_KEY is missing")
  else if (!adminKey.startsWith("sb_secret_") && jwtRole(adminKey) !== "service_role") {
    errors.push("SUPABASE_SERVICE_ROLE_KEY must be a server-only privileged key")
  }
  if (publicKey && publicKey === adminKey) errors.push("Browser and server keys must be different")
  const siteUrl = env.NEXT_PUBLIC_SITE_URL
  try {
    const url = new URL(siteUrl)
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error()
  } catch { errors.push("NEXT_PUBLIC_SITE_URL must be the canonical HTTPS Site origin") }
  if (env.TICKET_SHARE_SECRET && env.TICKET_SHARE_SECRET.length < 32) errors.push("TICKET_SHARE_SECRET must have at least 32 characters")
  const rateLimitSecret = env.RATE_LIMIT_SECRET || env.TICKET_SHARE_SECRET || adminKey
  if (!rateLimitSecret || rateLimitSecret.length < 32) errors.push("A rate-limit signing secret of at least 32 characters is required")
  const ttl = env.TICKET_SHARE_TTL_SECONDS
  if (ttl && (!Number.isSafeInteger(Number(ttl)) || Number(ttl) <= 0)) errors.push("TICKET_SHARE_TTL_SECONDS must be a positive integer")
  if (errors.length) throw new Error(errors.join("\n"))
  return {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    NEXT_PUBLIC_SITE_URL: new URL(siteUrl).origin,
  }
}

export async function checkSupabaseConnection(env = process.env) {
  const apikey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const base = env.NEXT_PUBLIC_SUPABASE_URL
  const responses = await Promise.all([
    fetch(new URL("/auth/v1/settings", base), { headers: { apikey }, signal: AbortSignal.timeout(15000) }),
    fetch(new URL("/rest/v1/arte_musical_application_period?select=id&limit=1", base), { headers: { apikey }, signal: AbortSignal.timeout(15000) }),
    fetch(new URL("/rest/v1/reviews?select=id&limit=1", base), {
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
      signal: AbortSignal.timeout(15000),
    }),
  ])
  if (!responses.every(response => response.ok)) {
    const status = responses.map(response => response.status)
    await Promise.all(responses.map(response => response.arrayBuffer()))
    throw new Error(`Supabase connectivity failed (Auth ${status[0]}, public data ${status[1]}, server key ${status[2]}). Do not publish until the server key is registered and valid.`)
  }
  const settings = await responses[0].json()
  await responses[1].arrayBuffer()
  await responses[2].arrayBuffer()
  if (!settings.external?.google) throw new Error("Google sign-in is disabled in Supabase; enable the existing provider before publishing")
  return { auth: "ok", publicData: "ok", serverKey: "ok", googleProvider: "enabled" }
}
