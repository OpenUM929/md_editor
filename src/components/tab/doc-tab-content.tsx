"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { EditorToolbar } from "@/components/editor/editor-toolbar"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { AutoSaveIndicator } from "@/components/editor/auto-save-indicator"
import { RecoveryDialog } from "@/components/editor/recovery-dialog"
import { useAutoSave } from "@/hooks/use-auto-save"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Save, Loader2, PanelLeftOpen } from "lucide-react"
import { toast } from "sonner"
import { saveMdFile, applyTempToOriginal, discardTempFile, readMdFile, saveHwpxBlob, saveBinaryFile, isPathMode, revealInFolder, getRootPath } from "@/lib/fs-access"
import { useSidebar } from "@/lib/sidebar-context"
import { useTabs, type DocTab } from "@/lib/tab-context"
import { cn } from "@/lib/utils"
import { htmlToMd, mdToHtml, injectFrontmatter, frontmatterFromMarkdown, frontmatterFromHtml } from "@/lib/markdown"
import { resolveImageSrcs } from "@/lib/doc-image"
import { LOCALSTORAGE_PREFIX } from "@/lib/constants"
import type { Editor } from "@tiptap/react"
import type { MarginPresetId } from "@/lib/a4-margins"
import { DEFAULT_MARGIN_PRESET } from "@/lib/a4-margins"
import type { PageMode } from "@/lib/page-mode"
import { pageModeFromMarkdown, pageModeFromHtml } from "@/lib/page-mode"
import type { ReportTheme } from "@/lib/report-theme"
import { reportThemeFromMarkdown, reportThemeFromHtml } from "@/lib/report-theme"
import { headingNumberingFromMarkdown, headingNumberingFromHtml } from "@/lib/heading-numbering"
import { getDefaultHwpxFileName } from "@/lib/hwpx-export"
import { mdToDocxBlob, getDefaultDocxFileName } from "@/lib/docx-export"

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
  const [reportTheme, setReportTheme] = useState<ReportTheme>(() =>
    reportThemeFromHtml(tab.content || "")
  )
  const [headingNumbering, setHeadingNumbering] = useState<boolean>(() =>
    headingNumberingFromHtml(tab.content || "")
  )
  const [frontmatter, setFrontmatter] = useState<Record<string, unknown>>(() =>
    frontmatterFromHtml(tab.content || "")
  )
  const [loading, setLoading] = useState(!tab.content)
  const sidebar = useSidebar()
  const editorRef = useRef<Editor | null>(null)

  // 저장/자동저장에 넘길 HTML: 편집기 출력에 프론트매터(양식 선택 등)를 다시 심는다.
  // Tiptap 이 template 노드를 떨궈내므로, 지속 경계에서 한 번 재부착해 왕복을 보장한다.
  const contentForPersist = useMemo(
    () => injectFrontmatter(content, frontmatter),
    [content, frontmatter]
  )

  const { markSaved } = useAutoSave(tab.root, tab.filePath, contentForPersist, setAutoSaveStatus)

  const [loadAttempted, setLoadAttempted] = useState(false)

  useEffect(() => {
    if (tab.content || !tab.root || !tab.filePath) return
    if (loadAttempted) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadAttempted(true)
    readMdFile(tab.root, tab.filePath)
      .then(async (md) => {
        setPageMode(pageModeFromMarkdown(md))
        setReportTheme(reportThemeFromMarkdown(md))
        setHeadingNumbering(headingNumberingFromMarkdown(md))
        setFrontmatter(frontmatterFromMarkdown(md))
        const html = resolveImageSrcs(await mdToHtml(md), tab.filePath)
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
      await saveMdFile(tab.root, tab.filePath, contentForPersist)
      markSaved(contentForPersist)
      setHasUnsaved(false)
      setTabDirty(tab.id, false)
      // 저장 위치를 알려주고, 경로 모드에선 해당 폴더를 탐색기로 바로 열 수 있게 한다.
      const rootPath = getRootPath()
      const displayPath = rootPath
        ? `${rootPath}/${tab.filePath}`.replace(/\//g, "\\")
        : tab.filePath
      toast.success("저장 완료", {
        description: displayPath,
        action: isPathMode()
          ? { label: "폴더 열기", onClick: () => { void revealInFolder(tab.filePath) } }
          : undefined,
      })
    } catch (e) {
      toast.error("저장 실패", { description: String(e) })
    } finally {
      setIsSaving(false)
    }
  }, [tab.root, tab.filePath, tab.id, contentForPersist, setTabDirty, markSaved])

  const handleContentChange = useCallback(
    (html: string) => {
      setContent(html)
      setHasUnsaved(true)
      // Tiptap 은 getHTML()에서 <template data-frontmatter> 를 떨궈낸다. 비활성 탭은
      // 언마운트되어 재마운트 시 모든 상태(테마/페이지모드)를 tab.content 에서 재구성하므로,
      // 탭 저장본에는 프론트매터를 반드시 재부착해야 테마가 유실되지 않는다.
      updateTabContent(tab.id, injectFrontmatter(html, frontmatter))
    },
    [tab.id, updateTabContent, frontmatter]
  )

  // 양식(테마) 변경 → 라이브 클래스 갱신 + 프론트매터 반영(저장 시 지속) + 수정됨 표시
  const handleReportThemeChange = useCallback((theme: ReportTheme) => {
    setReportTheme(theme)
    setFrontmatter((fm) => {
      const next = { ...fm }
      if (theme === "plain") delete next.reportTheme
      else next.reportTheme = theme
      // 편집 없이 곧바로 탭 전환해도 테마가 유실되지 않도록 tab.content 에 즉시 반영.
      updateTabContent(tab.id, injectFrontmatter(content, next))
      return next
    })
    setHasUnsaved(true)
    setTabDirty(tab.id, true)
  }, [tab.id, setTabDirty, updateTabContent, content])

  // 번호 매기기 토글 → 라이브 클래스 갱신 + 프론트매터 반영(저장 시 지속) + 수정됨 표시
  const handleHeadingNumberingChange = useCallback((enabled: boolean) => {
    setHeadingNumbering(enabled)
    setFrontmatter((fm) => {
      const next = { ...fm }
      if (!enabled) delete next.headingNumbering
      else next.headingNumbering = true
      updateTabContent(tab.id, injectFrontmatter(content, next))
      return next
    })
    setHasUnsaved(true)
    setTabDirty(tab.id, true)
  }, [tab.id, setTabDirty, updateTabContent, content])

  const handleRecoveryApply = useCallback(async () => {
    const result = await applyTempToOriginal(tab.root, tab.filePath)
    if (result.success) {
      toast.success("복구 완료")
      if (recoveryInfo?.tempContent && editorRef.current) {
        const html = resolveImageSrcs(await mdToHtml(recoveryInfo.tempContent), tab.filePath)
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
      const originalHtml = resolveImageSrcs(await mdToHtml(recoveryInfo.originalContent), tab.filePath)
        editorRef.current.commands.setContent(originalHtml, { emitUpdate: false })
        setContent(originalHtml)
        updateTabContent(tab.id, originalHtml)
        markSaved(editorRef.current.getHTML())
    }
    setRecoveryDismissed(tab.id, true)
    setHasUnsaved(false)
    toast.info("임시 파일이 삭제되었습니다")
  }, [tab.root, tab.filePath, recoveryInfo, tab.id, updateTabContent, setRecoveryDismissed, markSaved])

  const handleSaveHwpx = useCallback(async () => {
    try {
      const md = htmlToMd(contentForPersist)
      const hwpxPath = getDefaultHwpxFileName(tab.filePath)
      if (isPathMode()) {
        const res = await fetch("/api/export/hwpx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: md, theme: reportTheme, marginPreset: marginPresetId, root: tab.root, savePath: hwpxPath, title: frontmatter.title as string || undefined }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "HWPX 저장 실패" }))
          throw new Error(err.error)
        }
      } else {
        // FSA 모드: 브라우저가 디렉터리 핸들을 쥐고 있으므로 서버는 바이너리만 생성/반환한다.
        // (HWPX 는 공인 라이브러리 python-hwpx 로 서버에서만 생성 — 수제 OWPML 폐기.)
        const res = await fetch("/api/export/hwpx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: md, theme: reportTheme, marginPreset: marginPresetId, title: frontmatter.title as string || undefined }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "HWPX 저장 실패" }))
          throw new Error(err.error)
        }
        const hwpxBlob = await res.blob()
        await saveHwpxBlob(tab.root, hwpxPath, hwpxBlob)
      }
      toast.success("HWPX 저장 완료", {
        description: hwpxPath,
        action: isPathMode()
          ? { label: "폴더 열기", onClick: () => { void revealInFolder(hwpxPath) } }
          : undefined,
      })
    } catch (e) {
      toast.error("HWPX 저장 실패", { description: String(e) })
    }
  }, [contentForPersist, reportTheme, marginPresetId, tab.root, tab.filePath, frontmatter.title])

  const handleSaveDocx = useCallback(async () => {
    try {
      const md = htmlToMd(contentForPersist)
      const docxPath = getDefaultDocxFileName(tab.filePath)
      const title = (frontmatter.title as string) || undefined
      if (isPathMode()) {
        const res = await fetch("/api/export/docx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: md, theme: reportTheme, marginPreset: marginPresetId, root: tab.root, savePath: docxPath, title }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Word 저장 실패" }))
          throw new Error(err.error)
        }
      } else {
        const blob = await mdToDocxBlob(md, reportTheme, marginPresetId, title)
        await saveBinaryFile(tab.root, docxPath, blob)
      }
      toast.success("Word(.docx) 저장 완료", {
        description: docxPath,
        action: isPathMode()
          ? { label: "폴더 열기", onClick: () => { void revealInFolder(docxPath) } }
          : undefined,
      })
    } catch (e) {
      toast.error("Word 저장 실패", { description: String(e) })
    }
  }, [contentForPersist, reportTheme, marginPresetId, tab.root, tab.filePath, frontmatter.title])

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
          <EditorToolbar editor={editor} pageMode={pageMode} onPageModeChange={setPageMode} marginPresetId={marginPresetId} onMarginPresetChange={setMarginPresetId} reportTheme={reportTheme} onReportThemeChange={handleReportThemeChange} headingNumbering={headingNumbering} onHeadingNumberingChange={handleHeadingNumberingChange} onSaveHwpx={handleSaveHwpx} onSaveDocx={handleSaveDocx} />
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
          reportTheme={reportTheme}
          headingNumbering={headingNumbering}
        />
      </div>
    </>
  )
}
