import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { checkSiteEnvironment } from "./sites-env.mjs"

const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test_value_not_a_real_key_123456",
  NEXT_PUBLIC_SITE_URL: "https://example.chatgpt.site",
}
const config = checkSiteEnvironment(env)
assert.throws(() => checkSiteEnvironment({ ...env, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY }))
assert.throws(() => checkSiteEnvironment({ ...env, SUPABASE_SERVICE_ROLE_KEY: "" }))
assert.throws(() => checkSiteEnvironment({ ...env, NEXT_PUBLIC_SITE_URL: "https://example.chatgpt.site/not-an-origin" }))

const source = readFileSync("worker/sites-entry.mjs", "utf8")
  .replace(/^import handler.*$/m, "")
  .replace(/^import builtPublicConfig.*$/m, "")
const mock = `const builtPublicConfig=${JSON.stringify(config)};const handler={fetch:async(request,env)=>new Response("ok",{headers:env.TEST_SET_COOKIE?{"Set-Cookie":"test=1"}:{"Cache-Control":"public, max-age=600"}})};`
const worker = (await import(`data:text/javascript,${encodeURIComponent(mock + source)}`)).default
for (const changes of [{ SUPABASE_SERVICE_ROLE_KEY: "" }, { NEXT_PUBLIC_SITE_URL: "https://other.chatgpt.site" }]) {
  const response = await worker.fetch(new Request("https://example.chatgpt.site/"), { ...env, ...changes }, {})
  assert.equal(response.status, 503)
  assert.equal(response.headers.get("Cache-Control"), "no-store")
}
for (const pathname of ["/profile", "/api/profile", "/auth/callback", "/login", "/admin", "/tickets/token", "/performances/rent/booking"]) {
  const response = await worker.fetch(new Request(`https://example.chatgpt.site${pathname}`), env, {})
  assert.match(response.headers.get("Cache-Control"), /private.*no-store/)
  assert.match(response.headers.get("Vary"), /Cookie/)
}
const publicResponse = await worker.fetch(new Request("https://example.chatgpt.site/"), env, {})
assert.match(publicResponse.headers.get("Cache-Control"), /public/)
const sessionResponse = await worker.fetch(new Request("https://example.chatgpt.site/", { headers: { Cookie: "sb-example-auth-token=test" } }), env, {})
assert.match(sessionResponse.headers.get("Cache-Control"), /private.*no-store/)
const setCookieResponse = await worker.fetch(new Request("https://example.chatgpt.site/"), { ...env, TEST_SET_COOKIE: true }, {})
assert.match(setCookieResponse.headers.get("Cache-Control"), /private.*no-store/)
console.log("Environment validation, maintenance fallback and private-cache regression checks passed.")
