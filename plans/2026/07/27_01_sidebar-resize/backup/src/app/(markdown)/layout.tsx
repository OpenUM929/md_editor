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
import { TabProvider, useTabs } from "@/lib/tab-context"
import { WorkspaceProvider, useWorkspace } from "@/components/workspace/workspace-provider"
import { FolderSetup } from "@/components/workspace/folder-setup"
import { FileTreeContextProvider, useFileTreeSelection } from "@/components/file-tree/file-tree-context"
import { importDocuments, importBinaryFiles, getRootPath, readMdFile } from "@/lib/fs-access"
import { mdToHtml } from "@/lib/markdown"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type SidebarTab = "files" | "templates"

type PendingImage = { mdPath: string; imageRef: string; resolvedPath: string }

function parseImageRefs(markdown: string): string[] {
  const refs: string[] = []
  const re = /!\[[^\]]*\]\(([^)]+)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(markdown)) !== null) {
    const src = m[1].trim()
    if (src && !/^(https?:|data:|blob:|#)/.test(src)) {
      refs.push(src)
    }
  }
  return [...new Set(refs)]
}

function resolveImagePaths(mdPath: string, refs: string[]): string[] {
  const docDir = mdPath.includes("/") ? mdPath.split("/").slice(0, -1).join("/") : ""
  return refs.map((ref) => {
    if (/^(https?:|data:|blob:)/.test(ref)) return ref
    const parts = (docDir ? docDir + "/" : "") + ref
    const stack: string[] = []
    for (const p of parts.split("/")) {
      if (p === "..") stack.pop()
      else if (p && p !== ".") stack.push(p)
    }
    return stack.join("/")
  })
}

async function findFileInDir(
  dir: FileSystemDirectoryHandle,
  targetPath: string
): Promise<File | null> {
  const parts = targetPath.split("/")
  let current = dir
  for (let i = 0; i < parts.length - 1; i++) {
    const entry = await current.getDirectoryHandle(parts[i]).catch(() => null)
    if (!entry) return null
    current = entry
  }
  const fileHandle = await current.getFileHandle(parts[parts.length - 1]).catch(() => null)
  return fileHandle ? await fileHandle.getFile() : null
}

function imgFolderName(mdPath: string): string {
  const name = mdPath.split("/").pop() || mdPath
  return `img.${name.replace(/\.md$/i, "")}`
}

function isInImgFolder(imagePath: string, mdPath: string): boolean {
  const folder = imgFolderName(mdPath)
  return imagePath.startsWith(folder + "/")
}

function computeImgDestPath(imagePath: string, mdPath: string): string {
  if (isInImgFolder(imagePath, mdPath)) return imagePath
  const folder = imgFolderName(mdPath)
  const fileName = imagePath.split("/").pop() || imagePath
  return `${folder}/${fileName}`
}

function rewriteImagePaths(markdown: string, mdPath: string): string {
  const folder = imgFolderName(mdPath)
  return markdown.replace(
    /(!\[[^\]]*\]\()([^)]+)(\))/g,
    (_match, prefix: string, src: string, suffix: string) => {
      const trimmed = src.trim()
      if (/^(https?:|data:|blob:|#)/.test(trimmed)) return prefix + src + suffix
      if (trimmed.startsWith(folder + "/")) return prefix + src + suffix
      const fileName = trimmed.split("/").pop() || trimmed
      return prefix + `${folder}/${fileName}` + suffix
    }
  )
}

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

      const mdMissingMap = new Map<string, PendingImage[]>()
      for (const m of missing) {
        if (!mdMissingMap.has(m.mdPath)) mdMissingMap.set(m.mdPath, [])
        mdMissingMap.get(m.mdPath)!.push(m)
      }

      const found: { path: string; data: ArrayBuffer }[] = []
      const mdUpdates: { path: string; content: string }[] = []

      for (const [mdPath, mdMissing] of mdMissingMap) {
        for (const img of mdMissing) {
          const file = await findFileInDir(dirHandle, img.resolvedPath)
          if (file) {
            const destPath = computeImgDestPath(img.resolvedPath, mdPath)
            found.push({ path: destPath, data: await file.arrayBuffer() })
          }
        }

        const current = await readMdFile(getRootPath() || "", mdPath)
        if (current !== null) {
          mdUpdates.push({ path: mdPath, content: rewriteImagePaths(current, mdPath) })
        }
      }

      if (found.length > 0) {
        await importBinaryFiles(found)
        if (mdUpdates.length > 0) {
          await importDocuments(mdUpdates)
        }
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

      const imgRelocMap = new Map<string, { mdPath: string; originalRef: string; newPath: string }[]>()
      for (const mdFile of mdFiles) {
        const refs = parseImageRefs(mdFile.content)
        const resolved = resolveImagePaths(mdFile.path, refs)
        for (let i = 0; i < refs.length; i++) {
          const imgPath = resolved[i]
          if (isInImgFolder(imgPath, mdFile.path)) continue
          const destPath = computeImgDestPath(imgPath, mdFile.path)
          if (!imgRelocMap.has(imgPath)) imgRelocMap.set(imgPath, [])
          imgRelocMap.get(imgPath)!.push({
            mdPath: mdFile.path,
            originalRef: refs[i],
            newPath: destPath,
          })
        }
      }

      const relocated: string[] = []
      const unrelocatedBinary: typeof binaryFiles = []
      for (const bf of binaryFiles) {
        const reloc = imgRelocMap.get(bf.path)
        if (reloc) {
          const destPath = reloc[0].newPath
          await importBinaryFiles([{ path: destPath, data: bf.data }])
          relocated.push(bf.path)
        } else {
          unrelocatedBinary.push(bf)
        }
      }

      const droppedBinaryPaths = new Set(binaryFiles.map(b => b.path))
      const missing: PendingImage[] = []
      for (const [imgPath, infos] of imgRelocMap) {
        if (!droppedBinaryPaths.has(imgPath) && !relocated.includes(imgPath)) {
          for (const info of infos) {
            missing.push({ mdPath: info.mdPath, imageRef: info.originalRef, resolvedPath: imgPath })
          }
        }
      }

      const rewrittenMdFiles = mdFiles.map(f => ({
        path: f.path,
        content: rewriteImagePaths(f.content, f.path),
      }))
      await importDocuments(rewrittenMdFiles)

      if (unrelocatedBinary.length > 0) {
        await importBinaryFiles(unrelocatedBinary.map(f => ({ path: f.path, data: f.data })))
      }

      reload()

      const relocatedCount = relocated.length
      const missingCount = new Set(missing.map(m => m.resolvedPath)).size
      const msg = [
        `${mdFiles.length + binaryFiles.length}개 파일을 가져왔습니다`,
        relocatedCount > 0 ? `이미지 ${relocatedCount}개를 img. 폴더로 이동` : "",
        missingCount > 0 ? `이미지 ${missingCount}개 누락` : "",
      ].filter(Boolean).join(". ")
      toast.success(msg)

      if (mdFiles.length > 0) {
        const first = mdFiles[0]
        const rewritten = rewriteImagePaths(first.content, first.path)
        const html = await mdToHtml(rewritten)
        openDoc(getRootPath() || "", first.path, html)
      }

      if (missing.length > 0) {
        setPendingImages(missing)
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
        "flex flex-col h-full",
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
