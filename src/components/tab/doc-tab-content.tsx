"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { EditorToolbar } from "@/components/editor/editor-toolbar"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { AutoSaveIndicator } from "@/components/editor/auto-save-indicator"
import { RecoveryDialog } from "@/components/editor/recovery-dialog"
import { useAutoSave } from "@/hooks/use-auto-save"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Save, Loader2, PanelLeftOpen } from "lucide-react"
import { toast } from "sonner"
import { saveMdFile, applyTempToOriginal, discardTempFile, readMdFile } from "@/lib/fs-access"
import { useSidebar } from "@/lib/sidebar-context"
import { useTabs, type DocTab } from "@/lib/tab-context"
import { cn } from "@/lib/utils"
import { mdToHtml } from "@/lib/markdown"
import { LOCALSTORAGE_PREFIX } from "@/lib/constants"
import type { Editor } from "@tiptap/react"
import type { MarginPresetId } from "@/lib/a4-margins"
import { DEFAULT_MARGIN_PRESET } from "@/lib/a4-margins"
import type { PageMode } from "@/lib/page-mode"
import { pageModeFromMarkdown, pageModeFromHtml } from "@/lib/page-mode"

type Props = {
  tab: DocTab
  recoveryInfo?: { tempContent: string; originalContent: string; tempSavedAt: string } | null
}

export function DocTabContent({ tab, recoveryInfo }: Props) {
  const { updateTabContent, setTabDirty, setRecoveryDismissed } = useTabs()
  const [content, setContent] = useState(tab.content || "")
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [dismissed, setDismissed] = useState(false)
  const showRecovery = !!recoveryInfo && !tab.recoveryDismissed && !dismissed
  const [editor, setEditor] = useState<Editor | null>(null)
  const [pageMode, setPageMode] = useState<PageMode>(() =>
    pageModeFromHtml(tab.content || "")
  )
  const [marginPresetId, setMarginPresetId] = useState<MarginPresetId>(DEFAULT_MARGIN_PRESET)
  const [loading, setLoading] = useState(!tab.content)
  const sidebar = useSidebar()
  const editorRef = useRef<Editor | null>(null)

  const { markSaved } = useAutoSave(tab.root, tab.filePath, content, setAutoSaveStatus)

  const [loadAttempted, setLoadAttempted] = useState(false)

  useEffect(() => {
    if (tab.content || !tab.root || !tab.filePath) return
    if (loadAttempted) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadAttempted(true)
    readMdFile(tab.root, tab.filePath)
      .then(async (md) => {
        setPageMode(pageModeFromMarkdown(md))
        const html = await mdToHtml(md)
        setContent(html)
        updateTabContent(tab.id, html)
      })
      .catch(() => {
        // 파일이 없으면 그냥 빈 상태 유지
      })
      .finally(() => setLoading(false))
  }, [tab.id, tab.root, tab.filePath, tab.content, updateTabContent, loadAttempted])

  const breadcrumbParts = (() => {
    const parts = tab.filePath.replace(/\\/g, "/").split("/")
    return parts
  })()

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await saveMdFile(tab.root, tab.filePath, content)
      markSaved(content)
      setHasUnsaved(false)
      setTabDirty(tab.id, false)
      toast.success("저장 완료")
    } catch (e) {
      toast.error("저장 실패", { description: String(e) })
    } finally {
      setIsSaving(false)
    }
  }, [tab.root, tab.filePath, tab.id, content, setTabDirty, markSaved])

  const handleContentChange = useCallback(
    (html: string) => {
      setContent(html)
      setHasUnsaved(true)
      updateTabContent(tab.id, html)
    },
    [tab.id, updateTabContent]
  )

  const handleRecoveryApply = useCallback(async () => {
    const result = await applyTempToOriginal(tab.root, tab.filePath)
    if (result.success) {
      toast.success("복구 완료")
      if (recoveryInfo?.tempContent && editorRef.current) {
        const html = await mdToHtml(recoveryInfo.tempContent)
        editorRef.current.commands.setContent(html, { emitUpdate: false })
        setContent(html)
        updateTabContent(tab.id, html)
        markSaved(editorRef.current.getHTML())
      }
      setHasUnsaved(false)
      setRecoveryDismissed(tab.id, true)
    } else {
      toast.error("복구 실패", { description: result.error })
    }
  }, [tab.root, tab.filePath, recoveryInfo, tab.id, updateTabContent, setRecoveryDismissed, markSaved])

  const handleRecoveryDiscard = useCallback(async () => {
    await discardTempFile(tab.root, tab.filePath)
    localStorage.removeItem(LOCALSTORAGE_PREFIX + tab.filePath)
    if (recoveryInfo?.originalContent && editorRef.current) {
      const originalHtml = await mdToHtml(recoveryInfo.originalContent)
        editorRef.current.commands.setContent(originalHtml, { emitUpdate: false })
        setContent(originalHtml)
        updateTabContent(tab.id, originalHtml)
        markSaved(editorRef.current.getHTML())
    }
    setRecoveryDismissed(tab.id, true)
    setHasUnsaved(false)
    toast.info("임시 파일이 삭제되었습니다")
  }, [tab.root, tab.filePath, recoveryInfo, tab.id, updateTabContent, setRecoveryDismissed, markSaved])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <RecoveryDialog
        open={showRecovery}
        onApply={handleRecoveryApply}
        onDiscard={handleRecoveryDiscard}
        onClose={() => setDismissed(true)}
        originalContent={recoveryInfo?.originalContent || ""}
        tempContent={recoveryInfo?.tempContent || ""}
        tempSavedAt={recoveryInfo?.tempSavedAt || ""}
      />
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0 print:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => sidebar.setOpen(!sidebar.open)}
            aria-label="Toggle sidebar"
            className="hidden md:inline-flex shrink-0"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
          <nav className="flex items-center gap-1 text-sm text-muted-foreground min-w-0">
            {breadcrumbParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1 truncate">
                {i > 0 && <span className="text-muted-foreground/50 shrink-0">/</span>}
                <span
                  className={cn(
                    "truncate",
                    i === breadcrumbParts.length - 1 && "text-foreground font-medium"
                  )}
                >
                  {part}
                </span>
              </span>
            ))}
          </nav>
          {hasUnsaved && (
            <Badge variant="outline" className="text-xs shrink-0">
              수정됨
            </Badge>
          )}
          <AutoSaveIndicator status={autoSaveStatus} />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto min-w-0">
          <EditorToolbar editor={editor} pageMode={pageMode} onPageModeChange={setPageMode} marginPresetId={marginPresetId} onMarginPresetChange={setMarginPresetId} />
          <Button onClick={handleSave} disabled={isSaving} size="sm" className="shrink-0">
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            저장
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-auto print:overflow-visible">
        <TiptapEditor
          content={content}
          onChange={handleContentChange}
          onSave={handleSave}
          onEditorReady={(e) => { setEditor(e); editorRef.current = e }}
          pageMode={pageMode}
          marginPresetId={marginPresetId}
        />
      </div>
    </>
  )
}
