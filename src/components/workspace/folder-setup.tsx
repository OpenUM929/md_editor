"use client"

import { useState, useEffect } from "react"
import { useWorkspace } from "./workspace-provider"
import { DEFAULT_FOLDER_PATH } from "@/lib/constants"
import { Loader2, FolderOpen, AlertTriangle, ArrowRight } from "lucide-react"

export function FolderSetup() {
  const [unsupported, setUnsupported] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [folderPath, setFolderPath] = useState(DEFAULT_FOLDER_PATH)
  const { requestFolder, setFolderPath: applyPath, ready } = useWorkspace()

  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnsupported(!("showDirectoryPicker" in window))
    }
  }, [])

  if (ready) return null

  if (unsupported === null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const handlePathSubmit = async () => {
    if (!folderPath.trim()) return
    setLoading(true)
    setError("")
    try {
      const ok = await applyPath(folderPath.trim())
      if (!ok) {
        setError("유효한 디렉토리 경로가 아닙니다. 경로를 확인해 주세요.")
      }
    } catch {
      setError("경로 접근에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="mx-auto max-w-md rounded-lg border p-8 text-center shadow-lg">
        {unsupported ? (
          <>
            <AlertTriangle className="mx-auto size-12 text-amber-500" />
            <h2 className="mt-4 text-lg font-semibold">브라우저 제한</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              현재 접속 환경에서는 File System Access API를 사용할 수 없습니다.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              폴더 경로를 직접 입력하여 워크스페이스를 열 수 있습니다.
            </p>
          </>
        ) : (
          <>
            <FolderOpen className="mx-auto size-12 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">워크스페이스 폴더 선택</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              .md 파일이 있는 폴더를 선택하면 해당 폴더의 문서를 편집할 수 있습니다.
            </p>
          </>
        )}

        <div className="mt-6 space-y-3">
          {!unsupported && (
            <button
              onClick={async () => {
                setLoading(true); setError("")
                try {
                  const ok = await requestFolder()
                  if (!ok) setError("폴더 선택이 완료되지 않았습니다")
                } catch { setError("폴더에 접근할 수 없습니다") }
                finally { setLoading(false) }
              }}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <FolderOpen className="size-4" />}
              폴더 선택
            </button>
          )}

          {!unsupported && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">또는</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handlePathSubmit() }}
              placeholder="C:\dev\md_editor\md files"
              className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handlePathSubmit}
              disabled={loading || !folderPath.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              열기
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {unsupported && (
          <p className="mt-4 text-xs text-muted-foreground/50">
            로컬호스트(localhost)에서 접속하면 폴더 선택 버튼을 사용할 수 있습니다.
          </p>
        )}
      </div>
    </div>
  )
}
