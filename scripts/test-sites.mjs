import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { checkSiteEnvironment, loadSiteEnvironment } from "./sites-env.mjs"

loadSiteEnvironment()
const config = checkSiteEnvironment()
const base = "http://127.0.0.1:8799"
const cases = [
  ["/", 200], ["/performances", 200], ["/club", 200], ["/login", 200],
  ["/profile", 200], ["/profile/setup", [200, 307]], ["/performances/rent/booking", 307],
  ["/profile/bookings", 200],
  ["/profile/bookings/rent/1", [200, 307]],
  ["/api/profile/sync", 401, "POST"],
  ["/api/profile", 401, "PATCH"], ["/api/bookings/rent", 401, "POST"],
  ["/api/reviews?musicalId=rent", 200], ["/api/seats/rent", 200],
  ["/api/admin/users", 401],
  ["/api/admin/performances", 401], ["/api/admin/performances", 401, "PATCH"],
  ["/api/admin/booking-stats", 401],
]
for (const [pathname, expected, method = "GET"] of cases) {
  const response = await fetch(new URL(pathname, base), { method, redirect: "manual", signal: AbortSignal.timeout(30000) })
  assert.ok((Array.isArray(expected) ? expected : [expected]).includes(response.status), `${method} ${pathname}: expected ${expected}, got ${response.status}`)
  if (pathname.startsWith("/api") || pathname.startsWith("/profile") || pathname === "/login" || pathname.includes("/booking")) {
    assert.match(response.headers.get("Cache-Control"), /private.*no-store/, pathname)
  }
  const body = await response.text()
  if ((pathname === "/profile/setup" || pathname === "/profile/bookings/rent/1") && response.status === 200) {
    // A parent loading boundary can stream HTTP 200 before Next emits its auth redirect.
    assert.match(body, /<meta[^>]*http-equiv="refresh"[^>]*url=\/login\?next=/)
    assert.ok(!body.includes('id="studentId"'), "Anonymous setup must not render the private form")
    assert.ok(!body.includes("ARTE TICKET"), "Anonymous visitors must not see a private ticket")
  }
  if (pathname === "/profile" || pathname === "/login") {
    assert.ok(body.includes("Google로 계속하기"), `${pathname}: Google login preserved`)
    assert.ok(!body.includes("이메일로 로그인"), `${pathname}: no email login`)
    assert.ok(!body.includes("이메일로 회원가입"), `${pathname}: no email signup`)
  }
  if (pathname === "/") {
    assert.match(body, /<h1[^>]*>아르떼<\/h1>/)
    assert.ok(!body.includes("공연 검색"), "Removed home search field")
    assert.ok(body.includes("내 예약 내역 보기"), "Reservation history CTA")
    assert.ok(body.includes('href="/profile/bookings"'), "History destination")
    for (const label of ["홈", "공연", "아르떼", "프로필"]) assert.ok(body.includes(label), `Bottom nav: ${label}`)
    const script = body.match(/<script[^>]*src="([^"]+\.js)"/)
    assert.ok(script, "Home has a JS asset")
    const asset = await fetch(new URL(script[1], base))
    assert.equal(asset.status, 200, "JS asset")
  }
  if (pathname === "/profile" || pathname === "/login" || pathname === "/profile/bookings") {
    assert.ok(!body.includes("이메일 도메인 제한 없이 로그인할 수 있어요."), "Removed login explanation")
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
