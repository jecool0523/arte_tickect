import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { checkSiteEnvironment, loadSiteEnvironment } from "./sites-env.mjs"

loadSiteEnvironment()
const config = checkSiteEnvironment()
const base = "http://127.0.0.1:8799"
const cases = [
  ["/", 200], ["/performances", 200], ["/club", 200], ["/login", 200],
  ["/profile", 307], ["/performances/rent/booking", 307],
  ["/api/profile", 401, "PATCH"], ["/api/bookings/rent", 401, "POST"],
  ["/api/reviews?musicalId=rent", 200], ["/api/seats/rent", 200],
  ["/api/admin/users", 401],
]
for (const [pathname, expected, method = "GET"] of cases) {
  const response = await fetch(new URL(pathname, base), { method, redirect: "manual", signal: AbortSignal.timeout(30000) })
  assert.equal(response.status, expected, `${method} ${pathname}`)
  if (pathname.startsWith("/api") || ["/login", "/profile"].includes(pathname) || pathname.includes("/booking")) {
    assert.match(response.headers.get("Cache-Control"), /private.*no-store/, pathname)
  }
  const body = await response.text()
  if (pathname === "/") {
    for (const label of ["홈", "공연", "아르떼", "프로필"]) assert.ok(body.includes(label), `Bottom nav: ${label}`)
    const script = body.match(/<script[^>]*src="([^"]+\.js)"/)
    assert.ok(script, "Home has a JS asset")
    const asset = await fetch(new URL(script[1], base))
    assert.equal(asset.status, 200, "JS asset")
  }
  console.log(`${method} ${pathname}: ${response.status}`)
}

const callback = await fetch(`${base}/auth/callback?next=https%3A%2F%2Fevil.invalid`, { redirect: "manual" })
assert.equal(callback.status, 307)
const location = new URL(callback.headers.get("Location"))
assert.equal(location.origin, config.NEXT_PUBLIC_SITE_URL)
assert.equal(location.pathname, "/login")
assert.equal(location.searchParams.get("next"), "/")
assert.match(callback.headers.get("Cache-Control"), /no-store/)

for (const filename of ["dist/server/sites-entry.js", "dist/server/sites-entry.js.map"]) {
  const bundle = readFileSync(filename)
  for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "RATE_LIMIT_SECRET", "TICKET_SHARE_SECRET"]) {
    if (process.env[name]) assert.ok(!bundle.includes(Buffer.from(process.env[name])), `${name} must not be baked into ${filename}`)
  }
}
console.log("Worker routes, auth barriers, private caches, static assets, safe callback and secret checks passed.")
