"use client"

import { useState, useCallback } from "react"
import { FileTree } from "@/components/file-tree/file-tree"
import { RootFolderSelector } from "@/components/file-tree/root-folder-selector"
import { TemplateTab } from "@/components/template/template-tab"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Menu, PanelLeftClose, FileText, LayoutTemplate } from "lucide-react"
import { useTheme } from "next-themes"
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context"
import { TabProvider } from "@/lib/tab-context"
import { WorkspaceProvider, useWorkspace } from "@/components/workspace/workspace-provider"
import { FolderSetup } from "@/components/workspace/folder-setup"
import { FileTreeContextProvider } from "@/components/file-tree/file-tree-context"

type SidebarTab = "files" | "templates"

function SidebarInner() {
  const { open, setOpen } = useSidebar()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<SidebarTab>("files")
  const [reloadCounter, setReloadCounter] = useState(0)
  const reload = useCallback(() => setReloadCounter((c) => c + 1), [])

  return (
    <FileTreeContextProvider value={{ reload, reloadCounter }}>
    <>
      <div className="flex items-center justify-between p-3">
        <span className="text-sm font-semibold">MD Editor</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle dark mode"
          >
            <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(!open)}
            aria-label="Toggle sidebar"
            className="hidden md:inline-flex"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("files")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            activeTab === "files"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="size-3.5" />
          Files
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            activeTab === "templates"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutTemplate className="size-3.5" />
          Templates
        </button>
      </div>

      {activeTab === "files" ? (
        <>
          <RootFolderSelector />
          <Separator />
          <div className="flex-1 overflow-y-auto">
            <FileTree />
          </div>
        </>
      ) : (
        <TemplateTab />
      )}
    </>
    </FileTreeContextProvider>
  )
}

function MarkdownLayoutInner({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar()
  const { ready } = useWorkspace()

  return (
    <TabProvider>
      <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible">
        {open && ready && (
          <aside className="hidden w-64 shrink-0 border-r bg-sidebar print:hidden md:flex md:flex-col">
            <SidebarInner />
          </aside>
        )}

        <Sheet>
          <SheetTrigger className="absolute top-2 left-2 z-10 flex size-8 items-center justify-center rounded-md hover:bg-muted print:hidden md:hidden">
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarInner />
          </SheetContent>
        </Sheet>

        <main className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
          {ready ? children : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              워크스페이스 폴더를 선택해 주세요
            </div>
          )}
        </main>
      </div>
    </TabProvider>
  )
}

export default function MarkdownLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <FolderSetup />
      <SidebarProvider>
        <MarkdownLayoutInner>{children}</MarkdownLayoutInner>
      </SidebarProvider>
    </WorkspaceProvider>
  )
}
