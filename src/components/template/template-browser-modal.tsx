"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { Loader2, FileText, Eye } from "lucide-react"
import { getTemplates, createFileFromTemplate } from "@/lib/templates-client"
import type { TemplateGroup, TemplateMeta } from "@/lib/types"
import { useTabs } from "@/lib/tab-context"
import { TemplateDetailModal } from "./template-detail-modal"
import { useSearchParams } from "next/navigation"
import { DEFAULT_ROOT } from "@/lib/constants"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TemplateBrowserModal({ open, onOpenChange }: Props) {
  const [groups, setGroups] = useState<TemplateGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTopic, setActiveTopic] = useState("")
  const [usingSlug, setUsingSlug] = useState<string | null>(null)
  const [detailTemplate, setDetailTemplate] = useState<TemplateMeta | null>(null)
  const { openDoc } = useTabs()
  const searchParams = useSearchParams()
  const root = searchParams.get("root") || DEFAULT_ROOT

  useEffect(() => {
    if (!open) return
    getTemplates()
      .then((result) => {
        setGroups(result)
        if (result.length > 0 && !activeTopic) {
          setActiveTopic(result[0].topic)
        }
      })
      .catch(() => {
        setGroups([])
        toast.error("템플릿 목록을 불러오는데 실패했습니다")
      })
      .finally(() => setLoading(false))
  }, [open, activeTopic])

  const handleUse = useCallback(async (template: TemplateMeta) => {
    setUsingSlug(template.slug)
    try {
      const result = await createFileFromTemplate(root, template.relativePath, template.slug)
      if (result.success && result.filePath) {
        toast.success(`"${template.title}" 템플릿이 생성되었습니다`)
        onOpenChange(false)
        openDoc(root, result.filePath)
      } else {
        toast.error("파일 생성 실패", { description: result.error })
      }
    } catch {
      toast.error("파일 생성 중 오류가 발생했습니다")
    } finally {
      setUsingSlug(null)
    }
  }, [root, onOpenChange, openDoc])

  const activeGroup = groups.find((g) => g.topic === activeTopic)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent style={{ maxWidth: "56rem" }} className="max-h-[80vh] w-[90vw] flex flex-col">
          <DialogHeader>
            <DialogTitle>템플릿 찾아보기</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              사용 가능한 템플릿이 없습니다.
            </div>
          ) : (
            <>
              <div className="flex gap-1 border-b pb-2 overflow-x-auto">
                {groups.map((group) => (
                  <button
                    key={group.topic}
                    onClick={() => setActiveTopic(group.topic)}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeTopic === group.topic
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {group.displayName} ({group.templates.length})
                  </button>
                ))}
              </div>

              <ScrollArea className="flex-1 min-h-0">
                {activeGroup && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-1">
                    {activeGroup.templates.map((tmpl) => (
                      <div
                        key={tmpl.relativePath}
                        className="group relative rounded-lg border bg-card p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-2">
                          <FileText className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <h4 className="text-sm font-medium truncate">{tmpl.title}</h4>
                            {tmpl.description && (
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                {tmpl.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => handleUse(tmpl)}
                            disabled={usingSlug === tmpl.slug}
                          >
                            {usingSlug === tmpl.slug ? (
                              <Loader2 className="size-3 animate-spin mr-1" />
                            ) : null}
                            사용하기
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => setDetailTemplate(tmpl)}
                            title="상세 보기"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      <TemplateDetailModal
        template={detailTemplate}
        onClose={() => setDetailTemplate(null)}
        onUse={handleUse}
        usingSlug={usingSlug}
      />
    </>
  )
}
