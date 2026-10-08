import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
const require = createRequire(import.meta.url)
const ts = require("typescript")
const React = require("react")
const { renderToStaticMarkup } = require("react-dom/server")
const { NextRequest } = require("next/server")
const root = process.cwd()
let user = { id: "verified-account-id" }
let isAdmin = false
let adminError = null
let result = { data: { eligible: true, status: "unanswered" }, error: null }
let rate = { allowed: true }
let calls = []
const mocks = {
  "server-only": {},
  "next/navigation": { useRouter: () => ({ replace() {}, refresh() {} }) },
  "@/lib/server/supabase-auth": { createAuthServerClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) }, rpc: async () => ({ data: isAdmin, error: adminError }) }) },
  "@/lib/server/supabase-admin": { createServerClient: () => ({ rpc: async (name, args) => { calls.push({ name, args }); return result } }) },
  "@/lib/server/rate-limit": { enforceRateLimit: async () => rate },
}
const cache = new Map()
function load(filename) {
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }; cache.set(filename, module)
  const source = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  const localRequire = createRequire(filename)
  const resolve = name => {
    if (mocks[name]) return mocks[name]
    if (name.startsWith("@/")) {
      const base = path.join(root, name.slice(2))
      return load([base + ".ts", base + ".tsx"].find(existsSync))
    }
    return localRequire(name)
  }
  new Function("require", "module", "exports", source)(resolve, module, module.exports)
  return module.exports
}
const own = load(path.join(root, "app/api/profile/arte-membership/route.ts"))
const admin = load(path.join(root, "app/api/admin/member-requests/route.ts"))
const request = (method, url, body, headers = {}) => new NextRequest(`http://localhost${url}`, { method, headers: { "Content-Type": "application/json", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
const ownPath = "/api/profile/arte-membership", adminPath = "/api/admin/member-requests"
const review = { requestId: "00000000-0000-4000-8000-000000000001", approve: true, identityConfirmed: true }
user = null
for (const [handler, method, url, body] of [[own.GET,"GET",ownPath], [own.POST,"POST",ownPath,{isMember:true}], [admin.GET,"GET",adminPath], [admin.PATCH,"PATCH",adminPath,review]]) assert.equal((await handler(request(method,url,body))).status,401)
user = { id: "verified-account-id" }
for (const method of ["GET","PATCH"]) assert.equal((await admin[method](request(method,adminPath,method === "PATCH" ? review : undefined))).status,403)
assert.equal(calls.length,0,"No private RPC for unauthorized accounts")
assert.equal((await own.GET(request("GET",`${ownPath}?userId=victim`))).status,400)
for (const extra of [{userId:"victim"}, {isAdmin:true}, {displayName:"김예성",studentId:"1203"}]) assert.equal((await own.POST(request("POST",ownPath,{isMember:true,...extra}))).status,400)
assert.equal((await own.POST(request("POST",ownPath,{isMember:"yes"}))).status,400)
assert.equal((await own.POST(request("POST",ownPath,{isMember:true},{origin:"https://evil.invalid"}))).status,403)
const ownState = await own.GET(request("GET",ownPath))
assert.equal(ownState.status,200)
assert.deepEqual(calls.at(-1),{name:"get_arte_membership_state",args:{p_user_id:user.id}})
assert.match(ownState.headers.get("Cache-Control"),/private.*no-store/)
assert.equal(ownState.headers.get("Vary"),"Cookie")
result = {data:{success:true,state:{eligible:true,status:"pending"}},error:null}
assert.equal((await own.POST(request("POST",ownPath,{isMember:true}))).status,200)
assert.deepEqual(calls.at(-1),{name:"submit_arte_membership_request",args:{p_user_id:user.id,p_is_member:true}})
for (const code of ["PROFILE_INCOMPLETE","NOT_ELIGIBLE","EMAIL_UNVERIFIED"]) {
  result = {data:{success:false,code},error:null}
  assert.equal((await own.POST(request("POST",ownPath,{isMember:true}))).status,403)
}
isAdmin = true
assert.equal((await admin.PATCH(request("PATCH",adminPath,{...review,identityConfirmed:false}))).status,400)
assert.equal((await admin.PATCH(request("PATCH",adminPath,{...review,adminId:"spoof"}))).status,400)
assert.equal((await admin.PATCH(request("PATCH",adminPath,review,{"sec-fetch-site":"cross-site"}))).status,403)
result = {data:{success:true,status:"approved"},error:null}
assert.equal((await admin.PATCH(request("PATCH",adminPath,review))).status,200)
assert.deepEqual(calls.at(-1),{name:"review_arte_admin_request",args:{p_admin_id:user.id,p_request_id:review.requestId,p_approve:true}})
assert.equal((await admin.PATCH(request("PATCH",adminPath,{...review,approve:false,identityConfirmed:false}))).status,200)
for (const [code,status] of [["FORBIDDEN",403],["SELF_APPROVAL_FORBIDDEN",403],["NOT_FOUND",404],["PROFILE_CHANGED",409],["ALREADY_REVIEWED",409],["MEMBER_ALREADY_APPROVED",409]]) {
  result = {data:{success:false,code},error:null}
  assert.equal((await admin.PATCH(request("PATCH",adminPath,review))).status,status)
}
result = {data:{success:true,requests:[],total:0},error:null}
assert.equal((await admin.GET(request("GET",adminPath))).status,200)
assert.deepEqual(calls.at(-1),{name:"list_arte_admin_requests",args:{p_admin_id:user.id}})
for (const [nextRate,status] of [[{allowed:false},429],[{unavailable:true},503]]) {
  rate=nextRate
  assert.equal((await own.POST(request("POST",ownPath,{isMember:true}))).status,status)
  assert.equal((await admin.PATCH(request("PATCH",adminPath,review))).status,status)
}
rate = {allowed:true}
result = {data:null,error:{code:"DB_FAILURE"}}
assert.equal((await own.GET(request("GET",ownPath))).status,503)
assert.equal((await admin.PATCH(request("PATCH",adminPath,review))).status,503)
adminError = {code:"DOWN"}
assert.equal((await admin.GET(request("GET",adminPath))).status,503)
const Card = load(path.join(root,"components/auth/arte-membership-card.tsx")).default
const markup = state => renderToStaticMarkup(React.createElement(Card,{initialState:state}))
assert.match(markup({eligible:true,status:"unanswered"}),/아르떼 부원인가요\?/)
assert.match(markup({eligible:true,status:"unanswered"}),/승인 전에는 일반 계정/)
assert.match(markup({eligible:true,status:"pending"}),/관리자 승인 대기 중/)
assert.match(markup({eligible:true,status:"rejected"}),/거절되었습니다/)
assert.equal(markup({eligible:false,status:"not_eligible"}),"")
assert.equal(markup({eligible:false,status:"admin"}),"")
assert.match(readFileSync("components/auth/profile-form.tsx","utf8"),/\/profile\/membership\?next=\$\{encodeURIComponent\(safeProfileNext/)
const safeNext = load(path.join(root,"lib/profile.ts")).safeProfileNext
assert.equal(safeNext("/profile/membership?next=/admin"),"/profile")
assert.equal(safeNext("https://evil.invalid"),"/profile")
assert.equal(safeNext("/performances/rent/booking"),"/performances/rent/booking")
console.log("Membership API auth/ID binding, CSRF, manual approval, role failures, idempotency responses, private caching, UI states and onboarding navigation passed.")
