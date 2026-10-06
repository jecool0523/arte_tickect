import handler from "../.open-next/worker.js"
import builtPublicConfig from "../.sites-runtime/public-build-env.mjs"

function invalidSettings(env) {
  return Object.entries(builtPublicConfig).filter(([key, value]) => (env[key] || "") !== value).map(([key]) => key)
}

export default {
  async fetch(request, env, ctx) {
    const missing = invalidSettings(env)
    if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY")
    if (missing.length) {
      console.error("Site environment is incomplete or differs from this build", { keys: missing })
      return new Response("서비스 설정을 확인하고 있습니다. 잠시 후 다시 접속해 주세요.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "60" },
      })
    }

    const response = await handler.fetch(request, env, ctx)
    const pathname = new URL(request.url).pathname
    const privateRoute = /^\/(?:api|auth|login|profile|account|admin|tickets)(?:\/|$)/.test(pathname) || pathname.includes("/booking")
    const hasSession = /(?:^|;\s*)sb-[^=]+=/.test(request.headers.get("Cookie") || "")
    if (privateRoute || hasSession || response.headers.has("Set-Cookie")) {
      const headers = new Headers(response.headers)
      headers.set("Cache-Control", "private, no-store, max-age=0")
      const vary = headers.get("Vary") || ""
      if (!vary.split(",").some(value => value.trim().toLowerCase() === "cookie")) {
        headers.set("Vary", vary ? `${vary}, Cookie` : "Cookie")
      }
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
    }
    return response
  },
}
