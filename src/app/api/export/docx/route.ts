import { NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import { mdToDocxBuffer } from "@/lib/docx-export"
import { requireAuth } from "@/lib/require-auth"
import type { ReportTheme } from "@/lib/report-theme"
import type { MarginPresetId } from "@/lib/a4-margins"

async function resolveSavePath(root: string, filePath: string): Promise<string> {
  const resolved = path.resolve(root)
  await fs.stat(resolved).catch(() => { throw new Error("루트 경로가 유효하지 않습니다") })
  const target = path.resolve(root, filePath)
  if (!target.startsWith(resolved)) throw new Error("허용되지 않은 경로입니다")
  await fs.mkdir(path.dirname(target), { recursive: true })
  return target
}

export async function POST(req: NextRequest) {
  const guard = requireAuth(req)
  if (!guard.ok) return guard.response

  try {
    const body = await req.json()
    const { content, theme, marginPreset, title, root, savePath } = body as {
      content: string
      theme?: ReportTheme
      marginPreset?: MarginPresetId
      title?: string
      root?: string
      savePath?: string
    }

    if (!content) throw new Error("content가 필요합니다")

    const buffer = await mdToDocxBuffer(
      content,
      theme || "report",
      marginPreset || "medium",
      title,
    )

    // 경로 모드: 디스크에 저장
    if (root && savePath) {
      const targetPath = await resolveSavePath(root, savePath)
      await fs.writeFile(targetPath, buffer)
      return NextResponse.json({ ok: true, savedPath: targetPath })
    }

    // 다운로드 모드: 바이너리 반환
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(title || "document")}.docx"`,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
