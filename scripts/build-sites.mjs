import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { spawn } from "node:child_process"
import { pathToFileURL } from "node:url"
import { normalizeSitesOutput } from "./normalize-sites-output.mjs"
import { checkSiteEnvironment, checkSupabaseConnection, loadSiteEnvironment } from "./sites-env.mjs"

const require = createRequire(import.meta.url)
const root = process.cwd()
const output = path.resolve(root, "dist")
const runtime = path.resolve(root, ".sites-runtime")

function packageBin(name, binary) {
  let directory = path.dirname(require.resolve(name))
  while (directory !== path.dirname(directory)) {
    const file = path.join(directory, "package.json")
    if (existsSync(file)) {
      const manifest = JSON.parse(readFileSync(file, "utf8"))
      if (manifest.name === name) return path.join(directory, typeof manifest.bin === "string" ? manifest.bin : manifest.bin[binary])
    }
    directory = path.dirname(directory)
  }
  throw new Error(`Cannot locate ${binary}`)
}

async function run(binary, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [binary, ...args], { stdio: "inherit", env: process.env })
    child.on("error", reject)
    child.on("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`Site build failed (${signal || code})`)))
  })
}

function scanPublicAssets(directory, secrets) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) scanPublicAssets(filename, secrets)
    else {
      const contents = readFileSync(filename)
      if (secrets.some(secret => contents.includes(Buffer.from(secret)))) {
        throw new Error(`Server-only secret found in a public asset: ${path.relative(root, filename)}`)
      }
    }
  }
}

try {
  loadSiteEnvironment()
  const publicConfig = checkSiteEnvironment()
  const manifest = JSON.parse(readFileSync(".openai/hosting.json", "utf8"))
  if (!manifest.project_id || manifest.static) throw new Error("Sites requires a registered Worker deployment, not a static export")
  console.log(JSON.stringify(await checkSupabaseConnection()))
  mkdirSync(runtime, { recursive: true })
  const publicSnapshot = `export default ${JSON.stringify(publicConfig)};\n`
  if (process.argv.includes("--skip-adapter-build") && readFileSync(path.join(runtime, "public-build-env.mjs"), "utf8") !== publicSnapshot) {
    throw new Error("Cannot reuse an adapter build with different public variables")
  }
  writeFileSync(path.join(runtime, "public-build-env.mjs"), publicSnapshot)

  process.env.WRANGLER_SEND_METRICS = "false"
  process.env.WRANGLER_LOG_PATH = path.join(runtime, "wrangler-logs")
  process.env.CLOUDFLARE_CF_FETCH_ENABLED = "false"
  process.env.ARTE_DEPLOY_TARGET = "sites"
  if (process.platform === "win32") {
    const hook = pathToFileURL(path.join(root, "scripts/windows-build-links.mjs")).href
    process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ""} --import=${hook}`.trim()
  }
  if (!process.argv.includes("--skip-adapter-build")) {
    let skipNextBuild = process.argv.includes("--skip-next-build")
    if (process.platform === "win32" && !skipNextBuild) {
      // Next creates forward-referencing directory symlinks while tracing.
      // Run the adapter in a fresh process after Next finishes so our hook can
      // repair those generated links before esbuild reads the standalone tree.
      process.env.NEXT_PRIVATE_STANDALONE = "true"
      process.env.NEXT_PRIVATE_OUTPUT_TRACE_ROOT = root
      await run(packageBin("next", "next"), ["build"])
      skipNextBuild = true
    }
    await run(packageBin("@opennextjs/cloudflare", "opennextjs-cloudflare"), ["build", ...(skipNextBuild ? ["--skipNextBuild"] : [])])
  }
  normalizeSitesOutput(publicConfig)
  await run(packageBin("@opennextjs/cloudflare", "opennextjs-cloudflare"), ["populateCache", "local"])

  // Delete only this script's generated directory inside the checked project root.
  if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== "dist") throw new Error("Unsafe build destination")
  rmSync(output, { recursive: true, force: true })
  await run(packageBin("wrangler", "wrangler"), ["deploy", "--dry-run", "--outdir", path.join(output, "server")])
  cpSync(".open-next/assets", path.join(output, "client"), { recursive: true })
  mkdirSync(path.join(output, ".openai"), { recursive: true })
  cpSync(".openai/hosting.json", path.join(output, ".openai/hosting.json"))
  writeFileSync(path.join(output, "server/index.js"), 'export { default } from "./sites-entry.js";\n')
  scanPublicAssets(path.join(output, "client"), [process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.RATE_LIMIT_SECRET, process.env.TICKET_SHARE_SECRET].filter(Boolean))
  scanPublicAssets(path.join(output, "server"), [process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.RATE_LIMIT_SECRET, process.env.TICKET_SHARE_SECRET].filter(Boolean))
  console.log("Sites Worker and public assets built; server secrets are absent from public files.")
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
