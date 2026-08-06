"use client"

import { useState, useCallback } from "react"
import { FolderOpen, RefreshCw, ExternalLink } from "lucide-react"
import { ImportContent } from "@/components/migration/import-content"
import { useWorkspace } from "@/components/workspace/workspace-provider"
import { isPathMode, openRootFolder } from "@/lib/fs-access"

export function RootFolderSelector() {
  const [showImport, setShowImport] = useState(false)
  const { rootHandle, rootPath, resetWorkspace } = useWorkspace()

  const folderName = rootHandle?.name || "워크스페이스"
  const displayPath = isPathMode() ? rootPath : null

  const handleOpenFolder = useCallback(async () => {
    await openRootFolder()
  }, [])

  return (
    <>
      <div className="flex items-center justify-between p-3 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <span className="text-xs font-medium text-muted-foreground truncate block" title={folderName}>
              {folderName}
            </span>
            {displayPath && (
              <span className="text-[10px] text-muted-foreground/70 truncate block" title={displayPath}>
                {displayPath}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowImport(true)}
            className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
          >
            가져오기
          </button>
          {isPathMode() && (
            <button
              onClick={handleOpenFolder}
              className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
              title="폴더 열기"
            >
              <ExternalLink className="size-3" />
            </button>
          )}
          <button
            onClick={resetWorkspace}
            className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
            title="다른 폴더 선택"
          >
            <RefreshCw className="size-3" />
          </button>
        </div>
      </div>
      <ImportContent open={showImport} onOpenChange={setShowImport} />
    </>
  )
}
