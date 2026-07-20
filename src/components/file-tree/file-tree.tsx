"use client"

import { useState, useEffect } from "react"
import { getFileTree } from "@/lib/fs-access"
import type { FileTreeNode as FileTreeNodeType } from "@/lib/types"
import { FileTreeNode } from "./file-tree-node"
import { FileTreeActions } from "./file-tree-actions"
import { useFileTree } from "./file-tree-context"
import { AlertTriangle } from "lucide-react"

export function FileTree() {
  const { reloadCounter } = useFileTree()
  const [tree, setTree] = useState<FileTreeNodeType[]>([])
  const [error, setError] = useState<string | undefined>()

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

  return (
    <div className="px-2 py-2">
      <div className="mb-2 px-1">
        <FileTreeActions />
      </div>
      {tree.map((node) => (
        <FileTreeNode key={node.path} node={node} />
      ))}
    </div>
  )
}
