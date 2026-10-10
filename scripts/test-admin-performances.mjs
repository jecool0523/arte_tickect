import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
const ts = require("typescript")
const { NextRequest } = require("next/server")
let user = null, isAdmin = false, writes = [], invalidations = 0, saveError = null, rate = { allowed: true, unavailable: false }
const mocks = {
  "@/lib/server/supabase-auth": { createAuthServerClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) }, rpc: async (name,args) => {
    if(name === "is_current_user_admin")return { data: isAdmin, error: null }
    writes.push({name,args}); return { error: saveError }
  } }) },
  "@/lib/server/supabase-admin": { createServerClient: () => ({}) },
  "@/lib/server/performances": { getLiveMusicals: async () => [], invalidatePerformanceSettings: () => { invalidations++ } },
  "@/lib/server/rate-limit": { enforceRateLimit: async (_client,_request,_limits,uid) => { assert.equal(uid,"verified-admin"); return rate } },
}
function load(file) {
  const module={exports:{}}
  const source=ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText
  new Function("require","module","exports",source)((name)=>mocks[name]??(name.startsWith("@/")?load(name.slice(2)+".ts"):require(name)),module,module.exports)
  return module.exports
}
const settings=load("lib/performance-settings.ts")
const route=load("app/api/admin/performances/route.ts")
const details={ title:"공연",subtitle:"",genre:"연극",special:"",runtime:"1시간",ageRating:"전체",venue:"대강당",date:"2026년 10월 7일",time:"17시",synopsis:"줄거리",posterImage:"/toc-toc/poster.png" }
const valid={musicalId:"toctoc",details,startTime:"2026-10-07T08:00:00Z",endTime:"2026-10-07T09:00:00Z"}
const request=(body)=>new NextRequest("http://localhost/api/admin/performances",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
assert.equal((await route.GET()).status,401)
assert.equal((await route.PATCH(request(valid))).status,401)
user={id:"verified-admin"}; assert.equal((await route.PATCH(request(valid))).status,403)
assert.equal(writes.length,0,"No unauthorized DB writes")
isAdmin=true
for(const body of [{...valid,musicalId:"toString"},{...valid,adminId:"forged"},{...valid,endTime:valid.startTime},{...valid,details:{...details,posterImage:"javascript:alert(1)"}}])assert.equal((await route.PATCH(request(body))).status,400)
assert.equal(invalidations,0,"Unauthorized or invalid requests cannot invalidate public settings")
const result=await route.PATCH(request(valid)); assert.equal(result.status,200); assert.match(result.headers.get("Cache-Control"),/private.*no-store/)
assert.equal(writes.length,1); assert.equal(writes[0].name,"save_admin_performance"); assert.equal(writes[0].args.p_musical_id,"toctoc")
assert.equal(invalidations,1,"Successful admin save refreshes public settings")
saveError = { code: "test-unavailable" }
assert.equal((await route.PATCH(request(valid))).status,503)
assert.equal(invalidations,1,"Failed save does not invalidate settings")
saveError = null
rate={allowed:false}; assert.equal((await route.PATCH(request(valid))).status,429)
rate={unavailable:true}; assert.equal((await route.PATCH(request(valid))).status,503)
assert.equal(invalidations,1,"Rate-limited requests cannot invalidate settings")
assert.equal(settings.toKoreaDateTimeInput("2026-10-07T08:00:00Z"),"2026-10-07T17:00:00")
assert.equal(settings.fromKoreaDateTimeInput("2026-10-07T17:00"),"2026-10-07T08:00:00.000Z")
assert.equal(settings.fromKoreaDateTimeInput(settings.toKoreaDateTimeInput("2026-10-07T08:00:59Z")),"2026-10-07T08:00:59.000Z","Preserve existing booking period seconds")
let liveRows = [{musical_id:"toctoc",details:{...details,title:"수정한 공연명"}}]
mocks["server-only"] = {}
mocks["next/cache"] = { unstable_cache: (fn) => fn, revalidateTag: () => {} }
mocks["@/lib/server/supabase-admin"] = {createServerClient:()=>({from:(table)=>{assert.equal(table,"performance_settings");return {select:async()=>({data:liveRows,error:null})}}})}
const live = load("lib/server/performances.ts")
assert.equal((await live.getLiveMusical("toctoc")).title,"수정한 공연명","Saved information is used by public pages and tickets")
liveRows=[{musical_id:"toctoc",details:{title:"invalid incomplete data"}}]
assert.notEqual((await live.getLiveMusical("toctoc")).title,"invalid incomplete data","Invalid overrides preserve the original show")
console.log("Admin API auth, ordinary-user denial, schema validation, atomic session RPC, private cache, rate limits and Korea-time conversion passed.")
