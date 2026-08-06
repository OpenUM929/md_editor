"use client"

import { useState, useCallback } from "react"
import { FileTree } from "@/components/file-tree/file-tree"
import { RootFolderSelector } from "@/components/file-tree/root-folder-selector"
import { TemplateTab } from "@/components/template/template-tab"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Moon, Sun, PanelLeftClose, FileText, LayoutTemplate } from "lucide-react"
import { useTheme } from "next-themes"
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context"
import { TabProvider, useTabs } from "@/lib/tab-context"
import { WorkspaceProvider, useWorkspace } from "@/components/workspace/workspace-provider"
import { FolderSetup } from "@/components/workspace/folder-setup"
import { FileTreeContextProvider, useFileTreeSelection } from "@/components/file-tree/file-tree-context"
import { importDocuments, importBinaryFiles, getRootPath } from "@/lib/fs-access"
import { mdToHtml } from "@/lib/markdown"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { relocateImportedImages, locateMissingImages, promptForMissingImages, type MissingImage } from "@/lib/import-image-relocation"
import { AuthGate } from "@/components/auth/auth-gate"

type SidebarTab = "files" | "templates"

type PendingImage = MissingImage

function SidebarInner() {
  const { open, setOpen } = useSidebar()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<SidebarTab>("files")
  const [reloadCounter, setReloadCounter] = useState(0)
  const reload = useCallback(() => setReloadCounter((c) => c + 1), [])
  const selection = useFileTreeSelection()
  const [dragOver, setDragOver] = useState(false)
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const { openDoc } = useTabs()

  const handlePickImageFolder = useCallback(async (missing: PendingImage[]) => {
    if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
      toast.error("이 브라우저는 폴더 선택을 지원하지 않습니다")
      return
    }

    try {
      const dirHandle = await window.showDirectoryPicker()
      const found = await locateMissingImages(dirHandle, missing)

      if (found.length > 0) {
        await importBinaryFiles(found)
        reload()
        toast.success(`${found.length}개 이미지를 img. 폴더로 가져왔습니다`)
      } else {
        toast.error("선택한 폴더에서 참조된 이미지를 찾지 못했습니다")
      }
      setPendingImages([])
    } catch {
      setPendingImages([])
    }
  }, [reload])

  const handleSidebarDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.types.includes("Files")) {
      e.dataTransfer.dropEffect = "copy"
      setDragOver(true)
    }
  }, [])

  const handleSidebarDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget === e.target) {
      setDragOver(false)
    }
  }, [])

  const handleSidebarDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    type ImportEntry =
      | { kind: "md"; path: string; content: string }
      | { kind: "binary"; path: string; data: ArrayBuffer }

    const entries: ImportEntry[] = []

    for (const file of Array.from(files)) {
      let relativePath = file.name
      const webkitPath = (file as { webkitRelativePath?: string }).webkitRelativePath
      if (webkitPath) {
        const parts = webkitPath.split("/")
        relativePath = parts.length > 1 ? parts.slice(1).join("/") : file.name
      }

      if (file.name.endsWith(".md")) {
        const content = await file.text()
        entries.push({ kind: "md", path: relativePath, content })
      } else {
        const data = await file.arrayBuffer()
        entries.push({ kind: "binary", path: relativePath, data })
      }
    }

    if (entries.length === 0) {
      toast.error("가져올 파일이 없습니다")
      return
    }

    try {
      const mdFiles = entries.filter((f): f is { kind: "md"; path: string; content: string } => f.kind === "md")
      const binaryFiles = entries.filter((f): f is { kind: "binary"; path: string; data: ArrayBuffer } => f.kind === "binary")

      const { rewrittenMdFiles, relocatedBinaryFiles, passthroughBinaryFiles, missingImages, relocatedCount } =
        relocateImportedImages(mdFiles, binaryFiles)

      // 참조 이미지가 함께 드롭되지 않았다면, 파일을 쓰기 전에 바로 원본 폴더 선택을 유도한다.
      const { found: promptFound, stillMissing } = await promptForMissingImages(missingImages)

      await importDocuments(rewrittenMdFiles)

      const allBinary = [...relocatedBinaryFiles, ...passthroughBinaryFiles, ...promptFound]
      if (allBinary.length > 0) {
        await importBinaryFiles(allBinary)
      }

      reload()

      const missingCount = new Set(stillMissing.map(m => m.resolvedPath)).size
      const msg = [
        `${mdFiles.length + binaryFiles.length}개 파일을 가져왔습니다`,
        relocatedCount + promptFound.length > 0 ? `이미지 ${relocatedCount + promptFound.length}개를 img. 폴더로 이동` : "",
        missingCount > 0 ? `이미지 ${missingCount}개 누락` : "",
      ].filter(Boolean).join(". ")
      toast.success(msg)

      if (rewrittenMdFiles.length > 0) {
        const first = rewrittenMdFiles[0]
        const html = await mdToHtml(first.content)
        openDoc(getRootPath() || "", first.path, html)
      }

      if (stillMissing.length > 0) {
        setPendingImages(stillMissing)
      }
    } catch (err) {
      toast.error("가져오기 실패", { description: String(err) })
    }
  }, [reload, openDoc])

  return (
    <FileTreeContextProvider value={{ reload, reloadCounter, ...selection }}>
    <div
      onDragOver={handleSidebarDragOver}
      onDragLeave={handleSidebarDragLeave}
      onDrop={handleSidebarDrop}
      className={cn(
        "flex flex-col flex-1 min-h-0",
        dragOver && "ring-2 ring-inset ring-primary/50 bg-primary/5"
      )}
    >
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
          {pendingImages.length > 0 && (
            <div className="mx-2 mb-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              <p className="font-medium">
                {new Set(pendingImages.map((m) => m.resolvedPath)).size}개 이미지가 누락됩니다. img. 폴더에서 찾아주세요.
              </p>
              <div className="mt-1 flex gap-2">
                <button
                  onClick={() => handlePickImageFolder(pendingImages)}
                  className="underline hover:no-underline"
                >
                  폴더 선택
                </button>
                <button
                  onClick={() => setPendingImages([])}
                  className="underline hover:no-underline"
                >
                  무시
                </button>
              </div>
            </div>
          )}
          <Separator />
          <div className="flex-1 overflow-y-auto">
            <FileTree />
          </div>
        </>
      ) : (
        <TemplateTab />
      )}
    </div>
    </FileTreeContextProvider>
  )
}

function ResizeHandle() {
  const { width, setWidth } = useSidebar()

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width

    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    const onPointerMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX
      const newWidth = Math.min(500, Math.max(150, startWidth + delta))
      setWidth(newWidth)
    }

    const onPointerUp = () => {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      document.removeEventListener("pointermove", onPointerMove)
      document.removeEventListener("pointerup", onPointerUp)
    }

    document.addEventListener("pointermove", onPointerMove)
    document.addEventListener("pointerup", onPointerUp)
  }, [width, setWidth])

  return (
    <div
      onPointerDown={onPointerDown}
      className="absolute right-0 top-0 bottom-0 w-1.5 z-10 cursor-col-resize"
    >
      <div className="absolute inset-y-0 -left-1 w-3 hover:bg-primary/30 active:bg-primary/50 transition-colors" />
    </div>
  )
}

function MarkdownLayoutInner({ children }: { children: React.ReactNode }) {
  const { open, width } = useSidebar()
  const { ready } = useWorkspace()

  return (
    <TabProvider>
      <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible">
        {open && ready && (
          <aside
            data-layout="사이드바"
            data-ui-file="src/app/(markdown)/layout.tsx"
            style={{ width }}
            className="relative hidden shrink-0 border-r bg-sidebar print:hidden md:flex md:flex-col"
          >
            <ResizeHandle />
            <SidebarInner />
          </aside>
        )}

        <main
          data-layout="워크스페이스"
          data-ui-file="src/app/(markdown)/layout.tsx"
          className="flex flex-1 flex-col overflow-hidden print:overflow-visible"
        >
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
    <AuthGate>
      <WorkspaceProvider>
        <FolderSetup />
        <SidebarProvider>
          <MarkdownLayoutInner>{children}</MarkdownLayoutInner>
        </SidebarProvider>
      </WorkspaceProvider>
    </AuthGate>
  )
}
