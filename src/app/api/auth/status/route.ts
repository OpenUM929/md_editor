import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { getAuthEnabled } from "@/lib/auth-config"

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    const enabled = getAuthEnabled()
    return NextResponse.json({ authed: session !== null, enabled })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
