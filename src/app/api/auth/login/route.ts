import { NextRequest, NextResponse } from "next/server"
import {
  createSessionToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth"
import { getAuthEnabled } from "@/lib/auth-config"

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(req: NextRequest) {
  try {
    if (!getAuthEnabled()) {
      return NextResponse.json({ error: "인증이 비활성화되어 있습니다" }, { status: 403 })
    }

    const body = await req.json()
    const { password } = body as { password: string }

    if (typeof password !== "string" || password.length === 0) {
      await delay(250)
      return NextResponse.json({ error: "비밀번호가 틀렸습니다" }, { status: 401 })
    }

    const ok = verifyPassword(password)
    await delay(ok ? 150 : 250)

    if (!ok) {
      return NextResponse.json({ error: "비밀번호가 틀렸습니다" }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    setSessionCookie(res, createSessionToken())
    return res
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
