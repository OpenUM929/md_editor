"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { FileText, Folder, FolderOpen, ChevronRight, ChevronDown, Check, Pencil, Trash2, FileUp, FolderInput, FolderPlus, Copy } from "lucide-react"
import { FileNodeActions, FolderNodeActions } from "./file-tree-actions"
import { moveFile, deleteFile, deleteDirectory, renameFile, renameDirectory, isPathMode, revealInFileExplorer, openRootInFileExplorer, createDirectory, duplicateFile } from "@/lib/fs-access"
import { toast } from "sonner"
import { useFileTree } from "./file-tree-context"
import { FILE_EXTENSION } from "@/lib/constants"
import type { FileTreeNode as FileTreeNodeType } from "@/lib/types"
import { ImportContent } from "@/components/migration/import-content"

type Props = {
  node: FileTreeNodeType
  depth?: number
  allPaths?: string[]
}

const DRAG_MIME = "application/x-md-editor-path"
const DRAG_MIME_MULTI = "application/x-md-editor-paths"

type ContextMenuState = { x: number; y: number; nodePath: string; nodeType: "file" | "directory" } | null

export function FileTreeNode({ node, depth = 0, allPaths = [] }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
  const [importTargetFolder, setImportTargetFolder] = useState<string | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { reload, selectedPaths, toggleSelect, rangeSelect, clearSelection, isSelected } = useFileTree()

  const isActive = pathname === `/${node.path}`
  const isNodeSelected = isSelected(node.path)

  useEffect(() => {
    if (!contextMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [contextMenu])

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      toggleSelect(node.path)
      return
    }
    if (e.shiftKey) {
      e.preventDefault()
      rangeSelect(node.path, allPaths)
      return
    }

    if (node.type === "directory") {
      if (!isNodeSelected) clearSelection()
      setExpanded(!expanded)
    } else {
      clearSelection()
      const encodedPath = node.path.split("/").map(encodeURIComponent).join("/")
      router.push(`/${encodedPath}`)
    }
  }

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isNodeSelected) {
      clearSelection()
      toggleSelect(node.path)
    }
    setContextMenu({ x: e.clientX, y: e.clientY, nodePath: node.path, nodeType: node.type })
  }, [node.path, node.type, isNodeSelected, clearSelection, toggleSelect])

  const handleDragStart = (e: React.DragEvent) => {
    if (node.type !== "file" && node.type !== "directory") return
    if (isNodeSelected && selectedPaths.size > 1) {
      e.dataTransfer.setData(DRAG_MIME_MULTI, JSON.stringify(Array.from(selectedPaths)))
      e.dataTransfer.setData(DRAG_MIME, node.path)
      e.dataTransfer.setData("text/plain", node.path)
    } else {
      e.dataTransfer.setData(DRAG_MIME, node.path)
      e.dataTransfer.setData("text/plain", node.path)
    }
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDrop = async (e: React.DragEvent) => {
    if (node.type !== "directory") return
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)

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
      const sourceParent = sp.split("/").slice(0, -1).join("/")
      if (sourceParent === node.path) continue
      if (sp === node.path || node.path.startsWith(`${sp}/`)) continue
      try {
        await moveFile("", sp, node.path)
        moved++
      } catch {
        failed++
      }
    }

    if (moved > 0) {
      toast.success(`${moved}개 파일을 이동했습니다${failed > 0 ? ` (${failed}개 실패)` : ""}`)
      setExpanded(true)
      clearSelection()
      reload()
    } else if (failed > 0) {
      toast.error(`${failed}개 파일 이동 실패`)
    }
  }

  const ctxRename = useCallback(async () => {
    if (!contextMenu) return
    const p = contextMenu.nodePath
    const isFile = contextMenu.nodeType === "file"
    const currentName = p.split("/").pop() || ""
    const newName = window.prompt(isFile ? "새 파일 이름:" : "새 폴더 이름:", currentName)
    if (!newName) { setContextMenu(null); return }
    if (isFile && !newName.endsWith(FILE_EXTENSION)) {
      toast.error("파일 이름은 .md로 끝나야 합니다")
      setContextMenu(null)
      return
    }
    const parent = p.split("/").slice(0, -1).join("/")
    const newPath = parent ? `${parent}/${newName}` : newName
    if (newPath === p) { setContextMenu(null); return }
    try {
      if (isFile) {
        await renameFile("", p, newPath)
      } else {
        await renameDirectory("", p, newPath)
      }
      toast.success("이름 변경 완료")
      reload()
    } catch (e) {
      toast.error("이름 변경 실패", { description: String(e) })
    }
    setContextMenu(null)
  }, [contextMenu, reload])

  const ctxDelete = useCallback(async () => {
    if (!contextMenu) return
    const p = contextMenu.nodePath
    const isFile = contextMenu.nodeType === "file"
    const label = isFile ? `"${p}" 파일` : `"${p}" 폴더와 그 안의 모든 파일`
    if (!window.confirm(`${label}을(를) 삭제하시겠습니까?`)) { setContextMenu(null); return }
    try {
      if (isFile) {
        await deleteFile("", p)
      } else {
        await deleteDirectory("", p)
      }
      toast.success("삭제 완료")
      reload()
    } catch (e) {
      toast.error("삭제 실패", { description: String(e) })
    }
    setContextMenu(null)
  }, [contextMenu, reload])

  const ctxDeleteSelected = useCallback(async () => {
    const paths = Array.from(selectedPaths)
    if (!window.confirm(`${paths.length}개의 항목을 삭제하시겠습니까?`)) { setContextMenu(null); return }
    let succeeded = 0
    let failed = 0
    for (const p of paths) {
      try {
        if (p.endsWith(FILE_EXTENSION)) {
          await deleteFile("", p)
        } else {
          await deleteDirectory("", p)
        }
        succeeded++
      } catch {
        failed++
      }
    }
    if (succeeded > 0) {
      toast.success(`${succeeded}개 항목 삭제 완료${failed > 0 ? ` (${failed}개 실패)` : ""}`)
      clearSelection()
      reload()
    } else {
      toast.error(`${failed}개 항목 삭제 실패`)
    }
    setContextMenu(null)
  }, [selectedPaths, reload, clearSelection])

  const ctxNewSubFolder = useCallback(async () => {
    if (!contextMenu) return
    const p = contextMenu.nodePath
    const name = window.prompt("새 폴더 이름:")
    if (!name) { setContextMenu(null); return }
    try {
      await createDirectory("", `${p}/${name}`)
      toast.success("폴더 생성 완료")
      reload()
    } catch (e) {
      toast.error("폴더 생성 실패", { description: String(e) })
    }
    setContextMenu(null)
  }, [contextMenu, reload])

  const ctxDuplicate = useCallback(async () => {
    if (!contextMenu || contextMenu.nodeType !== "file") return
    try {
      const newPath = await duplicateFile("", contextMenu.nodePath)
      toast.success(`복제본 생성: ${newPath.split("/").pop()}`)
      setContextMenu(null)
      reload()
    } catch (e) {
      toast.error("복제본 생성 실패", { description: String(e) })
    }
  }, [contextMenu, reload])

  const ctxRevealInExplorer = useCallback(async () => {
    if (!contextMenu) return
    try {
      await revealInFileExplorer(contextMenu.nodePath)
    } catch (e) {
      toast.error("폴더 위치 열기 실패", { description: String(e) })
    }
    setContextMenu(null)
  }, [contextMenu])

  const isDirectory = node.type === "directory"
  const showMultiDelete = contextMenu && selectedPaths.size > 1

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        draggable={node.type === "file" || node.type === "directory"}
        onDragStart={handleDragStart}
        onDragOver={
          isDirectory
            ? (e) => {
                e.preventDefault()
                e.stopPropagation()
                e.dataTransfer.dropEffect = "move"
                if (!dragOver) setDragOver(true)
              }
            : undefined
        }
        onDragLeave={isDirectory ? () => setDragOver(false) : undefined}
        onDrop={isDirectory ? handleDrop : undefined}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleClick(e as unknown as React.MouseEvent)
          }
        }}
        className={cn(
          "group flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-muted outline-none focus-visible:ring-1 focus-visible:ring-ring",
          isActive && !isNodeSelected && "bg-muted font-medium text-foreground",
          !isActive && !isNodeSelected && "text-muted-foreground",
          isNodeSelected && "bg-primary/15 ring-1 ring-primary/50 text-foreground",
          isNodeSelected && isActive && "bg-primary/20 ring-1 ring-primary/60 font-medium",
          dragOver && "ring-1 ring-primary bg-primary/10"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isNodeSelected ? (
          <span className="flex size-3.5 shrink-0 items-center justify-center rounded-sm border border-primary bg-primary text-primary-foreground">
            <Check className="size-2.5" />
          </span>
        ) : node.type === "directory" ? (
          <>
            {expanded ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
          </>
        ) : (
          <span className="w-3.5" />
        )}

        {node.type === "directory" ? (
          expanded ? <FolderOpen className="size-4 shrink-0 text-blue-500" /> : <Folder className="size-4 shrink-0 text-blue-400" />
        ) : (
          <FileText className="size-4 shrink-0 text-zinc-400" />
        )}
        <span className="truncate flex-1">{node.name}</span>
        {node.type === "file" ? (
          <FileNodeActions path={node.path} />
        ) : (
          <FolderNodeActions path={node.path} />
        )}
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.nodeType === "directory" && (
            <>
              <button
                onClick={ctxNewSubFolder}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                <FolderPlus className="size-4" />
                <span>새 폴더</span>
              </button>
              <button
                onClick={() => {
                  setImportTargetFolder(contextMenu.nodePath)
                  setContextMenu(null)
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                <FileUp className="size-4" />
                <span>가져오기</span>
              </button>
              {isPathMode() && (
                <button
                  onClick={ctxRevealInExplorer}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors"
                >
                  <FolderInput className="size-4" />
                  <span>폴더 위치 열기</span>
                </button>
              )}
              <div className="my-1 h-px bg-border" />
            </>
          )}
          {contextMenu.nodeType === "file" && (
            <>
              <button
                onClick={ctxDuplicate}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                <Copy className="size-4" />
                <span>복제본 만들기</span>
              </button>
              <div className="my-1 h-px bg-border" />
            </>
          )}
          {isPathMode() && (
            <button
              onClick={ctxRevealInExplorer}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              <FolderInput className="size-4" />
              <span>파일 위치 열기</span>
            </button>
          )}
          <button
            onClick={ctxRename}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <Pencil className="size-4" />
            <span>이름 변경</span>
          </button>
          <button
            onClick={ctxDelete}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="size-4" />
            <span>삭제</span>
          </button>
          {showMultiDelete && (
            <>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={ctxDeleteSelected}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="size-4" />
                <span>선택된 항목 삭제 ({selectedPaths.size}개)</span>
              </button>
            </>
          )}
        </div>
      )}

      {node.type === "directory" && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} allPaths={allPaths} />
          ))}
        </div>
      )}

      <ImportContent
        open={!!importTargetFolder}
        onOpenChange={(open) => { if (!open) setImportTargetFolder(null) }}
        targetFolder={importTargetFolder || undefined}
      />
    </div>
  )
}
