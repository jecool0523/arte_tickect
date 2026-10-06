import { checkSiteEnvironment, checkSupabaseConnection, loadSiteEnvironment } from "./sites-env.mjs"

try {
  loadSiteEnvironment()
  const config = checkSiteEnvironment()
  console.log(`Site origin: ${config.NEXT_PUBLIC_SITE_URL}`)
  console.log("Build and runtime variable checks passed; no secret values are printed.")
  console.log(JSON.stringify(await checkSupabaseConnection()))
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
