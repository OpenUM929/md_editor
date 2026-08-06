"use client"

import { useState, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Loader2, FileText, LayoutTemplate, ChevronDown, ChevronRight, Eye } from "lucide-react"
import { getTemplates } from "@/lib/templates-client"
import type { TemplateGroup } from "@/lib/types"
import { useTabs } from "@/lib/tab-context"
import { TemplateBrowserModal } from "./template-browser-modal"

export function TemplateTab() {
  const [groups, setGroups] = useState<TemplateGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [showBrowser, setShowBrowser] = useState(false)
  const { openTemplate } = useTabs()

  useEffect(() => {
    getTemplates()
      .then((result) => {
        setGroups(result)
        const all = new Set(result.map((g) => g.topic))
        setExpandedTopics(all)
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false))
  }, [])

  const toggleTopic = (topic: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev)
      if (next.has(topic)) next.delete(topic)
      else next.add(topic)
      return next
    })
  }

  return (
    <>
      <div
        data-layout="템플릿 탭"
        data-ui-file="src/components/template/template-tab.tsx"
        className="px-3 py-3"
      >
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-sm"
          onClick={() => setShowBrowser(true)}
        >
          <LayoutTemplate className="size-4" />
          템플릿 찾아보기
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <div className="px-3 py-4 text-sm text-muted-foreground">
            사용 가능한 템플릿이 없습니다.
          </div>
        ) : (
          <div className="px-2 py-2 space-y-1">
            {groups.map((group) => (
              <div key={group.topic}>
                <button
                  onClick={() => toggleTopic(group.topic)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  {expandedTopics.has(group.topic) ? (
                    <ChevronDown className="size-3" />
                  ) : (
                    <ChevronRight className="size-3" />
                  )}
                  <span className="flex-1 text-left">{group.displayName}</span>
                  <span className="text-[10px] text-muted-foreground/60">{group.templates.length}</span>
                </button>

                {expandedTopics.has(group.topic) && (
                  <div className="ml-4 space-y-0.5 mt-0.5">
                    {group.templates.map((tmpl) => (
                      <button
                        key={tmpl.relativePath}
                        onClick={() => openTemplate(tmpl)}
                        className="group flex w-full items-center gap-1.5 rounded-md px-2 py-1 hover:bg-muted transition-colors text-left"
                      >
                        <FileText className="size-3 shrink-0 text-muted-foreground/60" />
                        <span className="flex-1 truncate text-xs">{tmpl.title}</span>
                        <Eye className="size-3 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <TemplateBrowserModal open={showBrowser} onOpenChange={setShowBrowser} />
    </>
  )
}
