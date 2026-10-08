import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
const require = createRequire(import.meta.url), ts = require("typescript")
const root = process.cwd(), cache = new Map(), navigation = [], traffic = []
let active, confirmation = true, reviewStatus = 200
const hooks = {
  useState(initial) {
    const h = active, i = h.cursor++
    if (!h.slots[i]) h.slots[i] = { value: initial }
    return [h.slots[i].value, next => { h.slots[i].value = typeof next === "function" ? next(h.slots[i].value) : next }]
  },
  useEffect() {}, useCallback: fn => fn,
}
const jsx = (type, props) => ({ type, props })
function load(file) {
  if (cache.has(file)) return cache.get(file).exports
  const module = { exports: {} }; cache.set(file,module)
  const source = ts.transpileModule(readFileSync(file,"utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function("require","module","exports",source)(name => {
    if (name === "react") return hooks
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx }
    if (name === "next/navigation") return { useRouter: () => ({ replace: next => navigation.push(next), refresh() {} }) }
    if (name === "@/hooks/use-toast") return { useToast: () => ({ toast() {} }) }
    if (name === "lucide-react" || name.startsWith("@/components/ui/")) return new Proxy({}, { get: (_,key) => `UI:${String(key)}` })
    if (name.startsWith("@/")) {
      const base = path.join(root,name.slice(2))
      return load([base+".ts",base+".tsx"].find(existsSync))
    }
    return require(name)
  },module,module.exports)
  return module.exports
}
const harness = values => ({ cursor: 0, slots: values.map(value => ({value})) })
const render = (h,fn) => { active=h; h.cursor=0; return fn() }
const nodes = tree => !tree || typeof tree !== "object" ? [] : [tree,...[tree.props?.children].flat(Infinity).flatMap(nodes)]
const text = tree => typeof tree === "string" || typeof tree === "number" ? String(tree) : !tree || typeof tree !== "object" ? "" : [tree.props?.children].flat(Infinity).map(text).join("")
const button = (tree,label) => { const match=nodes(tree).find(node=>node.type === "UI:Button" && text(node) === label); assert.ok(match,label); return match }
const click = async control => { control.props.onClick(); for (let i=0;i<20;i++) await Promise.resolve() }
globalThis.window = { confirm: () => confirmation }
globalThis.fetch = async (url, options = {}) => {
  const body = options.body ? JSON.parse(options.body) : undefined
  traffic.push({url,method:options.method||"GET",body})
  if (url === "/api/admin/member-requests" && options.method === "PATCH") return { ok:reviewStatus===200,json:async()=>reviewStatus===200?{success:true}:{error:"이미 처리된 요청입니다."} }
  if (url === "/api/admin/member-requests") return {ok:true,json:async()=>({requests:[],total:0})}
  if (url === "/api/profile/arte-membership") return {ok:true,json:async()=>({state:{eligible:true,status:body?.isMember ? "pending" : "declined"}})}
  if (url === "/api/profile") return {ok:true,json:async()=>({success:true,linkedCount:0})}
  throw new Error(`Unexpected fetch ${url}`)
}
const Manager = load(path.join(root,"components/admin/member-request-manager.tsx")).default
const row = { id:"request-1",email:"member@example.invalid",displayName:"박동우",studentId:"9911",requestedAt:"2026-10-08T02:00:00Z",manualStudentCheck:true,profileUnchanged:true,alreadyAdmin:false }
const admin = harness([[row],1,false,null,{},"",""])
let tree=render(admin,Manager)
assert.match(text(tree),/명단에 학번이 없는 부원/)
assert.equal(button(tree,"승인").props.disabled,true)
await click(button(tree,"승인"))
assert.equal(traffic.length,0,"Cannot approve before explicit identity confirmation")
const checkbox=nodes(tree).find(node=>node.type === "input" && node.props.type === "checkbox")
checkbox.props.onChange({target:{checked:true}})
tree=render(admin,Manager)
assert.equal(button(tree,"승인").props.disabled,false)
confirmation=false
await click(button(tree,"승인"))
assert.equal(traffic.length,0,"Cancelling approval confirmation sends no mutation")
confirmation=true
await click(button(tree,"승인"))
assert.deepEqual(traffic[0],{url:"/api/admin/member-requests",method:"PATCH",body:{requestId:"request-1",approve:true,identityConfirmed:true}})
tree=render(admin,Manager)
assert.match(text(tree),/해당 계정에 관리자 권한을 부여했습니다/)
assert.match(text(tree),/대기 중인 승인 요청이 없습니다/)
const stale=harness([[{...row,profileUnchanged:false}],1,false,null,{[row.id]:true},"",""])
tree=render(stale,Manager)
assert.equal(button(tree,"승인").props.disabled,true)
assert.match(text(tree),/계정 정보가 변경되어 승인할 수 없습니다/)
const before=traffic.length
await click(button(tree,"승인"))
assert.equal(traffic.length,before,"Stale profile is also blocked in the handler")
await click(button(tree,"거절"))
assert.equal(traffic.at(-2).body.approve,false,"Stale request can still be rejected")
const conflict=harness([[row],1,false,null,{[row.id]:true},"",""])
tree=render(conflict,Manager); reviewStatus=409
await click(button(tree,"승인"))
tree=render(conflict,Manager)
assert.match(text(tree),/이미 처리된 요청입니다/)
assert.match(text(tree),/박동우/)
const Card=load(path.join(root,"components/auth/arte-membership-card.tsx")).default
const card=harness([]), props={initialState:{eligible:true,status:"unanswered"},nextPath:"/performances/rent/booking"}
tree=render(card,()=>Card(props))
assert.match(text(tree),/아르떼 부원인가요/)
await click(button(tree,"네, 승인 요청하기"))
assert.deepEqual(traffic.at(-1).body,{isMember:true},"No username or target UID in the request")
assert.equal(navigation.at(-1),"/performances/rent/booking")
tree=render(card,()=>Card(props))
assert.match(text(tree),/승인 대기 중/)
const declined=harness([])
tree=render(declined,()=>Card({initialState:{eligible:true,status:"unanswered"}}))
await click(button(tree,"아니요"))
tree=render(declined,()=>Card({initialState:{eligible:true,status:"unanswered"}}))
assert.match(text(tree),/부원이 아니라는 응답을 저장/)
const Form=load(path.join(root,"components/auth/profile-form.tsx")).default, form=harness([])
tree=render(form,()=>Form({initialUsername:"Member1",initialDisplayName:"김예성",initialStudentId:"1203",initialContactNumber:"01000000000",nextPath:"/performances/rent/booking"}))
await tree.props.onSubmit({preventDefault(){}})
assert.equal(navigation.at(-1),"/profile/membership?next=%2Fperformances%2Frent%2Fbooking")
console.log("Member UI: explicit identity checkbox, confirmation/cancel, approval/rejection, name-only/stale warnings, failures, user answers and preserved booking onboarding passed.")
