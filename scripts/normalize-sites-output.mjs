import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"

export function normalizeSitesOutput(publicConfig) {
  // OpenNext's default env fallback includes all local .env values. The Site
  // must get privileged values only from encrypted runtime bindings instead.
  // Omit absent optional keys: an empty publishable key would mask the legacy
  // anon-key fallback in code that uses nullish coalescing.
  const fallback = Object.fromEntries(Object.entries(publicConfig).filter(([, value]) => value))
  writeFileSync(".open-next/cloudflare/next-env.mjs", ["production", "development", "test"]
    .map(mode => `export const ${mode} = ${JSON.stringify(fallback)};`).join("\n"))

  // Some patched Next versions still require the middleware manifest by a
  // computed filename. Workers have no .next filesystem: inline known JSON
  // manifests, and leave all other dynamic imports failing explicitly.
  const base = path.resolve(".open-next/server-functions/default/.next")
  const manifests = {}
  function collect(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name)
      if (entry.isDirectory()) collect(filename)
      else if (/(?:manifest|required-server-files|prefetch-hints)\.json$/.test(entry.name)) {
        manifests[`/.next/${path.relative(base, filename).split(path.sep).join("/")}`] = JSON.parse(readFileSync(filename, "utf8"))
      }
    }
  }
  collect(base)
  const filename = ".open-next/server-functions/default/handler.mjs"
  let code = readFileSync(filename, "utf8")
  code = code.replace(/\brequire\(this\.([\w$]*[Mm]anifestPath)\)/g, '__arteManifestForPath(this.$1)')
  const pattern = /var __require=[\s\S]*?;var __esm=/g
  const matches = [...code.matchAll(pattern)]
  if (matches.length !== 1) throw new Error("OpenNext dynamic loader changed; verify adapter compatibility before publishing")
  // Do not reference an unbound `require`: rebundling by Wrangler rewrites it
  // to its own throwing helper. Only Node built-ins and known manifests resolve.
  code = code.replace(pattern, 'var __require=function(filename){const manifest=__arteManifestForPath(filename);if(manifest!==undefined)return manifest;const builtin=__arteBuiltinProcess.getBuiltinModule(filename);if(builtin)return builtin;throw Error("Unsupported dynamic module: "+filename)};var __esm=')
  if (!code.includes('import __arteBuiltinProcess')) code = 'import __arteBuiltinProcess from "node:process";\n' + code
  const lookup = `\nfunction __arteManifestForPath(filename){if(typeof filename!=="string")return;const normalized=filename.replaceAll("\\\\","/");const manifests=${JSON.stringify(manifests)};const key=Object.keys(manifests).find(key=>normalized.endsWith(key));return key?manifests[key]:undefined;}\n`
  writeFileSync(filename, code + (code.includes("function __arteManifestForPath") ? "" : lookup))
}
