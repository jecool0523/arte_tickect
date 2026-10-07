import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
const ts = require("typescript")
const compiled = ts.transpileModule(readFileSync("lib/profile-guide.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
function model() {
  const module = { exports: {} }
  new Function("module", "exports", compiled)(module, module.exports)
  return module.exports
}
const values = new Map()
const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
let guide = model()
assert.equal(guide.shouldShowProfileGuide(storage), true)
guide.dismissProfileGuide(storage)
assert.equal(guide.shouldShowProfileGuide(storage), false)
assert.equal(model().shouldShowProfileGuide(storage), false, "Dismissal survives reload")
assert.equal(model().shouldShowProfileGuide(null), true)
const blocked = { getItem() { throw new Error("Blocked") }, setItem() { throw new Error("Blocked") } }
guide = model()
assert.equal(guide.shouldShowProfileGuide(blocked), true)
assert.doesNotThrow(() => guide.dismissProfileGuide(blocked))
assert.equal(guide.shouldShowProfileGuide(blocked), false, "Blocked storage still suppresses during this session")
const page = readFileSync("app/profile/page.tsx", "utf8")
assert.equal((page.match(/<ProfileGuide \/>/g) ?? []).length, 3, "All three profile states include the guide")
const popup = readFileSync("components/layer-popup.tsx", "utf8")
for (const primitive of ["Root", "Portal", "Overlay", "Content", "Title", "Description", "Close", "Trigger"]) assert.ok(popup.includes(`Dialog.${primitive}`))
console.log("Profile guide first visit, persistent dismissal, blocked storage fallback and all profile states passed.")
