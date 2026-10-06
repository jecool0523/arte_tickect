import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
const require = createRequire(import.meta.url)
const ts = require("typescript")
const { NextRequest } = require("next/server")
const root = process.cwd()
let user = { id: "verified-session-uid" }
let rpcResult = { data: { success: true, linked_count: 4 }, error: null }
let rate = { allowed: true, unavailable: false }
let captured
const mocks = {
  "@/lib/server/supabase-auth": { createAuthServerClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) } }) },
  "@/lib/server/supabase-admin": { createServerClient: () => ({ rpc: async (name, args) => { captured = { name, args }; return rpcResult } }) },
  "@/lib/server/rate-limit": { enforceRateLimit: async () => rate },
}
const cache = new Map()
function load(filename) {
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }; cache.set(filename, module)
  const source = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  const localRequire = createRequire(filename)
  const resolve = (name) => {
    if (mocks[name]) return mocks[name]
    if (name.startsWith("@/")) {
      const base = path.join(root, name.slice(2))
      const file = [base + ".ts", base + ".tsx"].find(existsSync)
      if (!file) throw new Error(`Missing test dependency ${name}`)
      return load(file)
    }
    return localRequire(name)
  }
  new Function("require", "module", "exports", source)(resolve, module, module.exports)
  return module.exports
}
const { PATCH } = load(path.join(root, "app/api/profile/route.ts"))
const valid = { username: "Alice123", displayName: " 홍길동 ", studentId: "1323", contactNumber: "010-1234-5678" }
const request = (body) => new NextRequest("http://localhost/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
user = null
assert.equal((await PATCH(request(valid))).status, 401)
user = { id: "verified-session-uid" }
assert.equal((await PATCH(request({ ...valid, userId: "victim-uid" }))).status, 400)
assert.equal((await PATCH(request({ displayName: "홍길동", studentId: "1323" }))).status, 400)
const response = await PATCH(request(valid))
assert.equal(response.status, 200)
assert.equal((await response.json()).linkedCount, 4)
assert.equal(captured.name, "save_profile_and_sync_bookings")
assert.equal(captured.args.p_user_id, "verified-session-uid")
assert.equal(captured.args.p_display_name, "홍길동")
assert.equal(captured.args.p_contact_number, "01012345678")
assert.match(response.headers.get("Cache-Control"), /no-store/)
for (const code of ["USERNAME_TAKEN", "IDENTITY_TAKEN", "IDENTITY_LOCKED"]) {
  rpcResult = { data: { success: false, code }, error: null }
  assert.equal((await PATCH(request(valid))).status, 409)
}
rate = { unavailable: true }
assert.equal((await PATCH(request(valid))).status, 503)
rate = { allowed: false }
assert.equal((await PATCH(request(valid))).status, 429)
console.log("Profile API auth, verified UID binding, required fields, normalized save, conflict and rate-limit responses passed.")
