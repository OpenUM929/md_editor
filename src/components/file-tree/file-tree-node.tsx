"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { FileText, Folder, FolderOpen, ChevronRight, ChevronDown } from "lucide-react"
import { FileNodeActions } from "./file-tree-actions"
import type { FileTreeNode as FileTreeNodeType } from "@/lib/types"

type Props = {
  node: FileTreeNodeType
  depth?: number
}

export function FileTreeNode({ node, depth = 0 }: Props) {
  const [expanded, setExpanded] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const isActive = pathname === `/${node.path}`

  const handleClick = () => {
    if (node.type === "directory") {
      setExpanded(!expanded)
    } else {
      const encodedPath = node.path.split("/").map(encodeURIComponent).join("/")
      router.push(`/${encodedPath}`)
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleClick()
          }
        }}
        className={cn(
          "group flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-muted outline-none focus-visible:ring-1 focus-visible:ring-ring",
          isActive && "bg-muted font-medium text-foreground",
          !isActive && "text-muted-foreground"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {node.type === "directory" ? (
          <>
            {expanded ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
            {expanded ? <FolderOpen className="size-4 shrink-0 text-blue-500" /> : <Folder className="size-4 shrink-0 text-blue-400" />}
          </>
        ) : (
          <>
            <span className="w-3.5" />
            <FileText className="size-4 shrink-0 text-zinc-400" />
          </>
        )}
        <span className="truncate flex-1">{node.name}</span>
        {node.type === "file" && <FileNodeActions path={node.path} />}
      </div>
      {node.type === "directory" && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
