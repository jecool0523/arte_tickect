import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
const ts = require("typescript")
const React = require("react")
const { renderToStaticMarkup } = require("react-dom/server")
const root = process.cwd()
const cache = new Map()
function load(filename) {
  if (cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  cache.set(filename, module)
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  const localRequire = createRequire(filename)
  const resolve = (name) => {
    if (name === "next/navigation") return { useRouter: () => ({ replace() {}, refresh() {} }) }
    if (name === "@/hooks/use-toast") return { useToast: () => ({ toast() {} }) }
    if (name.startsWith("@/")) {
      const base = path.join(root, name.slice(2))
      const file = [base + ".ts", base + ".tsx"].find(existsSync)
      if (!file) throw new Error(`Missing test dependency ${name}`)
      return load(file)
    }
    return localRequire(name)
  }
  new Function("require", "module", "exports", compiled)(resolve, module, module.exports)
  return module.exports
}
const Form = load(path.join(root, "components/auth/profile-form.tsx")).default
const props = { initialUsername: "Alice123", initialDisplayName: "홍길동", initialStudentId: "1323", initialContactNumber: "01012345678", nextPath: "/profile" }
const html = renderToStaticMarkup(React.createElement(Form, props))
for (const id of ["username", "displayName", "studentId", "contactNumber"]) {
  assert.match(html, new RegExp(`<label[^>]*for="${id}"`))
  assert.match(html, new RegExp(`<input[^>]*id="${id}"[^>]*required`))
}
assert.ok(html.includes('value="Alice123"'))
assert.ok(html.includes("저장하고 시작하기"))
assert.ok(html.includes('aria-live="polite"'))
const locked = renderToStaticMarkup(React.createElement(Form, { ...props, identityLocked: true, nextPath: undefined }))
for (const id of ["displayName", "studentId"]) assert.match(locked, new RegExp(`<input[^>]*id="${id}"[^>]*readonly`))
assert.ok(locked.includes("저장하고 이전 예약 동기화"))
console.log("Profile form rendering, labels, required fields, defaults and locked identity passed.")
