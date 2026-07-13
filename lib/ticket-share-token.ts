import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"
import { isKnownMusicalId, type MusicalId } from "@/lib/musical-config"

const TOKEN_VERSION = 1
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7

type TicketSharePayload = {
  v: typeof TOKEN_VERSION
  m: MusicalId
  b: number
  exp: number
}

export type TicketShareValidation =
  | { valid: true; musicalId: MusicalId; bookingId: number; expiresAt: number }
  | { valid: false; reason: "invalid" | "expired" | "not-configured" }

function getSecret() {
  const secret = process.env.TICKET_SHARE_SECRET
  return secret && secret.length >= 32 ? secret : null
}

function getTtlSeconds() {
  const configured = Number(process.env.TICKET_SHARE_TTL_SECONDS)
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_TTL_SECONDS
}

function signPayload(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url")
}

export function createTicketShareToken(musicalId: MusicalId, bookingId: number, expiresAt?: number) {
  const secret = getSecret()
  if (!secret) return null

  const payload: TicketSharePayload = {
    v: TOKEN_VERSION,
    m: musicalId,
    b: bookingId,
    exp: expiresAt ?? Math.floor(Date.now() / 1000) + getTtlSeconds(),
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  return `${encodedPayload}.${signPayload(encodedPayload, secret)}`
}

export function verifyTicketShareToken(token: string): TicketShareValidation {
  const secret = getSecret()
  if (!secret) return { valid: false, reason: "not-configured" }
  if (!token || token.length > 1024) return { valid: false, reason: "invalid" }

  const parts = token.split(".")
  if (parts.length !== 2) return { valid: false, reason: "invalid" }
  const [encodedPayload, signature] = parts
  const expected = signPayload(encodedPayload, secret)

  try {
    const signatureBuffer = Buffer.from(signature, "base64url")
    const expectedBuffer = Buffer.from(expected, "base64url")
    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return { valid: false, reason: "invalid" }
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<TicketSharePayload>
    if (
      payload.v !== TOKEN_VERSION ||
      typeof payload.m !== "string" ||
      !isKnownMusicalId(payload.m) ||
      !Number.isSafeInteger(payload.b) ||
      Number(payload.b) <= 0 ||
      !Number.isSafeInteger(payload.exp)
    ) {
      return { valid: false, reason: "invalid" }
    }

    if (Number(payload.exp) <= Math.floor(Date.now() / 1000)) return { valid: false, reason: "expired" }

    return {
      valid: true,
      musicalId: payload.m,
      bookingId: Number(payload.b),
      expiresAt: Number(payload.exp),
    }
  } catch {
    return { valid: false, reason: "invalid" }
  }
}
