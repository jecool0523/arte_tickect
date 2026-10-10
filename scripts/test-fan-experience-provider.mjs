import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
const ts = require("typescript")

let user = { id: "verified-user" }
let today = "2026-10-10"
let effect
const calls = []
const listeners = new Map()
let intervalCallback
const react = {
  createContext: value => ({ Provider: "Provider", value }),
  useContext: context => context.value,
  useEffect: (callback, deps) => { effect = { callback, deps } },
  useState: value => [value, next => { value = next }],
}
const mocks = {
  react,
  "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  "@/components/auth/auth-provider": { useAuth: () => ({ user }) },
  "@/lib/fan-experience": { koreaVisitDate: () => today },
}
const module = { exports: {} }
const source = ts.transpileModule(readFileSync("components/auth/fan-experience-provider.tsx", "utf8"), { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText
new Function("require", "module", "exports", "document", "window", "fetch", source)(
  name => mocks[name] ?? require(name), module, module.exports,
  { visibilityState: "visible", addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) },
  { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name), setInterval: fn => { intervalCallback = fn; return 1 }, clearInterval: () => {} },
  async (_url, options) => {
    calls.push(options)
    return { ok: true, json: async () => ({ experience: { visitDate: today, totalXp: 10 } }) }
  },
)
module.exports.FanExperienceProvider({ children: null })
assert.deepEqual(effect.deps, ["verified-user"], "Route changes cannot restart the provider")
effect.callback()
const flush = async () => { await Promise.resolve(); await new Promise(setImmediate) }
await flush()
assert.equal(calls.length, 1)
assert.equal(calls[0].method, "POST", "A signed-in visit is recorded once")
assert.equal(calls[0].body, "{}")

await listeners.get("arte-fan-activity-changed")()
await flush()
assert.equal(calls.length, 2)
assert.equal(calls[1].method, "GET", "Review and booking changes refresh totals without recording another visit")

await listeners.get("visibilitychange")()
await flush()
assert.equal(calls.length, 3)
assert.equal(calls[2].method, "GET", "Returning to the tab refreshes activity without awarding another visit")

today = "2026-10-11"
intervalCallback()
await flush()
assert.equal(calls.length, 4)
assert.equal(calls[3].method, "POST", "A new Korea calendar date records one new visit")
intervalCallback()
await flush()
assert.equal(calls.length, 4, "The minute timer does not repeat same-day API calls")
console.log("Fan experience provider: route-independent mount, one visit write per day, read-only activity refresh and no repeat polling passed.")
