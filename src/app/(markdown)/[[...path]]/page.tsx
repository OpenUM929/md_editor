"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { readMdFile, getRecoveryInfo } from "@/lib/fs-access"
import { mdToHtml } from "@/lib/markdown"
import { DEFAULT_ROOT } from "@/lib/constants"
import { Workspace } from "@/components/tab/workspace"

export default function MarkdownPage() {
  const params = useParams()
  const pathSegments = params.path as string[] | undefined
  const filePath = pathSegments ? pathSegments.map(decodeURIComponent).join("/") : ""
  const rootDir = DEFAULT_ROOT

  const [content, setContent] = useState("")
  const [recoveryInfo, setRecoveryInfo] = useState<{ tempContent: string; originalContent: string; tempSavedAt: string } | null>(null)
  const [error, setError] = useState<string | undefined>()
  const [loading, setLoading] = useState(filePath.endsWith(".md"))

  useEffect(() => {
    if (!filePath.endsWith(".md")) return

    Promise.all([
      readMdFile(rootDir, filePath).then(mdToHtml),
      getRecoveryInfo(rootDir, filePath),
    ])
      .then(([html, recovery]) => {
        setContent(html)
        if (recovery?.tempContent) {
          setRecoveryInfo({
            tempContent: recovery.tempContent.content,
            originalContent: recovery.originalContent || "",
            tempSavedAt: recovery.tempContent.meta?.lastAutoSaveAt || "",
          })
        }
      })
      .catch((e) => {
        if (!filePath) return
        setError(String(e))
      })
      .finally(() => setLoading(false))
  }, [filePath, rootDir])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  return (
    <Workspace
      rootDir={rootDir}
      filePath={filePath}
      initialContent={content}
      recoveryInfo={recoveryInfo}
      error={error}
    />
  )
}
