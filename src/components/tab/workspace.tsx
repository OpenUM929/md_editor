"use client"

import { useEffect } from "react"
import { useTabs } from "@/lib/tab-context"
import { TabBar } from "./tab-bar"
import { DocTabContent } from "./doc-tab-content"
import { TemplatePreviewTab } from "./template-preview-tab"

type Props = {
  rootDir: string
  filePath: string
  initialContent: string
  recoveryInfo: { tempContent: string; originalContent: string; tempSavedAt: string } | null
  error?: string
}

export function Workspace({ rootDir, filePath, initialContent, recoveryInfo, error }: Props) {
  const { openDoc, tabs, activeTabId } = useTabs()
  const isFileNotFound = !!error && error.includes("파일을 찾을 수 없습니다")

  useEffect(() => {
    if (error) return
    if (!filePath) return
    openDoc(rootDir, filePath, initialContent)
  }, [rootDir, filePath, initialContent, error, openDoc])

  const activeTab = tabs.find((t) => t.id === activeTabId)

  // A template tab must always render, even if a document error exists.
  if (activeTab?.type === "template") {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <TabBar />
        <TemplatePreviewTab key={activeTab.id} tab={activeTab} />
      </div>
    )
  }

  if (isFileNotFound) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-lg font-medium text-muted-foreground">파일을 찾을 수 없습니다</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            &quot;{filePath}&quot; 파일이 현재 워크스페이스에 없습니다.
          </p>
          <p className="mt-2 text-xs text-muted-foreground/60">
            사이드바의 가져오기 버튼으로 기존 .md 파일을 불러올 수 있습니다.
          </p>
        </div>
      </div>
    )
  }

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
    <div className="flex flex-1 flex-col overflow-hidden">
      <TabBar />
      {activeTab ? (
        <DocTabContent
          key={activeTab.id}
          tab={activeTab}
          recoveryInfo={activeTab.filePath === filePath ? recoveryInfo : null}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <div className="text-center">
            <h2 className="text-lg font-medium">파일을 선택하세요</h2>
            <p className="mt-1 text-sm">
              좌측 파일 트리에서 .md 파일을 선택하거나 템플릿을 열어 작업을 시작하세요.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
