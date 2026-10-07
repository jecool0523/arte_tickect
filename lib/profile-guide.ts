const KEY = "arte:profile-guide:v1"
const dismissed = new Set<string>()

// Dismissed UI hints are device-local preferences, not account data or authority.
export function shouldShowProfileGuide(storage?: Pick<Storage, "getItem"> | null) {
  if (dismissed.has(KEY)) return false
  try { return storage?.getItem(KEY) !== "dismissed" } catch { return true }
}

export function dismissProfileGuide(storage?: Pick<Storage, "setItem"> | null) {
  dismissed.add(KEY)
  try { storage?.setItem(KEY, "dismissed") } catch { /* Storage blocked: suppress for this page session. */ }
}
