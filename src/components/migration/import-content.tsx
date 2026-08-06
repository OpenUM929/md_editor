"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, FileUp, FolderUp, CheckCircle, AlertTriangle } from "lucide-react"
import { importDocuments, importBinaryFiles, getRootPath } from "@/lib/fs-access"
import { toast } from "sonner"
import { useTabs } from "@/lib/tab-context"
import { useFileTree } from "@/components/file-tree/file-tree-context"
import { mdToHtml } from "@/lib/markdown"
import { relocateImportedImages, locateMissingImages, promptForMissingImages, type MissingImage } from "@/lib/import-image-relocation"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetFolder?: string
}

type ImportFile =
  | { kind: "md"; path: string; content: string }
  | { kind: "binary"; path: string; data: ArrayBuffer }

export async function readLocalDir(
  dir: FileSystemDirectoryHandle,
  prefix: string,
  result: ImportFile[]
): Promise<void> {
  for await (const [name, handle] of dir.entries()) {
    const entryPath = prefix ? `${prefix}/${name}` : name
    if (handle.kind === "directory") {
      await readLocalDir(handle as FileSystemDirectoryHandle, entryPath, result)
    } else if (handle.kind === "file") {
      const file = await (handle as FileSystemFileHandle).getFile()
      if (name.endsWith(".md")) {
        result.push({ kind: "md", path: entryPath, content: await file.text() })
      } else {
        const data = await file.arrayBuffer()
        result.push({ kind: "binary", path: entryPath, data })
      }
    }
  }
}

export function ImportContent({ open, onOpenChange, targetFolder }: Props) {
  const [files, setFiles] = useState<ImportFile[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [missingImages, setMissingImages] = useState<MissingImage[]>([])
  const [locatingImages, setLocatingImages] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { openDoc } = useTabs()
  const { reload } = useFileTree()

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    const entries: ImportFile[] = []

    for (const file of Array.from(fileList)) {
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
      toast.error("선택한 파일이 없습니다")
      return
    }

    setFiles(entries)
  }, [])

  const handleFolderSelect = useCallback(async () => {
    if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
      try {
        const dirHandle = await window.showDirectoryPicker()
        const entries: ImportFile[] = []
        await readLocalDir(dirHandle, "", entries)
        if (entries.length === 0) {
          toast.error("선택한 폴더에 가져올 파일이 없습니다")
          return
        }
        setFiles(entries)
        return
      } catch {
        // showDirectoryPicker 실패 시 fallback
      }
    }
    // fallback: webkitdirectory input
    if (fileInputRef.current) {
      const input = fileInputRef.current as HTMLInputElement & { webkitdirectory: boolean }
      input.webkitdirectory = true
      input.multiple = true
      input.click()
    }
  }, [])

  const handleFilePicker = useCallback(() => {
    if (!fileInputRef.current) return
    const input = fileInputRef.current as HTMLInputElement & { webkitdirectory: boolean }
    input.webkitdirectory = false
    input.multiple = true
    input.click()
  }, [])

  const handleImport = useCallback(async () => {
    setImporting(true)
    try {
      const mdFiles = files.filter((f): f is Extract<ImportFile, { kind: "md" }> => f.kind === "md")
      const binaryFiles = files.filter((f): f is Extract<ImportFile, { kind: "binary" }> => f.kind === "binary")

      const { rewrittenMdFiles, relocatedBinaryFiles, passthroughBinaryFiles, missingImages: missing } =
        relocateImportedImages(
          mdFiles.map(f => ({ path: f.path, content: f.content })),
          binaryFiles.map(f => ({ path: f.path, data: f.data }))
        )

      // 참조 이미지가 함께 선택되지 않았다면, 완료 화면까지 가기 전에 바로 원본 폴더 선택을 유도한다.
      const { found: promptFound, stillMissing } = await promptForMissingImages(missing)

      if (rewrittenMdFiles.length > 0) {
        await importDocuments(rewrittenMdFiles, targetFolder || "")
      }
      const allBinary = [...relocatedBinaryFiles, ...passthroughBinaryFiles, ...promptFound]
      if (allBinary.length > 0) {
        await importBinaryFiles(allBinary, targetFolder || "")
      }

      reload()
      if (rewrittenMdFiles.length > 0) {
        const first = rewrittenMdFiles[0]
        const openPath = targetFolder ? `${targetFolder}/${first.path}` : first.path
        const html = await mdToHtml(first.content)
        openDoc(getRootPath() || "", openPath, html)
      }
      setMissingImages(stillMissing)
      setDone(true)
      const total = mdFiles.length + binaryFiles.length
      toast.success(`${total}개 파일을 가져왔습니다`)
    } catch (e) {
      toast.error("가져오기 실패", { description: String(e) })
    } finally {
      setImporting(false)
    }
  }, [files, targetFolder, reload, openDoc])

  const handlePickMissingImages = useCallback(async () => {
    if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
      toast.error("이 브라우저는 폴더 선택을 지원하지 않습니다")
      return
    }
    setLocatingImages(true)
    try {
      const dirHandle = await window.showDirectoryPicker()
      const found = await locateMissingImages(dirHandle, missingImages)
      if (found.length > 0) {
        await importBinaryFiles(found, targetFolder || "")
        reload()
        toast.success(`${found.length}개 이미지를 img. 폴더로 가져왔습니다`)
      } else {
        toast.error("선택한 폴더에서 참조된 이미지를 찾지 못했습니다")
      }
      setMissingImages([])
    } catch {
      // 사용자가 폴더 선택을 취소한 경우 등 — 조용히 무시
    } finally {
      setLocatingImages(false)
    }
  }, [missingImages, targetFolder, reload])

  const handleReset = useCallback(() => {
    setFiles([])
    setDone(false)
    setImporting(false)
    setMissingImages([])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const handleClose = useCallback(() => {
    if (importing) return
    onOpenChange(false)
    handleReset()
  }, [importing, onOpenChange, handleReset])

  const dialogWidth = files.length > 0 ? "64rem" : "32rem"

  const dialogTitle = targetFolder ? `${targetFolder}에 가져오기` : "파일 가져오기"
  const dialogDescription = targetFolder
    ? `로컬 폴더의 .md 파일을 "${targetFolder}" 폴더로 가져옵니다.`
    : "기존 .md 파일을 워크스페이스 폴더로 가져옵니다."

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent style={{ maxWidth: dialogWidth }} className="max-h-[80vh] w-[90vw] flex flex-col">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle className="size-10 text-green-500" />
            <p className="text-sm font-medium">
              {files.length}개 파일을 가져왔습니다
            </p>
            {missingImages.length > 0 && (
              <div className="w-full max-w-sm rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                <p className="font-medium">
                  {new Set(missingImages.map((m) => m.resolvedPath)).size}개 이미지가 누락됩니다. img. 폴더에서 찾아주세요.
                </p>
                <div className="mt-1 flex gap-2">
                  <button
                    onClick={handlePickMissingImages}
                    disabled={locatingImages}
                    className="underline hover:no-underline disabled:opacity-50"
                  >
                    폴더 선택
                  </button>
                  <button
                    onClick={() => setMissingImages([])}
                    className="underline hover:no-underline"
                  >
                    무시
                  </button>
                </div>
              </div>
            )}
            <Button onClick={() => { onOpenChange(false); handleReset() }}>
              완료
            </Button>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="import-file-input"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2" onClick={handleFilePicker}>
                <FileUp className="size-4" />
                파일 선택
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleFolderSelect}>
                <FolderUp className="size-4" />
                폴더 선택
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              .md 파일을 선택하거나 폴더를 선택하여 한 번에 가져올 수 있습니다
            </p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center gap-2 px-1 pb-2 text-sm">
              <FileUp className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {files.length}개 파일 선택됨
              </span>
            </div>
            <div className="min-h-0 max-h-[50vh] overflow-auto rounded-md border">
              <div className="space-y-0.5 p-1">
                {files.map((f) => (
                  <div
                    key={f.path}
                    className="flex items-center gap-2 rounded px-2 py-1 text-xs text-muted-foreground"
                  >
                    <span className="whitespace-nowrap">{f.path}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground/50">
                      {f.kind === "md" ? `${f.content.length} bytes` : `${f.data.byteLength} bytes`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 pt-2">
              <AlertTriangle className="size-4 shrink-0 text-amber-500" />
              <p className="text-[11px] text-muted-foreground">
                현재 폴더의 기존 파일과 같은 이름이 있으면 덮어씁니다
              </p>
            </div>
            <div className="flex shrink-0 justify-end gap-2 pt-3">
              <Button variant="outline" onClick={handleReset} disabled={importing}>
                취소
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <Loader2 className="size-4 animate-spin mr-1" />
                ) : null}
                가져오기
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
