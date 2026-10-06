import { unstable_dev } from "wrangler"
import { loadSiteEnvironment } from "./sites-env.mjs"

loadSiteEnvironment()
process.env.WRANGLER_SEND_METRICS = "false"
process.env.WRANGLER_LOG_PATH = ".sites-runtime/wrangler-logs"
process.env.CLOUDFLARE_CF_FETCH_ENABLED = "false"
const names = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SITE_URL", "SUPABASE_SERVICE_ROLE_KEY", "TICKET_SHARE_SECRET", "RATE_LIMIT_SECRET", "TICKET_SHARE_TTL_SECONDS"]
const vars = { ...Object.fromEntries(names.filter(key => process.env[key]).map(key => [key, process.env[key]])), ARTE_DEPLOY_TARGET: "sites" }
const worker = await unstable_dev("worker/sites-entry.mjs", {
  config: "wrangler.jsonc",
  ip: "127.0.0.1",
  port: 8799,
  local: true,
  logLevel: "error",
  vars,
  experimental: { disableExperimentalWarning: true },
})
await worker.fetch("/")
console.log("Local Worker preview: http://127.0.0.1:8799")
let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  await worker.stop()
  process.exit(0)
}
process.on("SIGINT", stop)
process.on("SIGTERM", stop)
await worker.waitUntilExit()
