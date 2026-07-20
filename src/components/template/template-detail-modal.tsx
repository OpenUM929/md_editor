"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, ArrowLeft } from "lucide-react"
import { getTemplateContent } from "@/lib/templates-client"
import type { TemplateMeta, TemplateDetail } from "@/lib/types"

type Props = {
  template: TemplateMeta | null
  onClose: () => void
  onUse: (template: TemplateMeta) => void
  usingSlug: string | null
}

export function TemplateDetailModal({ template, onClose, onUse, usingSlug }: Props) {
  const [detail, setDetail] = useState<TemplateDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!template) return
    getTemplateContent(template.relativePath)
      .then((result) => setDetail(result))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [template])

  if (!template) return null

  return (
    <Dialog key={template.relativePath} open={!!template} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent style={{ maxWidth: "70rem" }} className="max-h-[90vh] w-[95vw] flex flex-col">
        <DialogHeader className="flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon-sm" onClick={onClose} title="뒤로">
              <ArrowLeft className="size-4" />
            </Button>
            <DialogTitle className="truncate">{template.title}</DialogTitle>
          </div>
          <Button
            size="sm"
            onClick={() => onUse(template)}
            disabled={usingSlug === template.slug}
            className="shrink-0"
          >
            {usingSlug === template.slug ? (
              <Loader2 className="size-3 animate-spin mr-1" />
            ) : null}
            사용하기
          </Button>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-6">
              {detail?.description && (
                <p className="text-sm text-muted-foreground mb-4">{detail.description}</p>
              )}
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <article className="prose prose-sm dark:prose-invert max-w-none">
                  {detail?.body ? (
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {detail.body}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground">내용을 불러올 수 없습니다.</p>
                  )}
                </article>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
