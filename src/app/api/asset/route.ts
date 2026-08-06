import { NextRequest } from "next/server"
import { readFile } from "fs/promises"
import path from "path"
import { requireAuth } from "@/lib/require-auth"

const MIME: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".bmp": "image/bmp", ".ico": "image/x-icon", ".avif": "image/avif",
}

export async function GET(req: NextRequest) {
  const guard = requireAuth(req)
  if (!guard.ok) return guard.response

  const root = req.nextUrl.searchParams.get("root")
  const rel = req.nextUrl.searchParams.get("path")
  if (!root || !rel) return new Response("bad request", { status: 400 })
  const rootAbs = path.resolve(root)
  const target = path.resolve(rootAbs, rel)
  const within = target === rootAbs || target.startsWith(rootAbs + path.sep)
  if (!within) return new Response("forbidden", { status: 403 })
  try {
    const buf = await readFile(target)
    const ext = path.extname(target).toLowerCase()
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "no-store" },
    })
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[asset 404]", { root, rel, target: target })
    }
    return new Response("not found", { status: 404 })
  }
}
