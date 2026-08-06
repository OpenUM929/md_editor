import "server-only"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getAuthEnabled } from "@/lib/auth-config"
import { getSessionFromRequest, verifySessionToken } from "@/lib/auth"
import { AUTH_SESSION_COOKIE } from "@/lib/constants"
import type { SessionPayload } from "@/lib/auth"

interface AuthResult {
  ok: boolean
  session?: SessionPayload
  response?: NextResponse
}

export function requireAuth(req: NextRequest): AuthResult {
  if (!getAuthEnabled()) return { ok: true }

  const session = getSessionFromRequest(req)
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 }),
    }
  }
  return { ok: true, session }
}

export async function requireAuthPage(): Promise<SessionPayload | null> {
  if (!getAuthEnabled()) return null

  const token = (await cookies()).get(AUTH_SESSION_COOKIE)?.value
  const session = token ? verifySessionToken(token) : null
  if (session) return session

  redirect("/login")
}

