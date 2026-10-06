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
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  new Script(compiled).runInNewContext({ exports, URL, console, require: (name) => name in mocks ? mocks[name] : require(name) })
  return exports
}
const model = load("lib/reservations.ts", { "@/data/musicals": { getMusicalById: () => ({ title: "RENT", date: "공연일", time: "공연시간", venue: "대강당" }) } })
const queries = load("lib/server/reservations.ts", { "server-only": {}, "@/lib/reservations": model })
const own = { id: 12, user_id: "self", name: "본인", student_id: "1323", selected_seats: ["F1-VIP-A-1"], seat_grade: "VIP", booking_date: "2026-10-06T12:00:00Z", status: "confirmed" }
const foreign = { ...own, id: 13, user_id: "someone-else", name: "다른 사람" }
let reads = 0
let failRead = false
const client = { from: (table) => {
  reads++
  assert.ok(model.reservationSources.some((s) => s.table === table), "Allowlisted tables only")
  const filters = []
  const query = {
    select: () => query,
    eq: (key, value) => { filters.push([key, value]); return query },
    maybeSingle: async () => ({ data: [own, foreign].find((row) => filters.every(([key, value]) => row[key] === value)) ?? null, error: failRead ? {} : null }),
    order: async () => ({ data: table === "rent_bookings" ? [own, foreign].filter((row) => filters.every(([key, value]) => row[key] === value)) : [], error: failRead ? {} : null }),
  }
  return query
} }
assert.equal(await queries.getOwnedReservation(client, "self", "rent", "13"), null, "Cannot read somebody else's ID")
assert.equal((await queries.getOwnedReservation(client, "self", "rent", "12")).name, "본인")
const before = reads
for (const [source, id] of [["toString", "12"], ["unknown", "12"], ["rent", "-1"], ["rent", "12abc"], ["rent", "9007199254740992"]]) assert.equal(await queries.getOwnedReservation(client, "self", source, id), null)
assert.equal(reads, before, "Invalid paths must not query the DB")
const list = await queries.getOwnedReservations(client, "self")
assert.equal(list.reservations.length, 1)
assert.equal(list.reservations[0].id, 12)
assert.equal(list.unavailable, false)
failRead = true
await assert.rejects(queries.getOwnedReservation(client, "self", "rent", "12"), /temporarily unavailable/)
assert.equal((await queries.getOwnedReservations(client, "self")).unavailable, true)
failRead = false
assert.equal(model.isTicketReady("cancelled"), false)
assert.equal(model.isTicketReady("confirmed"), true)
assert.equal(model.isTicketReady("completed"), true)
assert.equal(model.reservationTicketPath("rent", 12), "/profile/bookings/rent/12")
const legacy = model.reservationTicketData({ ...own, sourceId: "legacy", musicalTitle: "아르떼 이전 공연" })
assert.equal(legacy.musicalDate, "공연일 정보 없음", "No invented legacy show metadata")

const stub = { __esModule: true, default: ({ children }) => React.createElement("div", null, children) }
const card = Object.fromEntries(["Card", "CardContent", "CardHeader", "CardTitle"].map((name) => [name, stub.default]))
let user = { id: "self" }
let profile = { username: "Alice123", display_name: "본인", student_id: "1323", contact_number: "01012345678", profile_completed_at: "now" }
let syncCount = 0
const reservations = [{ ...own, sourceId: "rent", musicalTitle: "RENT" }, { ...own, id: 14, sourceId: "rent", musicalTitle: "RENT", status: "cancelled" }]
const mocks = {
  "@/components/auth/account-page-shell": stub,
  "@/components/auth/login-card": { __esModule: true, default: () => React.createElement("p", null, "Google 로그인") },
  "@/components/ui/card": card, "@/components/ui/button": { Button: stub.default }, "next/link": { __esModule: true, default: ({ children, href }) => React.createElement("a", { href }, children) },
  "@/lib/reservations": model,
  "@/lib/profile": load("lib/profile.ts"),
  "@/lib/server/supabase-auth": { createAuthServerClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile }) }) }) }) }) },
  "@/lib/server/profile-onboarding": { syncLegacyBookings: async () => { syncCount++; return { success: true } } },
  "@/lib/server/reservations": { getOwnedReservations: async () => ({ reservations, unavailable: false }), getOwnedReservation: async () => reservations[0] },
  "@/lib/server/require-auth": { requireAuthUser: async () => ({ user, supabase: client }) },
  "@/components/booking-ticket": { __esModule: true, default: ({ ticket, showShareActions, showSeatMap }) => React.createElement("article", { "data-sharing": String(showShareActions), "data-seat-map": String(showSeatMap) }, `${ticket.name}|${ticket.selectedSeats.join(",")}`) },
  "next/navigation": { notFound: () => { throw new Error("NOT_FOUND") } },
}
const History = load("app/profile/bookings/page.tsx", mocks).default
const html = renderToStaticMarkup(await History())
assert.equal((html.match(/내 티켓 확인하기/g) ?? []).length, 1, "Cancelled reservations do not get valid-ticket links")
assert.ok(html.includes('href="/profile/bookings/rent/12"'))
assert.ok(html.includes("취소됨"))
user = null
assert.match(renderToStaticMarkup(await History()), /Google 로그인/)
assert.equal(syncCount, 1, "No anonymous sync")
user = { id: "self" }; profile = null
assert.match(renderToStaticMarkup(await History()), /내 정보 입력하기/)
assert.equal(syncCount, 1, "No incomplete-profile sync")
const Ticket = load("app/profile/bookings/[sourceId]/[bookingId]/page.tsx", mocks).default
assert.match(renderToStaticMarkup(await Ticket({ params: Promise.resolve({ sourceId: "rent", bookingId: "12" }) })), /data-sharing="false"/)
reservations[0].sourceId = "legacy"
assert.match(renderToStaticMarkup(await Ticket({ params: Promise.resolve({ sourceId: "legacy", bookingId: "12" }) })), /data-seat-map="false"/, "Unknown legacy venue must not show an assumed seat map")
mocks["@/lib/server/reservations"].getOwnedReservation = async () => null
await assert.rejects(Ticket({ params: Promise.resolve({ sourceId: "rent", bookingId: "13" }) }), /NOT_FOUND/, "Missing or foreign bookings get the same not-found result")
console.log("Owned reservation reads, foreign-ID denial, allowlisted paths, cancelled status, history login/onboarding and private ticket rendering passed.")
