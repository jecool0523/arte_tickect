import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
const require=createRequire(import.meta.url),ts=require("typescript"),root=process.cwd(),cache=new Map()
let active, hydrated=true, responseOk=true, responseError="예매 기간이 종료되었습니다.", mode="cancel"
const traffic=[],navigation=[],drafts=[],cleared=[],events=[]
const hooks={useState(initial){const h=active,i=h.cursor++;if(!h.slots[i])h.slots[i]={value:initial};return[h.slots[i].value,next=>{h.slots[i].value=typeof next==="function"?next(h.slots[i].value):next}]},useEffect(){},useRef(initial){const i=active.cursor++;return active.slots[i]??=( {current:initial} )}}
const jsx=(type,props)=>({type,props})
function load(file){if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module)
  const source=ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText
  new Function("require","module","exports",source)(name=>{
    if(name==="react")return hooks
    if(name==="react/jsx-runtime")return{jsx,jsxs:jsx}
    if(name==="@radix-ui/react-alert-dialog")return new Proxy({},{get:(_,key)=>`Dialog:${String(key)}`})
    if(name==="next/link")return{default:"Link"}
    if(name==="next/navigation")return{useRouter:()=>({push:p=>navigation.push(p),refresh:()=>navigation.push("refresh")})}
    if(name==="@/components/ui/button")return{Button:"Button"}
    if(name==="@/components/booking-draft-provider")return{useBookingDrafts:()=>({hydrated,updateDraft:(id,draft)=>drafts.push({id,draft}),getCompletion:()=>({ticket:{bookingId:12}}),clearCompletion:id=>cleared.push(id)})}
    if(name.startsWith("@/")){const base=path.join(root,name.slice(2));return load([base+".ts",base+".tsx"].find(existsSync))}
    return require(name)
  },module,module.exports);return module.exports}
const Component=load(path.join(root,"components/auth/reservation-actions.tsx")).default
const reservation={id:12,name:"본인",student_id:"1203",seat_grade:"VIP",selected_seats:["F1-VIP-R01-C01"],booking_date:"2026-10-08T00:00:00Z",status:"confirmed",sourceId:"rent",musicalTitle:"RENT"}
globalThis.window={dispatchEvent:e=>events.push(e.type)}
globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);traffic.push({url,method:options.method,body});return{ok:responseOk,json:async()=>responseOk?{success:true,status:"cancelled",rebooking:mode==="rebook"?{musicalId:"rent",name:"본인",studentId:"1203"}:null}:{error:responseError}}}
const harness=()=>({cursor:0,slots:[]})
const render=(h,row=reservation)=>{active=h;h.cursor=0;return Component({reservation:row,showTicketLink:true})}
const nodes=t=>!t||typeof t!=="object"?[]:[t,...[t.props?.children].flat(Infinity).flatMap(nodes)]
const text=t=>typeof t==="string"||typeof t==="number"?String(t):!t||typeof t!=="object"?"":[t.props?.children].flat(Infinity).map(text).join("")
const button=(tree,label)=>{const n=nodes(tree).find(n=>n.type==="Button"&&text(n)===label);assert.ok(n,label);return n}
const dialog=tree=>nodes(tree).find(n=>n.type==="Dialog:Root")
let focusReturns=0
const click=async node=>{node.props.onClick({currentTarget:{focus:()=>focusReturns++}});for(let i=0;i<20;i++)await Promise.resolve()}
let h=harness(),tree=render(h)
assert.equal(dialog(tree).props.open,false)
assert.ok(nodes(tree).some(n=>n.type==="Link"&&n.props.href==="/profile/bookings/rent/12"))
await click(button(tree,"예매 취소"));tree=render(h)
assert.equal(traffic.length,0,"Opening confirmation must not cancel")
assert.equal(dialog(tree).props.open,true)
assert.match(text(tree),/모든 좌석을 취소/)
dialog(tree).props.onOpenChange(false);tree=render(h)
nodes(tree).find(n=>n.type==="Dialog:Content").props.onCloseAutoFocus({preventDefault(){}})
assert.equal(focusReturns,1,"Dismissal restores keyboard focus to the opening button")
assert.equal(traffic.length,0,"Closing confirmation must not cancel")
await click(button(tree,"예매 취소"));tree=render(h)
await click(button(tree,"예매 취소하기"));tree=render(h)
assert.deepEqual(traffic.at(-1),{url:"/api/profile/bookings/rent/12",method:"PATCH",body:{action:"cancel"}})
assert.equal(dialog(tree).props.open,false)
assert.match(text(tree),/예매를 취소했습니다/)
assert.ok(!nodes(tree).some(n=>n.type==="Link"&&n.props.href?.includes("/profile/bookings/rent/12")),"Cancelled ticket link removed immediately")
assert.equal(cleared.at(-1),"rent");assert.equal(events.at(-1),"arte-fan-activity-changed")
assert.ok(button(tree,"재예매"))
mode="rebook";h=harness();tree=render(h)
await click(button(tree,"취소 후 재예매"));tree=render(h)
assert.match(text(tree),/기존 좌석은 보장되지 않습니다/)
assert.match(text(tree),/새 예매를 완료해야 티켓/)
await click(button(tree,"취소하고 재예매하기"))
assert.ok(navigation.includes("/performances/rent/booking"))
assert.equal(drafts.at(-1).draft.name,"본인");assert.equal(drafts.at(-1).draft.studentId,"1203")
assert.deepEqual(drafts.at(-1).draft.selectedSeats,[]);assert.equal(drafts.at(-1).draft.accessGranted,false)
assert.deepEqual(drafts.at(-1).draft.attendees,[])
responseOk=false;h=harness();tree=render(h)
await click(button(tree,"취소 후 재예매"));tree=render(h)
const beforeDrafts=drafts.length
await click(button(tree,"취소하고 재예매하기"));tree=render(h)
assert.match(text(tree),/예매 기간이 종료/);assert.equal(dialog(tree).props.open,true)
assert.equal(drafts.length,beforeDrafts,"Failed rebooking preserves the draft")
assert.ok(nodes(tree).some(n=>n.type==="Link"&&n.props.href==="/profile/bookings/rent/12"),"Failed rebooking preserves valid ticket")
tree=render(harness(),{...reservation,sourceId:"legacy"})
assert.ok(!nodes(tree).some(n=>n.type==="Button"&&text(n)==="취소 후 재예매"))
tree=render(harness(),{...reservation,sourceId:"legacy",status:"cancelled"})
assert.ok(nodes(tree).some(n=>n.type==="Link"&&n.props.href==="/performances"))
hydrated=false;tree=render(harness())
assert.equal(button(tree,"예매 취소").props.disabled,true)
console.log("Reservation UI: confirmation/dismissal, cancel success, ticket invalidation, fresh rebooking draft, seat warning, failure preservation, fan refresh, legacy handling and hydration passed.")
