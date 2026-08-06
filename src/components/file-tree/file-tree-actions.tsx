"use client"

import { useState, useCallback } from "react"
import { Plus, FileText, FolderPlus, Trash2, Pencil, MoreHorizontal, Copy } from "lucide-react"
import {
  createFile,
  createDirectory,
  deleteFile,
  renameFile,
  deleteDirectory,
  renameDirectory,
  duplicateFile,
} from "@/lib/fs-access"
import { toast } from "sonner"
import { useFileTree } from "./file-tree-context"
import { FILE_EXTENSION } from "@/lib/constants"

export function FileTreeActions() {
  const [showMenu, setShowMenu] = useState(false)
  const { reload } = useFileTree()

  const handleNewFile = useCallback(async () => {
    const name = window.prompt("새 파일 이름 (확장자 .md):")
    if (!name) return
    if (!name.endsWith(".md")) {
      toast.error("파일 이름은 .md로 끝나야 합니다")
      return
    }
    try {
      await createFile("", name)
      toast.success("파일 생성 완료")
      reload()
    } catch (e) {
      toast.error("파일 생성 실패", { description: String(e) })
    }
    setShowMenu(false)
  }, [reload])

  const handleNewFolder = useCallback(async () => {
    const name = window.prompt("새 폴더 이름:")
    if (!name) return
    try {
      await createDirectory("", name)
      toast.success("폴더 생성 완료")
      reload()
    } catch (e) {
      toast.error("폴더 생성 실패", { description: String(e) })
    }
    setShowMenu(false)
  }, [reload])

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
        aria-label="파일 작업"
      >
        <Plus className="size-3.5" />
        <span>새로 만들기</span>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-md border bg-popover p-1 shadow-lg">
            <button
              onClick={handleNewFile}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              <FileText className="size-4" />
              <span>새 파일</span>
            </button>
            <button
              onClick={handleNewFolder}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              <FolderPlus className="size-4" />
              <span>새 폴더</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function FileNodeActions({ path: nodePath }: { path: string }) {
  const [showMenu, setShowMenu] = useState(false)
  const { reload, selectedPaths, clearSelection } = useFileTree()
  const hasMultiSelection = selectedPaths.size > 1

  const handleDelete = useCallback(async () => {
    if (!window.confirm(`"${nodePath}" 파일을 삭제하시겠습니까?`)) return
    try {
      await deleteFile("", nodePath)
      toast.success("파일 삭제 완료")
      reload()
    } catch (e) {
      toast.error("파일 삭제 실패", { description: String(e) })
    }
    setShowMenu(false)
  }, [nodePath, reload])

  const handleRename = useCallback(async () => {
    const newName = window.prompt("새 파일 이름:", nodePath.split("/").pop())
    if (!newName) return
    if (!newName.endsWith(FILE_EXTENSION)) {
      toast.error("파일 이름은 .md로 끝나야 합니다")
      return
    }
    const parent = nodePath.split("/").slice(0, -1).join("/")
    const newPath = parent ? `${parent}/${newName}` : newName
    try {
      await renameFile("", nodePath, newPath)
      toast.success("파일 이름 변경 완료")
      reload()
    } catch (e) {
      toast.error("파일 이름 변경 실패", { description: String(e) })
    }
    setShowMenu(false)
  }, [nodePath, reload])

  const handleDuplicate = useCallback(async () => {
    try {
      const newPath = await duplicateFile("", nodePath)
      toast.success(`복제본 생성: ${newPath.split("/").pop()}`)
      reload()
    } catch (e) {
      toast.error("복제본 생성 실패", { description: String(e) })
    }
    setShowMenu(false)
  }, [nodePath, reload])

  const handleDeleteSelected = useCallback(async () => {
    const paths = Array.from(selectedPaths)
    if (!window.confirm(`${paths.length}개의 항목을 삭제하시겠습니까?`)) return
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
    setShowMenu(false)
  }, [selectedPaths, reload, clearSelection])

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center rounded-sm p-1 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-muted transition-opacity"
        aria-label="파일 작업"
      >
        <MoreHorizontal className="size-3.5" />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-md border bg-popover p-1 shadow-lg">
            <button
              onClick={handleRename}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              <Pencil className="size-4" />
              <span>이름 변경</span>
            </button>
            <button
              onClick={handleDuplicate}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              <Copy className="size-4" />
              <span>복제본 만들기</span>
            </button>
            <button
              onClick={handleDelete}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="size-4" />
              <span>삭제</span>
            </button>
            {hasMultiSelection && (
              <>
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={handleDeleteSelected}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="size-4" />
                  <span>선택된 항목 삭제 ({selectedPaths.size}개)</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function FolderNodeActions({ path: nodePath }: { path: string }) {
  const [showMenu, setShowMenu] = useState(false)
  const { reload, selectedPaths, clearSelection } = useFileTree()
  const hasMultiSelection = selectedPaths.size > 1

  const handleDelete = useCallback(async () => {
    if (!window.confirm(`"${nodePath}" 폴더와 그 안의 모든 파일을 삭제하시겠습니까?`)) return
    try {
      await deleteDirectory("", nodePath)
      toast.success("폴더 삭제 완료")
      reload()
    } catch (e) {
      toast.error("폴더 삭제 실패", { description: String(e) })
    }
    setShowMenu(false)
  }, [nodePath, reload])

  const handleRename = useCallback(async () => {
    const newName = window.prompt("새 폴더 이름:", nodePath.split("/").pop())
    if (!newName) return
    const parent = nodePath.split("/").slice(0, -1).join("/")
    const newPath = parent ? `${parent}/${newName}` : newName
    if (newPath === nodePath) return
    try {
      await renameDirectory("", nodePath, newPath)
      toast.success("폴더 이름 변경 완료")
      reload()
    } catch (e) {
      toast.error("폴더 이름 변경 실패", { description: String(e) })
    }
    setShowMenu(false)
  }, [nodePath, reload])

  const handleNewSubFile = useCallback(async () => {
    const name = window.prompt("새 파일 이름 (확장자 .md):")
    if (!name) return
    if (!name.endsWith(FILE_EXTENSION)) {
      toast.error("파일 이름은 .md로 끝나야 합니다")
      return
    }
    try {
      await createFile("", `${nodePath}/${name}`)
      toast.success("파일 생성 완료")
      reload()
    } catch (e) {
      toast.error("파일 생성 실패", { description: String(e) })
    }
    setShowMenu(false)
  }, [nodePath, reload])

  const handleNewSubFolder = useCallback(async () => {
    const name = window.prompt("새 폴더 이름:")
    if (!name) return
    try {
      await createDirectory("", `${nodePath}/${name}`)
      toast.success("폴더 생성 완료")
      reload()
    } catch (e) {
      toast.error("폴더 생성 실패", { description: String(e) })
    }
    setShowMenu(false)
  }, [nodePath, reload])

  const handleDeleteSelected = useCallback(async () => {
    const paths = Array.from(selectedPaths)
    if (!window.confirm(`${paths.length}개의 항목을 삭제하시겠습니까?`)) return
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
    setShowMenu(false)
  }, [selectedPaths, reload, clearSelection])

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center rounded-sm p-1 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-muted transition-opacity"
        aria-label="폴더 작업"
      >
        <MoreHorizontal className="size-3.5" />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border bg-popover p-1 shadow-lg">
            <button
              onClick={handleNewSubFile}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              <FileText className="size-4" />
              <span>새 파일</span>
            </button>
            <button
              onClick={handleNewSubFolder}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              <FolderPlus className="size-4" />
              <span>새 폴더</span>
            </button>
            <button
              onClick={handleRename}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              <Pencil className="size-4" />
              <span>이름 변경</span>
            </button>
            <button
              onClick={handleDelete}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="size-4" />
              <span>삭제</span>
            </button>
            {hasMultiSelection && (
              <>
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={handleDeleteSelected}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="size-4" />
                  <span>선택된 항목 삭제 ({selectedPaths.size}개)</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
