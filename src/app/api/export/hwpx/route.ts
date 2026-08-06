import { NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { spawn } from "child_process"
import { randomUUID } from "crypto"
import { mdToHwpxPlan } from "@/lib/hwpx-plan"
import { requireAuth } from "@/lib/require-auth"
import type { ReportTheme } from "@/lib/report-theme"
import type { MarginPresetId } from "@/lib/a4-margins"

// HWPX 는 공인 라이브러리 python-hwpx(scripts/hwpx_gen.py)로 생성한다.
// 수제 OWPML 은 한글이 "파일 손상"으로 거부했다 → 폐기. Python 3.10+ 와
// `pip install python-hwpx` 가 서버(앱 실행) 환경에 필요하다.
const PYTHON = process.env.HWPX_PYTHON || "python"
const GEN_SCRIPT = path.join(process.cwd(), "scripts", "hwpx_gen.py")

async function resolveSavePath(root: string, filePath: string): Promise<string> {
  const resolved = path.resolve(root)
  await fs.stat(resolved).catch(() => { throw new Error("루트 경로가 유효하지 않습니다") })
  const target = path.resolve(root, filePath)
  if (!target.startsWith(resolved)) throw new Error("허용되지 않은 경로입니다")
  await fs.mkdir(path.dirname(target), { recursive: true })
  return target
}

// plan(JSON)을 stdin 으로 넘겨 hwpx_gen.py 를 실행. 성공 시 plan.out 에 유효 HWPX 가 생성된다.
function runHwpxGen(planJson: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // PYTHONUTF8/IOENCODING: Windows 기본 콘솔 인코딩(cp949)에서 한글 경로/진단이
    // stdout/stderr 인코딩 오류로 죽는 것을 막는다(생성은 성공했는데 실패로 보고되는 회귀 방지).
    const proc = spawn(PYTHON, [GEN_SCRIPT], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
    })
    let stderr = ""
    let stdout = ""
    proc.stdout.on("data", (d) => { stdout += d.toString() })
    proc.stderr.on("data", (d) => { stderr += d.toString() })
    proc.on("error", (err) => {
      reject(new Error(`Python 실행 실패(${PYTHON}). Python 3.10+ 와 python-hwpx 설치가 필요합니다: ${err.message}`))
    })
    proc.on("close", (code) => {
      if (code === 0) {
        resolve()
      } else {
        // 검증 실패(fail-closed) 또는 예외. stderr 마지막 줄이 진단.
        const detail = (stderr || stdout).trim().split("\n").slice(-4).join(" ").slice(0, 500)
        reject(new Error(`HWPX 생성/검증 실패(code ${code}): ${detail || "알 수 없는 오류"}`))
      }
    })
    proc.stdin.write(planJson)
    proc.stdin.end()
  })
}

export async function POST(req: NextRequest) {
  const guard = requireAuth(req)
  if (!guard.ok) return guard.response

  let tempPath: string | null = null
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

    // 저장 대상: 경로 모드는 디스크 경로, 다운로드 모드는 임시 파일.
    const isPathSave = Boolean(root && savePath)
    const outPath = isPathSave
      ? await resolveSavePath(root!, savePath!)
      : (tempPath = path.join(os.tmpdir(), `mdeditor-${randomUUID()}.hwpx`))

    const plan = mdToHwpxPlan(content, outPath, theme || "report", marginPreset || "very-narrow", title)
    await runHwpxGen(JSON.stringify(plan))

    // 경로 모드: 파일은 이미 디스크에 있다.
    if (isPathSave) {
      return NextResponse.json({ ok: true })
    }

    // 다운로드 모드: 생성된 임시 파일을 읽어 바이너리 반환.
    const buffer = await fs.readFile(outPath)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/hwp+zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(title || "document")}.hwpx"`,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 400 })
  } finally {
    if (tempPath) await fs.rm(tempPath, { force: true }).catch(() => {})
  }
}
