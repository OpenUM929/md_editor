"use client"

import { useState } from "react"
import { FolderOpen, RefreshCw } from "lucide-react"
import { ImportContent } from "@/components/migration/import-content"
import { useWorkspace } from "@/components/workspace/workspace-provider"

export function RootFolderSelector() {
  const [showImport, setShowImport] = useState(false)
  const { rootHandle, resetWorkspace } = useWorkspace()

  const folderName = rootHandle?.name || "워크스페이스"

  return (
    <>
      <div className="flex items-center justify-between p-3 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground truncate" title={folderName}>
            {folderName}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowImport(true)}
            className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
          >
            가져오기
          </button>
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
