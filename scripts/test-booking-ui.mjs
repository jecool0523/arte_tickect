import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url), ts = require("typescript")
const root = process.cwd(), cache = new Map()
let active, context, fullscreenState
const listeners = new Map(), storage = new Map()
globalThis.window = { sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  requestAnimationFrame: () => 1, cancelAnimationFrame() {} }
globalThis.document = { fullscreenEnabled: true, fullscreenElement: null,
  addEventListener: (event, fn) => listeners.set(event, fn), removeEventListener: event => listeners.delete(event),
  async exitFullscreen() { this.fullscreenElement = null; listeners.get("fullscreenchange")?.() } }
const hooks = {
  createContext: () => ({ Provider: "FixtureProvider" }), useContext: () => context,
  useState(initial) {
    const h = active, i = h.cursor++
    if (!h.slots[i]) h.slots[i] = { value: typeof initial === "function" ? initial() : initial,
      set(next) { const value = typeof next === "function" ? next(h.slots[i].value) : next
        if (!Object.is(value, h.slots[i].value)) { h.slots[i].value = value; h.dirty = true; h.updates++ } } }
    return [h.slots[i].value, h.slots[i].set]
  },
  useRef(initial) { const i = active.cursor++; return active.slots[i] ??= { current: initial } },
  useEffect(fn, deps) { const i = active.cursor++, old = active.slots[i]
    if (!old || deps.some((value, k) => value !== old.deps[k])) {
      active.effects.push(() => { old?.cleanup?.(); active.slots[i] = { deps, cleanup: fn() } })
    } },
  useMemo(fn, deps) { const i = active.cursor++, old = active.slots[i]
    if (!old || deps.some((value, k) => value !== old.deps[k])) active.slots[i] = { deps, value: fn() }
    return active.slots[i].value },
  useCallback(fn, deps) { return hooks.useMemo(() => fn, deps) },
}
const jsx = (type, props) => { if (type === "FixtureProvider") context = props.value; return { type, props } }
function load(file) {
  if (cache.has(file)) return cache.get(file).exports
  const module = { exports: {} }; cache.set(file, module)
  const compiled = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function("require", "module", "exports", compiled)(name => {
    if (name === "react") return hooks
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx }
    if (name === "lucide-react") return new Proxy({}, { get: (_, key) => `Icon:${String(key)}` })
    if (name === "next/navigation") return { useRouter: () => ({ push: target => navigation.push(target), replace: target => navigation.push(target) }) }
    if (name === "@/hooks/use-toast") return { useToast: () => ({ toast() {} }) }
    if (name === "@/components/app-bottom-nav") return { default: "BottomNav" }
    if (name === "@/hooks/use-fullscreen" && file.endsWith("seat-selection-window.tsx")) return { useFullscreen: () => fullscreenState }
    if (name.startsWith("@/components/ui/")) return new Proxy({}, { get: (_, key) => `UI:${String(key)}` })
    if (name.startsWith("@/")) {
      const base = path.join(root, name.slice(2)), resolved = [base + ".ts", base + ".tsx"].find(existsSync)
      if (!resolved) throw new Error(`Missing ${name}`)
      return load(resolved)
    }
    return require(name)
  }, module, module.exports)
  return module.exports
}
const harness = () => ({ slots: [], cursor: 0, effects: [], dirty: false, updates: 0 })
function render(h, fn, runEffects = true) { active = h; h.cursor = 0; h.effects = []; h.dirty = false; const tree = fn()
  if (runEffects) for (const effect of h.effects) effect(); return tree }
function nodes(tree) { if (!tree || typeof tree !== "object") return []
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)] }
const text = tree => typeof tree === "string" || typeof tree === "number" ? String(tree)
  : !tree || typeof tree !== "object" ? "" : [tree.props?.children].flat(Infinity).map(text).join("")
const find = (tree, test) => { const node = nodes(tree).find(test); assert.ok(node, "Expected control exists"); return node }
const draftLib = load(path.join(root, "lib/booking-draft.ts"))
const Provider = load(path.join(root, "components/booking-draft-provider.tsx")).BookingDraftProvider
const Form = load(path.join(root, "components/booking-form.tsx")).default
const provider = harness(), form = harness()
render(provider, () => Provider({ children: null }))
render(provider, () => Provider({ children: null }))
context.updateDraft("rent", { seatGrade: "VIP", selectedSeats: ["F1-VIP-R01-L01", "F1-VIP-R01-L02"], accessGranted: true })
const callbacks = { onInputChange: (field, value) => context.updateDraft("rent", { [field]: value }),
  onAttendeesChange: attendees => context.updateDraft("rent", { attendees }), onUserMemoChange() {},
  onNavigateToSeatSelection: () => navigation.push("seats"), onBack: () => navigation.push("detail"), onSubmit() {} }
const navigation = []
function settle() { let tree
  for (let pass = 0; pass < 15; pass++) {
    render(provider, () => Provider({ children: null }))
    const draft = context.getDraft("rent")
    tree = render(form, () => Form({ musicalInfo: { title: "fixture", genre: "뮤지컬" }, bookingData: draft,
      selectedSeats: draft.selectedSeats, attendees: draft.attendees, userMemo: draft.userMemo, ...callbacks, isSubmitting: false }))
    if (!provider.dirty && !form.dirty) return tree
  }
  assert.fail("Booking form did not settle: effect loop returned")
}
let tree = settle()
assert.equal(context.getDraft("rent").attendees.length, 2)
context.updateDraft("rent", { attendees: [{ name: "대표", studentId: "1234" }, { name: "동반", studentId: "1235" }], userMemo: "요청" })
tree = settle()
assert.equal(context.getDraft("rent").name, "대표")
assert.equal(context.getDraft("rent").studentId, "1234")
assert.match(context.getDraft("rent").specialRequest, /요청[\s\S]*대표[\s\S]*동반/)
const previous = context.getDraft("rent"), count = provider.updates
context.updateDraft("rent", { name: "대표" })
assert.equal(provider.updates, count, "No-op preserves state")
render(provider, () => Provider({ children: null }))
assert.equal(context.getDraft("rent"), previous, "No-op preserves array references")
assert.equal(draftLib.isSameBookingDraft(previous, { ...previous, name: "다름" }), false)
find(tree, node => node.type === "UI:Button" && text(node).includes("좌석 변경")).props.onClick()
find(tree, node => node.type === "UI:Button" && node.props.onClick === callbacks.onBack).props.onClick()
assert.deepEqual(navigation, ["seats", "detail"])
assert.ok(nodes(tree).some(node => node.type === "BottomNav"), "Booking navigation remains outside form")

const seat = { id: "F1-VIP-R01-L01", grade: "VIP", floor: "1층" }
const seatMap = load(path.join(root, "lib/seat-map.ts"))
const Window = load(path.join(root, "components/seat-selection-window.tsx")).default
let clicked = [], clearCalls = 0, fullscreenCalls = 0
fullscreenState = { containerRef: { current: null }, isFullscreen: false, isSupported: true, isPending: false, error: "", toggleFullscreen: () => fullscreenCalls++ }
const seatProps = { seatGrades: [], selectedSeats: [seat.id, "F1-VIP-R01-L02"], onSeatClick: (...args) => clicked.push(args),
  onClearSeats: () => { clearCalls++; context.updateDraft("rent", current => ({ ...current, selectedSeats: [], seatGrade: "", attendees: [], name: "", studentId: "", specialRequest: current.userMemo })) },
  unavailableSeats: {}, statistics: { total_bookings: 0, total_seats_booked: 0, unique_students: 0 }, connectionStatus: "connected", selectedSeatGrade: "VIP", onBack() {}, onConfirm() {}, musicalTitle: "fixture" }
const seatHarness = harness()
tree = render(seatHarness, () => Window(seatProps))
find(tree, node => node.type === "button" && node.props.title?.includes("선택됨")).props.onClick()
assert.deepEqual(clicked, [[seat.id, "VIP"]], "Selected seat is clickable to deselect")
find(tree, node => node.type === "button" && node.props["aria-label"] === `${seatMap.getSeatDisplayLabel(seat.id)} 선택 해제`).props.onClick()
assert.equal(clicked.length, 2, "Selected badge removes individual seat")
find(tree, node => node.type === "UI:Button" && text(node).includes("전체 해제")).props.onClick()
assert.equal(clearCalls, 1, "Clear all calls one atomic callback")
settle(); assert.deepEqual(context.getDraft("rent").selectedSeats, []); assert.equal(context.getDraft("rent").seatGrade, "")
find(tree, node => node.props?.["aria-label"] === "전체 화면").props.onClick()
assert.equal(fullscreenCalls, 1)
fullscreenState.isFullscreen = true
tree = render(seatHarness, () => Window(seatProps))
assert.equal(find(tree, node => node.props?.["aria-label"] === "전체 화면 종료").props["aria-pressed"], true)
assert.ok(nodes(tree).some(node => node.type === "Icon:Minimize2"))
tree = render(seatHarness, () => Window({ ...seatProps, unavailableSeats: { "1층": { VIP: [seat.id] } } }))
const unavailable = find(tree, node => node.type === "button" && node.props.title?.includes("예매 완료"))
assert.equal(unavailable.props.disabled, true); unavailable.props.onClick(); assert.equal(clicked.length, 2)

const SeatRoute = load(path.join(root, "components/seat-selection-route-page.tsx")).default
context.updateDraft("rent", { selectedSeats: [seat.id, "F1-VIP-R01-L02", "F1-VIP-R01-L03"], seatGrade: "VIP",
  attendees: [{ name: "첫째", studentId: "1" }, { name: "둘째", studentId: "2" }, { name: "셋째", studentId: "3" }] })
render(provider, () => Provider({ children: null }))
const routeHarness = harness()
tree = render(routeHarness, () => SeatRoute({ musical: { id: "rent", title: "fixture", seatGrades: [] } }), false)
tree.props.onSeatClick("F1-VIP-R01-L02", "VIP")
render(provider, () => Provider({ children: null }))
assert.deepEqual(context.getDraft("rent").attendees.map(attendee => attendee.name), ["첫째", "셋째"], "Seat removal preserves attendee/seat pairing")
// Two updates before a render must read the latest draft, not a captured array.
tree.props.onSeatClick(seat.id, "VIP"); tree.props.onSeatClick("F1-VIP-R01-L03", "VIP")
render(provider, () => Provider({ children: null }))
assert.deepEqual(context.getDraft("rent").selectedSeats, [])
context.updateDraft("rent", { selectedSeats: [seat.id, "F1-VIP-R01-L02"], seatGrade: "VIP" })
render(provider, () => Provider({ children: null }))
tree = render(routeHarness, () => SeatRoute({ musical: { id: "rent", title: "fixture", seatGrades: [] } }), false)
tree.props.onClearSeats(); settle()
assert.deepEqual(context.getDraft("rent").selectedSeats, []); assert.deepEqual(context.getDraft("rent").attendees, [])
assert.equal(context.getDraft("rent").name, ""); assert.equal(context.getDraft("rent").specialRequest, "요청")

// The account quota is fetched independently of the device-local draft.
let quota = { success: true, isOpen: true, presale: true, presaleLimit: 2, presaleRemaining: 2 }
window.setInterval = () => 1; window.clearInterval = () => {}
globalThis.fetch = async url => ({ ok: true, json: async () => url.includes("booking-period") ? quota : { success: true, unavailableSeats: {}, statistics: {} } })
const quotaHarness = harness()
tree = render(quotaHarness, () => SeatRoute({ musical: { id: "rent", title: "fixture", seatGrades: [] } }))
tree.props.onSeatClick(seat.id,"VIP")
render(provider, () => Provider({ children: null }))
assert.equal(context.getDraft("rent").selectedSeats.length,0,"Selection waits for account quota")
await new Promise(setImmediate)
tree = render(quotaHarness, () => SeatRoute({ musical: { id: "rent", title: "fixture", seatGrades: [] } }),false)
tree.props.onSeatClick(seat.id,"VIP"); tree.props.onSeatClick("F1-VIP-R01-L02","VIP"); tree.props.onSeatClick("F1-VIP-R01-L03","VIP")
render(provider, () => Provider({ children: null }))
assert.equal(context.getDraft("rent").selectedSeats.length,2,"Rapid selections cannot exceed member quota")
tree = render(quotaHarness, () => SeatRoute({ musical: { id: "rent", title: "fixture", seatGrades: [] } }),false)
tree.props.onSeatClick(seat.id,"VIP")
render(provider, () => Provider({ children: null }))
assert.equal(context.getDraft("rent").selectedSeats.length,1,"Deselecting remains available at quota")
quota = { success:true,isOpen:false,presale:true,presaleRemaining:0 }
render(harness(), () => SeatRoute({ musical: { id: "rent", title: "fixture", seatGrades: [] } }))
await new Promise(setImmediate)
assert.equal(navigation.at(-1),"/performances/rent/booking","Exhausted account returns to booking explanation")

const Fullscreen = load(path.join(root, "hooks/use-fullscreen.ts")).useFullscreen, fh = harness()
let api = render(fh, Fullscreen), requests = 0
const element = { async requestFullscreen() { requests++; document.fullscreenElement = element; listeners.get("fullscreenchange")?.() } }
api.containerRef.current = element
// Mount the effect after the ref has been attached, as React does after DOM commit.
fh.slots[5] = undefined
api = render(fh, Fullscreen); api = render(fh, Fullscreen)
assert.equal(api.isSupported, true)
await api.toggleFullscreen(); api = render(fh, Fullscreen)
assert.equal(requests, 1); assert.equal(api.isFullscreen, true)
await api.toggleFullscreen(); api = render(fh, Fullscreen); assert.equal(api.isFullscreen, false)
await api.toggleFullscreen(); document.fullscreenElement = null; listeners.get("fullscreenchange")()
api = render(fh, Fullscreen); assert.equal(api.isFullscreen, false, "Escape updates fullscreen state")
element.requestFullscreen = async () => { throw new Error("denied") }
await api.toggleFullscreen(); api = render(fh, Fullscreen); assert.match(api.error, /전환하지 못했습니다/); assert.equal(api.isPending, false)
document.fullscreenEnabled = false
const unsupportedHarness = harness()
render(unsupportedHarness, Fullscreen); const unsupported = render(unsupportedHarness, Fullscreen)
assert.equal(unsupported.isSupported, false); await unsupported.toggleFullscreen(); assert.equal(requests, 2)
for (const h of [fh, unsupportedHarness]) for (const slot of h.slots) slot?.cleanup?.()
console.log("Booking UI: effects settle, no-op identity, back/change controls, atomic clear, seat/badge removal, reserved seats and fullscreen enter/exit/Escape/failure/unsupported passed.")
