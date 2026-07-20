"use client"

import { useTabs } from "@/lib/tab-context"
import { cn } from "@/lib/utils"
import { FileText, LayoutTemplate, X } from "lucide-react"
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"

export function TabBar() {
  const {
    tabs,
    activeTabId,
    activateTab,
    closeTab,
    closeTabsToRight,
    closeTabsToLeft,
    closeOthers,
    closeAll,
  } = useTabs()

  if (tabs.length === 0) return null

  return (
    <div className="flex items-center border-b bg-muted/30 overflow-x-auto shrink-0 print:hidden">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        const icon =
          tab.type === "doc" ? (
            <FileText className="size-3.5 shrink-0 text-muted-foreground/60" />
          ) : (
            <LayoutTemplate className="size-3.5 shrink-0 text-muted-foreground/60" />
          )

        return (
          <ContextMenu key={tab.id}>
            <ContextMenuTrigger>
              <div
                role="button"
                tabIndex={0}
                data-active={isActive}
                onClick={() => activateTab(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    activateTab(tab.id)
                  }
                }}
                className={cn(
                  "group relative flex items-center gap-1.5 px-3 py-1.5 text-xs border-r cursor-pointer whitespace-nowrap transition-colors shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  isActive
                    ? "bg-background text-foreground border-b-2 border-b-primary"
                    : "bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                {icon}
                <span className="truncate max-w-28">{tab.title}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                  className={cn(
                    "ml-1 rounded-sm p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted-foreground/20",
                    isActive && "opacity-100"
                  )}
                  title="닫기"
                >
                  <X className="size-3" />
                </button>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent align="start" side="bottom" sideOffset={0}>
              <ContextMenuItem onClick={() => closeTab(tab.id)}>닫기</ContextMenuItem>
              <ContextMenuItem onClick={() => closeTabsToRight(tab.id)}>
                오른쪽 탭 닫기
              </ContextMenuItem>
              <ContextMenuItem onClick={() => closeTabsToLeft(tab.id)}>
                왼쪽 탭 닫기
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => closeOthers(tab.id)}>
                다른 탭 모두 닫기
              </ContextMenuItem>
              <ContextMenuItem variant="destructive" onClick={() => closeAll()}>
                모두 닫기
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        )
      })}
    </div>
  )
}
