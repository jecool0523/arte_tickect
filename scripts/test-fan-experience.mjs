import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
const require = createRequire(import.meta.url)
const ts = require("typescript")
const { NextRequest } = require("next/server")
let user = { id: "verified-user" }, authError = null, captured, rate = { allowed: true, unavailable: false }
let rpcError = null
const calls = []
const counts = { bookingCount: 2, reviewCount: 3, visitCount: 5, visitedToday: true, visitDate: "2026-10-07" }
const mocks = {
  "@/lib/server/supabase-auth": { createAuthServerClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: authError }) } }) },
  "@/lib/server/supabase-admin": { createServerClient: () => ({ rpc: async (name, args) => {
    captured = { name, args }; calls.push(captured)
    return { data: name.includes("review") ? [{ id: 12 }] : counts, error: rpcError }
  } }) },
  "@/lib/server/rate-limit": { enforceRateLimit: async () => rate },
}
const cache = new Map()
function load(filename) {
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }; cache.set(filename, module)
  const source = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  const resolve = (name) => {
    if (mocks[name]) return mocks[name]
    if (name.startsWith("@/")) {
      const base = path.join(process.cwd(), name.slice(2))
      return load([base + ".ts", base + ".tsx"].find(existsSync))
    }
    return createRequire(filename)(name)
  }
  new Function("require", "module", "exports", source)(resolve, module, module.exports)
  return module.exports
}
const { calculateFanExperience, FAN_LEVELS } = load(path.resolve("lib/fan-experience.ts"))
assert.equal(calculateFanExperience(counts).totalXp, 400)
for (const xp of [0, 190, 200, 490, 500, 990, 1000, 5000]) {
  const result = calculateFanExperience({ ...counts, bookingCount: 0, reviewCount: 0, visitCount: xp / 10 })
  const expected = [...FAN_LEVELS].reverse().find((level) => xp >= level.minXp)
  assert.equal(result.level, expected.name)
  assert.ok(result.progress >= 0 && result.progress <= 100)
  assert.ok(result.remainingXp >= 0)
}
const api = load(path.resolve("app/api/profile/fan-experience/route.ts"))
const req = (method = "GET", suffix = "", extras = {}) => new NextRequest(`http://localhost/api/profile/fan-experience${suffix}`, { method, ...(method === "POST" ? { body: "{}", headers: { "Content-Type": "application/json" } } : {}), ...extras })
user = null
assert.equal((await api.GET(req())).status, 401)
assert.equal((await api.POST(req("POST"))).status, 401)
assert.equal(calls.length, 0)
user = { id: "verified-user" }
let response = await api.GET(req())
assert.equal(response.status, 200)
assert.equal((await response.json()).experience.totalXp, 400)
assert.deepEqual(captured, { name: "get_account_fan_activity", args: { p_user_id: "verified-user" } })
assert.match(response.headers.get("Cache-Control"), /private.*no-store/)
assert.equal((await api.GET(req("GET", "?userId=victim"))).status, 400)
assert.equal((await api.POST(req("POST", "", { body: JSON.stringify({ points: 10000, userId: "victim", date: "2028-01-01" }) }))).status, 400)
assert.equal((await api.POST(req("POST", "", { headers: { Origin: "http://evil.example" } }))).status, 403)
assert.equal((await api.POST(req("POST"))).status, 200)
assert.equal(captured.name, "record_account_fan_visit")
assert.deepEqual(captured.args, { p_user_id: "verified-user" })
rate = { allowed: false }
assert.equal((await api.POST(req("POST"))).status, 429)
rate = { unavailable: true }
assert.equal((await api.POST(req("POST"))).status, 503)
rpcError = { code: "db-unavailable" }
assert.equal((await api.GET(req())).status, 503)
rate = { allowed: true }; rpcError = null
const reviews = load(path.resolve("app/api/reviews/route.ts"))
const reviewRequest = () => new NextRequest("http://localhost/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ musicalId: "rent", name: "관객", content: "좋았어요", rating: 5, deletionToken: "a".repeat(64), userId: "victim" }) })
response = await reviews.POST(reviewRequest())
assert.equal(response.status, 200)
assert.equal((await response.json()).fanXpEligible, true)
assert.equal(captured.name, "create_account_review")
assert.equal(captured.args.p_user_id, "verified-user")
user = null; authError = { name: "AuthSessionMissingError" }
response = await reviews.POST(reviewRequest())
assert.equal(response.status, 200)
assert.equal((await response.json()).fanXpEligible, false)
assert.equal(captured.name, "create_review")
assert.ok(!("p_user_id" in captured.args))
authError = { name: "AuthRetryableFetchError" }
assert.equal((await reviews.POST(reviewRequest())).status, 401)
console.log("Fan rank boundaries, private API identity, forged fields, CSRF, failures and authenticated/anonymous review ownership passed.")
