"use client"

import { useState, useCallback } from "react"
import { EditorToolbar } from "@/components/editor/editor-toolbar"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { AutoSaveIndicator } from "@/components/editor/auto-save-indicator"
import { RecoveryDialog } from "@/components/editor/recovery-dialog"
import { useAutoSave } from "@/hooks/use-auto-save"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Save, Loader2, PanelLeftOpen } from "lucide-react"
import { toast } from "sonner"
import { saveMdFile, applyTempToOriginal, discardTempFile } from "@/lib/fs-access"
import { useSidebar } from "@/lib/sidebar-context"
import { cn } from "@/lib/utils"
import type { Editor } from "@tiptap/react"
import type { MarginPresetId } from "@/lib/a4-margins"
import { DEFAULT_MARGIN_PRESET } from "@/lib/a4-margins"
import type { PageMode } from "@/lib/page-mode"

type Props = {
  rootDir: string
  filePath: string
  initialContent: string
  recoveryInfo: { tempContent: string; originalContent: string; tempSavedAt: string } | null
  error?: string
}

export function EditorPage({ rootDir, filePath, initialContent, recoveryInfo, error }: Props) {
  const [content, setContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [showRecovery, setShowRecovery] = useState(!!recoveryInfo)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [pageMode, setPageMode] = useState<PageMode>("bunri")
  const [marginPresetId, setMarginPresetId] = useState<MarginPresetId>(DEFAULT_MARGIN_PRESET)
  const sidebar = useSidebar()

  useAutoSave(rootDir, filePath, content, setAutoSaveStatus)

  const breadcrumbParts = (() => {
    const parts = filePath.replace(/\\/g, "/").split("/")
    return parts
  })()

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await saveMdFile(rootDir, filePath, content)
      setHasUnsaved(false)
      toast.success("저장 완료")
    } catch (e) {
      toast.error("저장 실패", { description: String(e) })
    } finally {
      setIsSaving(false)
    }
  }, [rootDir, filePath, content])

  const handleContentChange = useCallback((html: string) => {
    setContent(html)
    setHasUnsaved(true)
  }, [])

  const handleRecoveryApply = useCallback(async () => {
    const result = await applyTempToOriginal(rootDir, filePath)
    if (result.success) {
      toast.success("복구 완료")
      setShowRecovery(false)
      window.location.reload()
    } else {
      toast.error("복구 실패", { description: result.error })
    }
  }, [rootDir, filePath])

  const handleRecoveryDiscard = useCallback(async () => {
    await discardTempFile(rootDir, filePath)
    setShowRecovery(false)
    setHasUnsaved(false)
    toast.info("임시 파일이 삭제되었습니다")
  }, [rootDir, filePath])

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium text-destructive">오류 발생</h2>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <RecoveryDialog
        open={showRecovery}
        onApply={handleRecoveryApply}
        onDiscard={handleRecoveryDiscard}
        onClose={() => setShowRecovery(false)}
        originalContent={recoveryInfo?.originalContent || ""}
        tempContent={recoveryInfo?.tempContent || ""}
        tempSavedAt={recoveryInfo?.tempSavedAt || ""}
      />
      <div className="flex items-center justify-between border-b px-4 py-2 print:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon-sm" onClick={() => sidebar.setOpen(!sidebar.open)} aria-label="Toggle sidebar" className="hidden md:inline-flex shrink-0">
            <PanelLeftOpen className="size-4" />
          </Button>
          <nav className="flex items-center gap-1 text-sm text-muted-foreground min-w-0">
            {breadcrumbParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1 truncate">
                {i > 0 && <span className="text-muted-foreground/50 shrink-0">/</span>}
                <span className={cn("truncate", i === breadcrumbParts.length - 1 && "text-foreground font-medium")}>{part}</span>
              </span>
            ))}
          </nav>
          {hasUnsaved && <Badge variant="outline" className="text-xs shrink-0">수정됨</Badge>}
          <AutoSaveIndicator status={autoSaveStatus} />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <EditorToolbar editor={editor} pageMode={pageMode} onPageModeChange={setPageMode} marginPresetId={marginPresetId} onMarginPresetChange={setMarginPresetId} />
          <Button onClick={handleSave} disabled={isSaving} size="sm" className="shrink-0">
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            저장
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto print:overflow-visible">
        <TiptapEditor
          content={initialContent}
          onChange={handleContentChange}
          onSave={handleSave}
          onEditorReady={setEditor}
          pageMode={pageMode}
          marginPresetId={marginPresetId}
        />
      </div>
    </>
  )
}