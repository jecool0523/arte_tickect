import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
const require=createRequire(import.meta.url),ts=require("typescript")
let active, calls=[], failWrite=false, page={success:true,total:0,inquiries:[]}
const hooks={
  useState(initial){const h=active,i=h.cursor++;h.slots[i]??={value:initial,set(value){h.slots[i].value=typeof value==="function"?value(h.slots[i].value):value}};return [h.slots[i].value,h.slots[i].set]},
  useRef(value){const h=active,i=h.cursor++;return h.slots[i]??={current:value}},
  useCallback(fn,deps){const h=active,i=h.cursor++,old=h.slots[i];if(!old||deps.some((v,k)=>v!==old.deps[k]))h.slots[i]={value:fn,deps};return h.slots[i].value},
  useEffect(fn,deps){const h=active,i=h.cursor++,old=h.slots[i];if(!old||deps.some((v,k)=>v!==old.deps[k]))h.effects.push(()=>{old?.cleanup?.();h.slots[i]={deps,cleanup:fn()}})},
}
const jsx=(type,props)=>({type,props}),module={exports:{}}
const src=readFileSync("components/auth/support-inquiries.tsx","utf8")
const compiled=ts.transpileModule(src,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
new Function("require","module","exports",compiled)(name=>name==="react"?hooks:name==="react/jsx-runtime"?{jsx,jsxs:jsx}:name==="next/link"?{default:"Link"}:name==="lucide-react"?{MessageCircle:"Icon"}:new Proxy({},{get:(_,key)=>`UI:${key}`}),module,module.exports)
const Component=module.exports.default,harness=()=>({slots:[],cursor:0,effects:[]})
function render(h,props={}){active=h;h.cursor=0;h.effects=[];const tree=Component(props);for(const fn of h.effects)fn();return tree}
const nodes=t=>!t||typeof t!=="object"?[]:[t,...[t.props?.children].flat(Infinity).flatMap(nodes)]
const text=t=>typeof t==="string"||typeof t==="number"?String(t):!t||typeof t!=="object"?"":[t.props?.children].flat(Infinity).map(text).join("")
const find=(t,fn)=>{const value=nodes(t).find(fn);assert.ok(value,"Control exists");return value}
const tick=()=>new Promise(setImmediate)
globalThis.fetch=async (url,options={})=>{calls.push({url,...options});if(options.method&&failWrite)return {ok:false,json:async()=>({success:false,error:"저장 실패"})};return {ok:true,json:async()=>options.method?{success:true}:page}}
const compact=harness()
let tree=render(compact,{compact:true})
assert.equal(calls.length,0,"Compact profile does not load entire history")
assert.match(text(tree),/관리자에게 문의/)
assert.equal(find(tree,n=>n.type==="Link").props.href,"/profile/inquiries")
find(tree,n=>n.type==="UI:Textarea").props.onChange({target:{value:"예약을 확인해주세요"}})
tree=render(compact,{compact:true})
failWrite=true
find(tree,n=>n.type==="form").props.onSubmit({preventDefault(){}})
find(tree,n=>n.type==="form").props.onSubmit({preventDefault(){}})
await tick();tree=render(compact,{compact:true})
assert.equal(calls.length,1,"Rapid submit does not create two requests")
const retryKey=JSON.parse(calls[0].body).requestKey
assert.equal(find(tree,n=>n.type==="UI:Textarea").props.value,"예약을 확인해주세요","Failure preserves text")
assert.match(text(tree),/저장 실패/)
failWrite=false
find(tree,n=>n.type==="form").props.onSubmit({preventDefault(){}})
await tick();tree=render(compact,{compact:true})
assert.equal(JSON.parse(calls[1].body).requestKey,retryKey,"Ambiguous retry reuses idempotency key")
assert.equal(find(tree,n=>n.type==="UI:Textarea").props.value,"")
assert.match(text(tree),/문의를 접수했습니다/)

const inquiry={id:"00000000-0000-4000-8000-000000000001",content:"예약 문의 <script>alert(1)</script>",createdAt:"2026-10-08T00:00:00Z",reply:null,repliedAt:null,displayName:"테스트",studentId:"9901"}
page={success:true,total:21,inquiries:[inquiry]}
const owner=harness();render(owner);await tick();tree=render(owner)
assert.match(text(tree),/답변 대기/)
assert.ok(!nodes(tree).some(n=>n.type==="script"||n.props.dangerouslySetInnerHTML),"Inquiry is rendered only as text")
const next=find(tree,n=>n.type==="UI:Button"&&text(n)==="다음")
assert.equal(next.props.disabled,false);next.props.onClick();await tick();tree=render(owner)
assert.match(calls.at(-1).url,/offset=20/)
assert.equal(find(tree,n=>n.type==="UI:Button"&&text(n)==="이전").props.disabled,false)

const admin=harness();render(admin,{admin:true});await tick();tree=render(admin,{admin:true})
assert.match(text(tree),/문의자: 테스트/)
assert.equal(nodes(tree).filter(n=>n.type==="form").length,1,"Admin only has reply form")
find(tree,n=>n.type==="UI:Textarea").props.onChange({target:{value:"관리자 답변"}})
tree=render(admin,{admin:true});failWrite=true
find(tree,n=>n.type==="form").props.onSubmit({preventDefault(){}})
await tick();tree=render(admin,{admin:true})
assert.equal(find(tree,n=>n.type==="UI:Textarea").props.value,"관리자 답변","Reply failure preserves draft")
failWrite=false;page={success:true,total:1,inquiries:[{...inquiry,reply:"관리자 답변",repliedAt:"2026-10-08T01:00:00Z"}]}
find(tree,n=>n.type==="form").props.onSubmit({preventDefault(){}})
await tick();tree=render(admin,{admin:true})
const sent=calls.findLast(c=>c.method==="PATCH")
assert.deepEqual(JSON.parse(sent.body),{inquiryId:inquiry.id,reply:"관리자 답변"})
assert.match(text(tree),/답변 완료/);assert.match(text(tree),/관리자 답변/)
assert.equal(nodes(tree).filter(n=>n.type==="form").length,0,"Answered inquiry cannot be overwritten")
tree=render(owner);find(tree,n=>n.type==="UI:Button"&&text(n)==="새로고침").props.onClick()
await tick()
tree=render(owner);assert.match(text(tree),/답변 완료/);assert.match(text(tree),/관리자 답변/)
const profile=readFileSync("app/profile/page.tsx","utf8"),dashboard=readFileSync("components/admin/admin-dashboard.tsx","utf8")
assert.ok(profile.lastIndexOf("<SupportInquiries compact")>profile.indexOf("<AccountDeleteButton"),"Contact is at the bottom of profile")
assert.match(dashboard,/<TabsContent value="inquiries"><SupportInquiries admin/)
console.log("Support UI: profile entry, private history, safe text, pending/answered states, duplicate-click guard, retry key, failure preservation, reply and pagination passed.")
