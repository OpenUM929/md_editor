"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeftToLine } from "lucide-react"
import { getTemplateContent, createFileFromTemplate } from "@/lib/templates-client"
import { mdToHtml } from "@/lib/markdown"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { DEFAULT_MARGIN_PRESET } from "@/lib/a4-margins"
import { type ReportTheme, reportThemeFromMarkdown } from "@/lib/report-theme"
import { useTabs, type TemplateTab } from "@/lib/tab-context"
import { getRootPath } from "@/lib/fs-access"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

type Props = {
  tab: TemplateTab
}

function TemplatePreviewTabInner({ tab }: Props) {
  const { setTemplateFetched, openDoc } = useTabs()
  const [loading, setLoading] = useState(!tab.fetched)
  const [html, setHtml] = useState("")
  const [using, setUsing] = useState(false)
  const [previewReportTheme, setPreviewReportTheme] = useState<ReportTheme>(() =>
    reportThemeFromMarkdown(tab.content || "")
  )
  const searchParams = useSearchParams()
  const root = searchParams.get("root") || getRootPath() || ""

  useEffect(() => {
    if (tab.fetched && tab.content) {
      // tab.content 는 원본 markdown(프론트매터 포함)임
      const theme = reportThemeFromMarkdown(tab.content)
      mdToHtml(tab.content).then((h) => {
        setHtml(h)
        setPreviewReportTheme(theme)
      })
      return
    }
    if (tab.fetched) return
    getTemplateContent(tab.templateRelativePath)
      .then(async (detail) => {
        if (!detail) {
          toast.error("템플릿 내용을 불러올 수 없습니다")
          return
        }
        const body = detail.body || ""
        setPreviewReportTheme(reportThemeFromMarkdown(body))
        setTemplateFetched(tab.id, body)
        const rendered = await mdToHtml(body)
        setHtml(rendered)
      })
      .catch(() => toast.error("템플릿 로딩 실패"))
      .finally(() => setLoading(false))
  }, [tab.id, tab.templateRelativePath, tab.fetched, tab.content, setTemplateFetched])

  const handleUse = useCallback(async () => {
    setUsing(true)
    try {
      const result = await createFileFromTemplate(root, tab.templateRelativePath, tab.title)
      if (result.success && result.filePath) {
        toast.success(`"${tab.title}" 템플릿이 생성되었습니다`)
        openDoc(root, result.filePath)
      } else {
        toast.error("파일 생성 실패", { description: result.error })
      }
    } catch {
      toast.error("파일 생성 중 오류가 발생했습니다")
    } finally {
      setUsing(false)
    }
  }, [root, tab.templateRelativePath, tab.title, openDoc])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeftToLine className="size-4" />
          <span className="font-medium text-foreground">{tab.title}</span>
          <span className="text-xs text-muted-foreground/60">템플릿 미리보기</span>
        </div>
        <Button size="sm" onClick={handleUse} disabled={using}>
          {using ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
          사용하기
        </Button>
      </div>
        <div className="flex-1 overflow-y-auto overflow-x-auto">
        <TiptapEditor
          content={html}
          pageMode="bunri"
          marginPresetId={DEFAULT_MARGIN_PRESET}
          reportTheme={previewReportTheme}
          editable={false}
        />
      </div>
    </div>
  )
}

export function TemplatePreviewTab({ tab }: Props) {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    }>
      <TemplatePreviewTabInner tab={tab} />
    </Suspense>
  )
}
