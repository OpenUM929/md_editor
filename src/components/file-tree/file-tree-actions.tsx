"use client"

import { useState, useCallback } from "react"
import { Plus, FileText, FolderPlus, Trash2, Pencil } from "lucide-react"
import { createFile, createDirectory, deleteFile, renameFile } from "@/lib/fs-access"
import { toast } from "sonner"
import { useFileTree } from "./file-tree-context"

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
  const { reload } = useFileTree()

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
    if (!newName.endsWith(".md")) {
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

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center rounded-sm p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
        aria-label="파일 작업"
      >
        <Plus className="size-3.5" />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-md border bg-popover p-1 shadow-lg">
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
          </div>
        </>
      )}
    </div>
  )
}
