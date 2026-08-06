import "server-only"
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import {
  AUTH_PATH,
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE_MS,
  AUTH_TOKEN_SEPARATOR,
} from "@/lib/constants"
import { getAuthPasswordHash, getAuthSalt, getAuthSecret } from "@/lib/auth-config"

export interface SessionPayload {
  exp: number
  iat: number
  sid: string
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf-8") : input
  return buf.toString("base64url")
}

function fromBase64url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf-8")
}

function sign(parts: [string, string]): string {
  const secret = getAuthSecret()
  return createHmac("sha256", secret).update(parts.join(AUTH_TOKEN_SEPARATOR)).digest("base64url")
}

export function createSessionToken(): string {
  const header = base64url(JSON.stringify({ alg: "HS256" }))
  const now = Date.now()
  const payload = base64url(
    JSON.stringify({ exp: now + AUTH_SESSION_MAX_AGE_MS, iat: now, sid: randomBytes(16).toString("hex") })
  )
  const signature = sign([header, payload])
  return [header, payload, signature].join(AUTH_TOKEN_SEPARATOR)
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split(AUTH_TOKEN_SEPARATOR)
  if (parts.length !== 3) return null

  const [header, payload, signature] = parts
  const expected = sign([header, payload])
  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(signature)
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return null
  }

  try {
    const parsed = JSON.parse(fromBase64url(payload)) as SessionPayload
    if (typeof parsed.exp !== "number" || parsed.exp <= Date.now()) return null
    return parsed
  } catch {
    return null
  }
}

export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(AUTH_SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(AUTH_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: AUTH_PATH,
    maxAge: Math.floor(AUTH_SESSION_MAX_AGE_MS / 1000),
  })
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(AUTH_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: AUTH_PATH,
    maxAge: 0,
  })
}

export function verifyPassword(password: string): boolean {
  const expected = getAuthPasswordHash()
  const salt = getAuthSalt()
  if (!expected || !salt) return false

  const actual = createHash("sha256").update(salt + password, "utf-8").digest("hex")
  const expectedBuf = Buffer.from(expected, "utf-8")
  const actualBuf = Buffer.from(actual, "utf-8")
  if (expectedBuf.length !== actualBuf.length) return false
  return timingSafeEqual(expectedBuf, actualBuf)
}
