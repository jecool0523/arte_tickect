import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache"

// Public pages use build-time assets; identity-aware routes remain dynamic.
// No R2, Durable Objects, or service-to-self binding is needed for this app.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: false,
})
