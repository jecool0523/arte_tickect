import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
const ts = require("typescript")
const React = require("react")
const { renderToStaticMarkup } = require("react-dom/server")
function load(file, mocks) {
  const module = { exports: {} }
  const source = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText
  new Function("require", "module", "exports", source)(name => mocks[name] ?? require(name), module, module.exports)
  return module.exports
}

const LinkContext = React.createContext(null)
let pendingHref = null
const linkMock = {
  __esModule: true,
  default: ({ href, prefetch, children, ...props }) => React.createElement(LinkContext.Provider, { value: href },
    React.createElement("a", { href, "data-prefetch": prefetch === false ? "false" : "auto", ...props }, children)),
  useLinkStatus() {
    const href = React.useContext(LinkContext)
    assert.ok(href, "Pending status must be read inside Link")
    return { pending: href === pendingHref }
  },
}
const Nav = load("components/app-bottom-nav.tsx", {
  "next/link": linkMock, "@/lib/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
}).default
let html = renderToStaticMarkup(React.createElement(Nav, { active: "home" }))
assert.equal((html.match(/<a /g) ?? []).length, 4)
assert.match(html, /href="\/profile" data-prefetch="false"/)
assert.doesNotMatch(html, /이동 중/)
pendingHref = "/profile"
html = renderToStaticMarkup(React.createElement(Nav, { active: "home" }))
assert.match(html, /href="\/"[^>]*aria-current="page"/)
assert.match(html, /href="\/profile"[^>]*>[\s\S]*?이동 중/)
assert.equal((html.match(/이동 중/g) ?? []).length, 1)
assert.match(html, /motion-reduce:animate-none/)
pendingHref = "/performances"
html = renderToStaticMarkup(React.createElement(Nav, { active: "home" }))
assert.equal((html.match(/이동 중/g) ?? []).length, 1, "Latest transition alone is pending")
pendingHref = null
assert.doesNotMatch(renderToStaticMarkup(React.createElement(Nav, { active: "performances" })), /이동 중/)
const loadingMocks = { "@/components/app-bottom-nav": { __esModule: true, default: Nav } }
const LoadingShell = load("components/page-loading.tsx", loadingMocks).default
for (const file of ["app/loading.tsx", "app/performances/loading.tsx", "app/club/loading.tsx"]) {
  const Loading = load(file, { "@/components/page-loading": { __esModule: true, default: LoadingShell } }).default
  const shell = renderToStaticMarkup(React.createElement(Loading))
  assert.match(shell, /aria-busy="true"/)
  assert.match(shell, /불러오는 중/)
  assert.equal((shell.match(/<a /g) ?? []).length, 4, "Navigation stays usable while the page loads")
}

let reads = 0, rows = [], dbError = null, cacheOptions, cacheKeys
const cache = new Map()
const cacheMock = {
  unstable_cache(fn, keys, options) {
    cacheKeys = keys; cacheOptions = options
    return async () => {
      if (!cache.has(keys[0])) cache.set(keys[0], await fn())
      return cache.get(keys[0])
    }
  },
  revalidateTag(tag) { assert.equal(tag, cacheKeys[0]); cache.delete(tag) },
}
const settings = load("lib/performance-settings.ts", {})
const defaults = [{ id: "toctoc", title: "Original" }]
const live = load("lib/server/performances.ts", {
  "server-only": {}, "next/cache": cacheMock,
  "@/data/musicals": { getAllMusicals: () => defaults },
  "@/lib/performance-settings": settings,
  "@/lib/server/supabase-admin": { createServerClient: () => ({ from(table) {
    assert.equal(table, "performance_settings")
    return { select: async columns => {
      assert.equal(columns, "musical_id, details", "Only public presentation data is cached")
      reads++; return { data: rows, error: dbError }
    } }
  } }) },
})
assert.equal(cacheOptions.revalidate, 60)
assert.deepEqual(cacheOptions.tags, [cacheKeys[0]])
await live.getLiveMusicals(); await live.getLiveMusical("toctoc")
assert.equal(reads, 1, "Public requests reuse the settings cache")
await live.getLiveMusicals(true)
assert.equal(reads, 2, "Admin reads always bypass the cache")
const details = { title: "Updated", subtitle: "", genre: "연극", special: "", runtime: "1시간", ageRating: "전체", venue: "대강당", date: "2026년 10월 7일", time: "17시", synopsis: "줄거리", posterImage: "/toc-toc/poster.png" }
rows = [{ musical_id: "toctoc", details }]
assert.equal((await live.getLiveMusical("toctoc")).title, "Original")
live.invalidatePerformanceSettings()
assert.equal((await live.getLiveMusical("toctoc")).title, "Updated", "Admin save invalidation exposes the updated show")
live.invalidatePerformanceSettings(); dbError = { code: "test-unavailable" }
const originalError = console.error
try {
  console.error = () => {}
  assert.equal((await live.getLiveMusical("toctoc")).title, "Original", "DB failure preserves static fallback")
  await assert.rejects(live.getLiveMusicals(true), /unavailable/)
} finally { console.error = originalError }
assert.equal(cache.size, 0, "DB failures and fallback content are never cached")
dbError = null
assert.equal((await live.getLiveMusical("toctoc")).title, "Updated", "Recovery is visible without waiting for TTL")
console.log("Navigation pending/accessibility, loading boundaries, public-only cache, fresh admin reads, invalidation and failure recovery passed.")
