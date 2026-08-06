"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getFileTree, moveFile, createFile, createDirectory } from "@/lib/fs-access"
import type { FileTreeNode as FileTreeNodeType } from "@/lib/types"
import { FileTreeNode } from "./file-tree-node"
import { FileTreeActions } from "./file-tree-actions"
import { useFileTree } from "./file-tree-context"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { AlertTriangle, FolderPlus, FileText } from "lucide-react"
import { FILE_EXTENSION } from "@/lib/constants"

const DRAG_MIME = "application/x-md-editor-path"
const DRAG_MIME_MULTI = "application/x-md-editor-paths"

function collectPaths(nodes: FileTreeNodeType[]): string[] {
  const paths: string[] = []
  for (const node of nodes) {
    paths.push(node.path)
    if (node.children) {
      paths.push(...collectPaths(node.children))
    }
  }
  return paths
}

export function FileTree() {
  const { reloadCounter, reload, clearSelection, selectAll } = useFileTree()
  const [tree, setTree] = useState<FileTreeNodeType[]>([])
  const [error, setError] = useState<string | undefined>()
  const [rootDragOver, setRootDragOver] = useState(false)
  const [bgContextMenu, setBgContextMenu] = useState<{ x: number; y: number } | null>(null)
  const bgMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    getFileTree()
      .then((result) => {
        if (cancelled) return
        setTree(result.tree)
        setError(result.error)
      })
      .catch(() => {
        if (cancelled) return
        setTree([])
        setError("파일 트리를 불러오는 중 오류가 발생했습니다")
      })
    return () => { cancelled = true }
  }, [reloadCounter])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearSelection()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        const target = e.target as HTMLElement
        if (target.closest("[data-file-tree]")) {
          e.preventDefault()
          const all = collectPaths(tree)
          selectAll(all)
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [tree, clearSelection, selectAll])

  useEffect(() => {
    if (!bgContextMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      if (bgMenuRef.current && !bgMenuRef.current.contains(e.target as Node)) {
        setBgContextMenu(null)
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBgContextMenu(null)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEsc)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEsc)
    }
  }, [bgContextMenu])

  const handleBgNewFolder = useCallback(async () => {
    const name = window.prompt("새 폴더 이름:")
    if (!name) return
    try {
      await createDirectory("", name)
      toast.success("폴더 생성 완료")
      setBgContextMenu(null)
      reload()
    } catch (e) {
      toast.error("폴더 생성 실패", { description: String(e) })
    }
  }, [reload])

  const handleBgNewFile = useCallback(async () => {
    const name = window.prompt("새 파일 이름:", "새 파일.md")
    if (!name) return
    if (!name.endsWith(FILE_EXTENSION)) {
      toast.error("파일 이름은 .md로 끝나야 합니다")
      return
    }
    try {
      await createFile("", name)
      toast.success("파일 생성 완료")
      setBgContextMenu(null)
      reload()
    } catch (e) {
      toast.error("파일 생성 실패", { description: String(e) })
    }
  }, [reload])

  if (error && tree.length === 0) {
    return (
      <div className="px-3 py-4">
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (tree.length === 0 && !error) {
    return (
      <div className="px-3 py-4 text-sm text-muted-foreground">
        .md 파일이 없습니다
      </div>
    )
  }

  const allPaths = collectPaths(tree)

  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setRootDragOver(false)

    let sourcePaths: string[] = []
    const multiData = e.dataTransfer.getData(DRAG_MIME_MULTI)
    if (multiData) {
      try {
        sourcePaths = JSON.parse(multiData)
      } catch {
        sourcePaths = []
      }
    }
    if (sourcePaths.length === 0) {
      const single = e.dataTransfer.getData(DRAG_MIME) || e.dataTransfer.getData("text/plain")
      if (single) sourcePaths = [single]
    }
    if (sourcePaths.length === 0) return

    let moved = 0
    let failed = 0
    for (const sp of sourcePaths) {
      if (!sp.includes("/")) continue
      try {
        await moveFile("", sp, "")
        moved++
      } catch {
        failed++
      }
    }

    if (moved > 0) {
      toast.success(`${moved}개 파일을 최상위로 이동했습니다${failed > 0 ? ` (${failed}개 실패)` : ""}`)
      clearSelection()
      reload()
    } else if (failed > 0) {
      toast.error(`${failed}개 파일 이동 실패`)
    }
  }

  return (
    <div
      data-file-tree
      data-layout="파일 트리"
      data-ui-file="src/components/file-tree/file-tree.tsx"
      className={cn(
        "min-h-full px-2 py-2",
        rootDragOver && "bg-primary/5 ring-1 ring-inset ring-primary/30"
      )}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        if (!rootDragOver) setRootDragOver(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setRootDragOver(false)
      }}
      onDrop={handleRootDrop}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest("[data-file-tree-node]")) return
        e.preventDefault()
        setBgContextMenu({ x: e.clientX, y: e.clientY })
      }}
    >
      <div className="mb-2 px-1">
        <FileTreeActions />
      </div>
      {tree.map((node) => (
        <FileTreeNode key={node.path} node={node} allPaths={allPaths} />
      ))}

      {bgContextMenu && (
        <div
          ref={bgMenuRef}
          className="fixed z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-lg"
          style={{ left: bgContextMenu.x, top: bgContextMenu.y }}
        >
          <button
            onClick={handleBgNewFolder}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <FolderPlus className="size-4" />
            <span>새 폴더</span>
          </button>
          <button
            onClick={handleBgNewFile}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <FileText className="size-4" />
            <span>새 파일</span>
          </button>
        </div>
      )}
    </div>
  )
}
