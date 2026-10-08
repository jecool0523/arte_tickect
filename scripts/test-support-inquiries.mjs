import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url), ts = require("typescript"), { NextRequest } = require("next/server")
let user = { id:"verified-owner" }, isAdmin = false, adminError = null, authError = null
let calls = [], rate = { allowed:true }, result = { success:true,inquiryId:"created" }, rpcError = null
const mocks = {
  "server-only":{},
  "@/lib/server/supabase-auth":{ createAuthServerClient:async () => ({ auth:{ getUser:async () => ({ data:{user},error:authError }) },rpc:async () => ({data:isAdmin,error:adminError}) }) },
  "@/lib/server/supabase-admin":{ createServerClient:() => ({rpc:async (name,args) => {calls.push({name,args});return {data:result,error:rpcError}}}) },
  "@/lib/server/rate-limit":{ enforceRateLimit:async () => rate },
}
function load(file) {
  const module={exports:{}}
  const source=ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText
  new Function("require","module","exports",source)(name => mocks[name] ?? (name.startsWith("@/") ? load(name.slice(2)+".ts") : require(name)),module,module.exports)
  return module.exports
}
const own=load("app/api/profile/inquiries/route.ts"), admin=load("app/api/admin/inquiries/route.ts")
const key="00000000-0000-4000-8000-000000000001"
const request=(path,method="GET",body,headers={}) => new NextRequest("http://localhost"+path,{method,headers:{"Content-Type":"application/json",...headers},...(body ? {body:JSON.stringify(body)} : {})})
user=null
for(const [handler,path,method] of [[own.GET,"/api/profile/inquiries","GET"],[own.POST,"/api/profile/inquiries","POST"],[admin.GET,"/api/admin/inquiries","GET"],[admin.PATCH,"/api/admin/inquiries","PATCH"]])
  assert.equal((await handler(request(path,method))).status,401)
user={id:"verified-owner"}
assert.equal((await admin.GET(request("/api/admin/inquiries"))).status,403)
assert.equal((await admin.PATCH(request("/api/admin/inquiries","PATCH",{inquiryId:key,reply:"x"}))).status,403)
assert.equal(calls.length,0)
adminError={}; assert.equal((await admin.GET(request("/api/admin/inquiries"))).status,503);adminError=null
const listed=await own.GET(request("/api/profile/inquiries?offset=20"))
assert.equal(listed.status,200);assert.match(listed.headers.get("Cache-Control"),/private.*no-store/);assert.equal(listed.headers.get("Vary"),"Cookie")
assert.deepEqual(calls.pop(),{name:"list_support_inquiries",args:{p_user_id:"verified-owner",p_admin:false,p_offset:20}})
for(const query of ["userId=foreign","admin=true","offset=-1","offset=1&offset=2","offset=1e2","offset=1000001"])
  assert.equal((await own.GET(request("/api/profile/inquiries?"+query))).status,400)
for(const body of [{requestKey:key,content:" "},{requestKey:key,content:"a".repeat(2001)},{requestKey:key,content:"x",userId:"forged"},{requestKey:key,content:"x",reply:"forged"}])
  assert.equal((await own.POST(request("/api/profile/inquiries","POST",body))).status,400)
assert.equal((await own.POST(request("/api/profile/inquiries?offset=0","POST",{requestKey:key,content:"x"}))).status,400)
assert.equal((await own.POST(request("/api/profile/inquiries","POST",{requestKey:key,content:"x"},{Origin:"https://evil.invalid"}))).status,403)
assert.equal((await own.POST(request("/api/profile/inquiries","POST",{requestKey:key,content:"x"},{"Sec-Fetch-Site":"cross-site"}))).status,403)
assert.equal((await own.POST(request("/api/profile/inquiries","POST",{requestKey:key,content:" 문의 "}))).status,200)
assert.deepEqual(calls.pop(),{name:"submit_support_inquiry",args:{p_user_id:"verified-owner",p_request_key:key,p_content:"문의"}})
rate={allowed:false};assert.equal((await own.POST(request("/api/profile/inquiries","POST",{requestKey:key,content:"x"}))).status,429)
rate={unavailable:true};assert.equal((await own.POST(request("/api/profile/inquiries","POST",{requestKey:key,content:"x"}))).status,503);rate={allowed:true}
isAdmin=true
await admin.GET(request("/api/admin/inquiries"));assert.equal(calls.pop().args.p_admin,true)
assert.equal((await admin.PATCH(request("/api/admin/inquiries","PATCH",{inquiryId:key,reply:" 답변 "}))).status,200)
assert.deepEqual(calls.pop(),{name:"reply_support_inquiry",args:{p_admin_id:"verified-owner",p_inquiry_id:key,p_reply:"답변"}})
for(const [code,status] of [["FORBIDDEN",403],["NOT_FOUND",404],["ALREADY_ANSWERED",409],["INVALID_INPUT",400]]) {
  result={success:false,code};assert.equal((await admin.PATCH(request("/api/admin/inquiries","PATCH",{inquiryId:key,reply:"x"}))).status,status)
}
rpcError={};assert.equal((await own.GET(request("/api/profile/inquiries"))).status,503)
authError={};assert.equal((await own.GET(request("/api/profile/inquiries"))).status,401)
console.log("Support API: owner ID binding, current admin role, private caches, strict fields, paging, CSRF, input bounds, rate limits and failures passed.")
