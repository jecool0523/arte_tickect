import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { Script } from "node:vm"
const require = createRequire(import.meta.url)
const ts = require("typescript")
const React = require("react")
const { renderToStaticMarkup } = require("react-dom/server")
function load(filename, mocks = {}) {
  const exports = {}
  const source = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Script(source, { filename }).runInNewContext({ exports, URL, console, require: (name) => name in mocks ? mocks[name] : require(name) })
  return exports
}
const profile = load("lib/profile.ts")
const reservationModel = load("lib/reservations.ts", { "@/data/musicals": { getMusicalById: () => null } })
const reservationQueries = load("lib/server/reservations.ts", { "server-only": {}, "@/lib/reservations": reservationModel })
const stub = (name) => ({ __esModule: true, default: (props) => React.createElement("div", { "data-component": name }, name === "ProfileForm" ? props.initialUsername : props.children) })
let user = null, savedProfile = null, syncCalls = 0, isAdmin = false
const reads = []
const client = {
  rpc: async () => ({ data: isAdmin, error: null }),
  auth: { getUser: async () => ({ data: { user }, error: null }) },
  from: (table) => ({ select: () => ({ eq: (column, id) => {
    reads.push({ table, column, id })
    assert.equal(id, "self", "Only the verified user's data is queried")
    return { maybeSingle: async () => ({ data: savedProfile, error: null }), order: async () => ({ data: [], error: null }) }
  } }) }),
}
const mocks = {
  "@/lib/profile": profile,
  "@/lib/server/reservations": reservationQueries,
  "@/lib/server/supabase-auth": { createAuthServerClient: async () => client },
  "@/lib/server/supabase-admin": { createServerClient: () => ({ rpc: async () => ({ data: { success: true, email_confirmed: true }, error: null }) }) },
  "@/lib/server/profile-onboarding": { syncLegacyBookings: async (id) => { assert.equal(id, "self"); syncCalls++; return { success: true } } },
  "@/components/ui/card": Object.fromEntries(["Card", "CardContent", "CardHeader", "CardTitle"].map((name) => [name, stub(name).default])),
  "@/components/ui/button": { Button: stub("Button").default },
  "next/link": stub("Link"),
}
for (const name of ["account-page-shell", "login-card", "profile-form", "logout-button", "account-delete-button", "resend-confirmation-button", "sync-profile-button", "fan-experience-card", "profile-guide"]) mocks[`@/components/auth/${name}`] = stub(name)
const Page = load("app/profile/page.tsx", mocks).default
assert.match(renderToStaticMarkup(await Page()), /data-component="login-card"/)
assert.equal(syncCalls, 0)
assert.equal(reads.length, 0, "Anonymous visitors do not query private data")
user = { id: "self", email: "Alice123@example.org", user_metadata: {}, app_metadata: {} }
savedProfile = { display_name: null, student_id: null, username: null, contact_number: null }
const incomplete = renderToStaticMarkup(await Page())
assert.match(incomplete, /내 정보를 알려주세요/)
assert.match(incomplete, /Alice123/)
assert.equal(syncCalls, 0, "Incomplete users do not claim bookings")
assert.equal(reads.filter((r) => r.table !== "profiles").length, 0)
savedProfile = { ...savedProfile, display_name: "테스트", student_id: "1323", username: "Alice123", contact_number: "01012345678", profile_completed_at: "2026-10-06" }
assert.match(renderToStaticMarkup(await Page()), /내 예약 내역 보기/)
assert.equal(syncCalls, 1)
assert.equal(reads.filter((r) => r.column === "user_id").length, 4)
assert.doesNotMatch(renderToStaticMarkup(await Page()), /관리자 · 공연 관리/)
isAdmin = true
assert.match(renderToStaticMarkup(await Page()), /관리자 · 공연 관리/)
isAdmin = false
const Login = load("app/login/page.tsx", { ...mocks, "next/navigation": { redirect: (location) => { throw new Error(`REDIRECT:${location}`) } } }).default
savedProfile = null
await assert.rejects(Login({ searchParams: Promise.resolve({ next: "/profile" }) }), /REDIRECT:\/profile$/)
await assert.rejects(Login({ searchParams: Promise.resolve({ next: "/performances/rent/booking" }) }), /REDIRECT:\/profile\/setup\?next=/)
const callback = load("app/auth/callback/route.ts", {
  ...mocks,
  "@/lib/server/supabase-auth": { createAuthServerClient: async () => ({ ...client, auth: { exchangeCodeForSession: async () => ({ data: { user }, error: null }) } }) },
  "@/lib/server/sync-profile": { syncProfileFromAuth: async () => ({ success: true }) },
  "@/lib/site-url": { getSiteOrigin: () => "https://app.example.org" },
  "next/server": { NextResponse: { redirect: (url) => ({ url: url.toString(), headers: new Headers() }) } },
})
const request = (next) => ({ nextUrl: new URL(`https://app.example.org/auth/callback?code=sample&next=${encodeURIComponent(next)}`) })
assert.equal(new URL((await callback.GET(request("/profile"))).url).pathname, "/profile")
const setup = new URL((await callback.GET(request("/performances/rent/booking"))).url)
assert.equal(setup.pathname, "/profile/setup")
assert.equal(setup.searchParams.get("next"), "/performances/rent/booking")
const card = readFileSync("components/auth/login-card.tsx", "utf8")
assert.ok(card.includes("OAuthLoginButton"))
assert.doesNotMatch(card, /EmailAuth|type="password"|회원가입/)
assert.ok(readFileSync("components/app-bottom-nav.tsx", "utf8").includes('prefetch={item.section === "profile" ? false'))
console.log("Profile destination for all user states, private reads, Google-only UI and booking onboarding callbacks passed.")
