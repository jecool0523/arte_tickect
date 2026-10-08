import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
const require = createRequire(import.meta.url), ts = require("typescript"), { NextRequest } = require("next/server")
const root = process.cwd(), cache = new Map()
let user = {id:"verified-session-uid"}, calls=[], rate={allowed:true}, result={data:{success:true,status:"cancelled",alreadyCancelled:false},error:null}
const mocks = {
  "server-only": {},
  "@/lib/server/supabase-auth": {createAuthServerClient:async()=>({auth:{getUser:async()=>({data:{user},error:null})}})},
  "@/lib/server/supabase-admin": {createServerClient:()=>({rpc:async(name,args)=>{calls.push({name,args});return result}})},
  "@/lib/server/rate-limit": {enforceRateLimit:async(_client,_request,_limit,id)=>{assert.equal(id,user.id);return rate}},
}
function load(file) {
  if (cache.has(file)) return cache.get(file).exports
  const module={exports:{}};cache.set(file,module)
  const source=ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText
  new Function("require","module","exports",source)(name=>{
    if(mocks[name])return mocks[name]
    if(name.startsWith("@/")){const base=path.join(root,name.slice(2));return load([base+".ts",base+".tsx"].find(existsSync))}
    return require(name)
  },module,module.exports)
  return module.exports
}
const { PATCH }=load(path.join(root,"app/api/profile/bookings/[sourceId]/[bookingId]/route.ts"))
const params={sourceId:"rent",bookingId:"12"}
const request=(body,headers={},query="")=>new NextRequest(`http://localhost/api/profile/bookings/rent/12${query}`,{method:"PATCH",headers:{"Content-Type":"application/json",...headers},body:JSON.stringify(body)})
const run=(body={action:"cancel"},headers={},target=params,query="")=>PATCH(request(body,headers,query),{params:Promise.resolve(target)})
user=null;assert.equal((await run()).status,401);assert.equal(calls.length,0)
user={id:"verified-session-uid"}
for(const invalid of [{action:"restore"},{action:"cancel",userId:"victim"},{action:"cancel",status:"confirmed"},{action:"rebook",name:"forged",studentId:"1203"}])assert.equal((await run(invalid)).status,400)
for(const target of [{sourceId:"toString",bookingId:"12"},{sourceId:"rent;DROP TABLE",bookingId:"12"},{sourceId:"rent",bookingId:"0"},{sourceId:"rent",bookingId:"12abc"},{sourceId:"rent",bookingId:"9007199254740992"}])assert.equal((await run({action:"cancel"},{},target)).status,404)
assert.equal((await run({action:"cancel"},{origin:"https://evil.invalid"})).status,403)
assert.equal((await run({action:"cancel"},{"sec-fetch-site":"cross-site"})).status,403)
assert.equal((await run({action:"cancel"},{},params,"?userId=victim")).status,400)
assert.equal(calls.length,0,"Invalid requests never invoke cancellation RPC")
let response=await run();assert.equal(response.status,200)
assert.deepEqual(calls.at(-1),{name:"cancel_owned_reservation",args:{p_user_id:user.id,p_source_id:"rent",p_booking_id:12,p_for_rebooking:false}})
assert.match(response.headers.get("Cache-Control"),/private.*no-store/);assert.equal(response.headers.get("Vary"),"Cookie")
result={data:{success:true,status:"cancelled",alreadyCancelled:true,rebooking:{musicalId:"rent",name:"본인",studentId:"1203"}},error:null}
response=await run({action:"rebook"});assert.equal(response.status,200)
assert.equal(calls.at(-1).args.p_for_rebooking,true)
assert.equal((await response.json()).rebooking.name,"본인")
for(const [code,status] of [["NOT_FOUND",404],["INVALID_STATUS",409],["REBOOK_UNSUPPORTED",409],["BOOKING_CLOSED",403],["PRESALE_PERMISSION_REQUIRED",403],["PROFILE_INCOMPLETE",403],["BOOKING_PERIOD_UNAVAILABLE",503]]){
  result={data:{success:false,code},error:null};assert.equal((await run({action:"rebook"})).status,status)
}
for(const [nextRate,status] of [[{allowed:false},429],[{unavailable:true},503]]){rate=nextRate;assert.equal((await run()).status,status)}
rate={allowed:true};result={data:null,error:{code:"DOWN"}}
assert.equal((await run()).status,503)
// SQL review guards complement the live, ROLLBACK-only ownership and state tests.
const sql=readFileSync("database/changes/owned-reservation-cancellation-id-types.sql","utf8")
assert.match(sql,/WHERE id=\$1 AND user_id=\$2 FOR UPDATE/)
assert.match(sql,/LOCK TABLE public\.%I IN EXCLUSIVE MODE/)
assert.match(sql,/SECURITY INVOKER SET search_path=''/)
assert.doesNotMatch(sql,/DELETE FROM|TRUNCATE/i)
assert.ok(sql.indexOf("v_now := clock_timestamp()") < sql.indexOf("SET status=''cancelled''"),"Current period is checked before cancellation")
console.log("Reservation actions API: verified ownership binding, input/source allowlist, CSRF, private caching, rebooking permissions, idempotency, errors and rate limits passed.")
