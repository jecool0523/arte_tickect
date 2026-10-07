import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url), ts = require("typescript")
const { NextRequest } = require("next/server")
let user = null, isAdmin = false, adminError = null, presale = false, profileError = null, periodError = null
let period = { start_time: "2099-01-01T00:00:00Z", end_time: "2099-01-02T00:00:00Z" }
let calls = [], rate = { allowed: true }, result = { success: true, bookingId: 1, presale: true }
const complete = { username: "test", display_name: "테스트", student_id: "1234", contact_number: "01012345678", profile_completed_at: "2026-01-01" }
const query = (table) => ({ select: () => ({ eq: (_key, id) => ({
  single: async () => ({ data: period, error: periodError }),
  maybeSingle: async () => { assert.equal(id, "verified-user"); return { data: { ...complete, is_presale_user: presale }, error: profileError } },
}) }) })
const mocks = {
  "server-only": {},
  "@/lib/server/supabase-auth": { createAuthServerClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) }, from: query, rpc: async () => ({ data: isAdmin, error: adminError }) }) },
  "@/lib/server/supabase-admin": { createServerClient: () => ({ from: query, rpc: async (name,args) => { calls.push({name,args}); return { data: name === "set_user_presale_status" ? { success: true, is_presale_user: args.p_is_presale } : result, error: null } } }) },
  "@/lib/server/rate-limit": { enforceRateLimit: async () => rate },
  "@/lib/ticket-share-token": { createTicketShareToken: () => "test-token" },
}
function load(file) {
  const module = { exports: {} }
  const source = ts.transpileModule(readFileSync(file,"utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  new Function("require","module","exports",source)(name => mocks[name] ?? (name.startsWith("@/") ? load(name.slice(2)+".ts") : require(name)), module,module.exports)
  return module.exports
}
const access = load("lib/server/booking-access.ts").getBookingAccess
assert.equal((await access("toctoc",null)).code,"AUTH_REQUIRED")
assert.equal((await access("toctoc","verified-user")).isOpen,false)
presale = true; assert.equal((await access("toctoc","verified-user")).presale,true)
profileError = {}; await assert.rejects(access("toctoc","verified-user")); profileError = null
periodError = {}; await assert.rejects(access("toctoc","verified-user")); periodError = null
period = {start_time:"invalid",end_time:"invalid"}; await assert.rejects(access("toctoc","verified-user"))
const now = Date.now()
period = {start_time:new Date(now-60000).toISOString(),end_time:new Date(now+60000).toISOString()}
presale = false; assert.equal((await access("toctoc","verified-user")).isOpen,true)
assert.equal((await access("toctoc","verified-user")).presale,false)
period.end_time = new Date(now-1000).toISOString(); presale = true
assert.equal((await access("toctoc","verified-user")).code,"BOOKING_CLOSED")
const admin = load("app/api/admin/users/presale-status/route.ts")
const request = (body,method="PATCH") => new NextRequest("http://localhost/api/test",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
const permission = {targetUserId:"11111111-1111-4111-8111-111111111111",isPresaleUser:true}
assert.equal((await admin.PATCH(request(permission))).status,401)
user = {id:"verified-user"}; assert.equal((await admin.PATCH(request(permission))).status,403); assert.equal(calls.length,0)
adminError = {}; assert.equal((await admin.PATCH(request(permission))).status,503); adminError = null
isAdmin = true
assert.equal((await admin.PATCH(request({...permission,byAdminId:"forged"}))).status,400)
const granted = await admin.PATCH(request(permission)); assert.equal(granted.status,200); assert.match(granted.headers.get("Cache-Control"),/private.*no-store/)
assert.equal(calls[0].args.p_by_admin_id,"verified-user"); assert.equal(calls[0].args.p_is_presale,true)
await admin.PATCH(request({...permission,isPresaleUser:false})); assert.equal(calls[1].args.p_is_presale,false)
const booking = load("app/api/bookings/[musicalId]/route.ts")
const body = {name:"테스트",studentId:"1234",seatGrade:"VIP",selectedSeats:["F1-VIP-R01-L01"]}
const params = {params:Promise.resolve({musicalId:"toctoc"})}
period = {start_time:"2099-01-01T00:00:00Z",end_time:"2099-01-02T00:00:00Z"}; presale = false; calls=[]
assert.equal((await booking.POST(request(body,"POST"),params)).status,403); assert.equal(calls.length,0)
presale = true
assert.equal((await booking.POST(request({...body,presaleKey:"old-code"},"POST"),params)).status,400)
const booked = await booking.POST(request(body,"POST"),params); assert.equal(booked.status,200)
assert.equal(calls[0].args.p_user_id,"verified-user"); assert.equal((await booked.json()).presale,true)
result = {success:false,code:"PRESALE_PERMISSION_REQUIRED",error:"권한 해제"}
assert.equal((await booking.POST(request(body,"POST"),params)).status,403,"Atomic DB revocation overrides preflight")
result = {success:false,code:"BOOKING_CLOSED"}
assert.equal((await booking.POST(request(body,"POST"),params)).status,403)
rate = {unavailable:true}; assert.equal((await booking.POST(request(body,"POST"),params)).status,503)
assert.equal(load("app/api/presale-keys/validate/route.ts").POST().status,410)
const draft = load("lib/booking-draft.ts").normalizeBookingDraft("toctoc",{presaleKey:"old-code",presaleSeatLimit:1,name:"테스트"})
assert.equal(draft.name,"테스트"); assert.equal("presaleKey" in draft,false); assert.equal("presaleSeatLimit" in draft,false)
for (const file of ["components/booking-route-page.tsx","components/seat-selection-route-page.tsx","components/admin/admin-dashboard.tsx"])
  assert.doesNotMatch(readFileSync(file,"utf8"),/presaleKey|presale_keys|예매 코드/)
const sql = readFileSync("scripts/account-presale-permissions.sql","utf8")
assert.match(sql,/FOR SHARE/); assert.ok(sql.indexOf("clock_timestamp()") > sql.indexOf("LOCK TABLE")); assert.match(sql,/FROM PUBLIC, anon, authenticated/)
console.log("Account presale: grant/revoke, admin denial, verified UID, closed periods, fail-closed checks, atomic recheck, retired codes and legacy drafts passed.")
