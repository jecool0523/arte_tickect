import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { Script } from "node:vm"
const require = createRequire(import.meta.url)
const ts = require("typescript")
const source = ts.transpileModule(readFileSync("lib/profile.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const exports = {}
new Script(source).runInNewContext({ exports, require, URL })
const { defaultUsername, profileInputSchema, safeProfileNext, isProfileComplete } = exports
assert.equal(defaultUsername("Alice123@example.com"), "Alice123")
assert.equal(defaultUsername("a.b+12@example.org"), "ab12")
assert.equal(defaultUsername(null), "")
const valid = { username: "Alice123", displayName: " 홍길동 ", studentId: "1323", contactNumber: "010-1234-5678" }
assert.equal(profileInputSchema.parse(valid).contactNumber, "01012345678")
assert.equal(profileInputSchema.parse(valid).displayName, "홍길동")
for (const field of Object.keys(valid)) assert.equal(profileInputSchema.safeParse({ ...valid, [field]: "" }).success, false)
assert.equal(profileInputSchema.safeParse({ ...valid, username: "bad.id" }).success, false)
assert.equal(profileInputSchema.safeParse({ ...valid, contactNumber: "not-a-phone" }).success, false)
assert.equal(profileInputSchema.safeParse({ ...valid, userId: "someone-else" }).success, false)
assert.equal(profileInputSchema.safeParse({ ...valid, contactNumber: "+82 (10) 1234-5678" }).success, true)
for (const value of ["https://evil.invalid", "//evil.invalid", "/\\evil.invalid", "/profile/setup", "/auth/callback"]) assert.equal(safeProfileNext(value), "/profile")
assert.equal(safeProfileNext("/performances/rent/booking?step=1"), "/performances/rent/booking?step=1")
assert.equal(isProfileComplete(null), false)
assert.equal(isProfileComplete({ username: "Alice123", display_name: "홍길동", student_id: "1323", contact_number: "01012345678", profile_completed_at: "2026-10-06" }), true)
console.log("Profile defaults, required fields, normalization and safe onboarding redirects passed.")
