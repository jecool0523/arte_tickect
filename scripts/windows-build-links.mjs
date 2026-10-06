// Windows treats an untyped directory symlink as a file link. Limit this fix
// to disposable Next/OpenNext build output; application/dependency links stay untouched.
import fs from "node:fs"
import path from "node:path"
import { syncBuiltinESMExports } from "node:module"

const root = process.cwd()
const standalone = path.resolve(root, ".next/standalone")
const generated = [standalone, path.resolve(root, ".open-next")]
const inside = filename => generated.some(directory => filename.startsWith(`${directory}${path.sep}`))

function linkArguments(target, destination, type) {
  const filename = path.resolve(destination)
  if (!inside(filename)) return [target, destination, type]
  const resolved = path.resolve(path.dirname(filename), target)
  const candidates = [resolved, resolved.replace(path.resolve(root, ".open-next/server-functions/default"), standalone)]
  const directory = candidates.some(candidate => {
    try { return fs.statSync(candidate).isDirectory() } catch { return false }
  })
  return directory ? [resolved, destination, "junction"] : [target, destination, type]
}

if (process.platform === "win32") {
  const originalSync = fs.symlinkSync
  const originalAsync = fs.symlink
  const originalPromise = fs.promises.symlink.bind(fs.promises)
  fs.symlinkSync = (target, destination, type) => originalSync(...linkArguments(target, destination, type))
  fs.symlink = (target, destination, type, callback) => {
    if (typeof type === "function") { callback = type; type = undefined }
    return originalAsync(...linkArguments(target, destination, type), callback)
  }
  fs.promises.symlink = (target, destination, type) => originalPromise(...linkArguments(target, destination, type))
  syncBuiltinESMExports()

  // Also repair output created by a previous unsuccessful Windows build.
  function repair(directory) {
    if (!fs.existsSync(directory)) return
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name)
      if (entry.isSymbolicLink()) {
        const target = fs.readlinkSync(filename)
        const args = linkArguments(target, filename)
        if (args[2] === "junction") {
          if (!inside(path.resolve(filename))) throw new Error("Unsafe generated link path")
          fs.unlinkSync(filename)
          originalSync(...args)
        }
      } else if (entry.isDirectory()) repair(filename)
    }
  }
  repair(standalone)
}
