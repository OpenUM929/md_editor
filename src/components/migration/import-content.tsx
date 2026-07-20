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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, FileUp, FolderUp, CheckCircle, AlertTriangle } from "lucide-react"
import { importDocuments } from "@/lib/fs-access"
import { toast } from "sonner"
import { useTabs } from "@/lib/tab-context"
import { useFileTree } from "@/components/file-tree/file-tree-context"
import { mdToHtml } from "@/lib/markdown"
import { DEFAULT_ROOT } from "@/lib/constants"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportContent({ open, onOpenChange }: Props) {
  const [files, setFiles] = useState<{ path: string; content: string }[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { openDoc } = useTabs()
  const { reload } = useFileTree()

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    const entries: { path: string; content: string }[] = []

    for (const file of Array.from(fileList)) {
      if (!file.name.endsWith(".md")) continue

      let relativePath = file.name
      const webkitPath = (file as { webkitRelativePath?: string }).webkitRelativePath
      if (webkitPath) {
        relativePath = webkitPath.split("/").slice(1).join("/")
      }

      const content = await file.text()
      entries.push({ path: relativePath, content })
    }

    if (entries.length === 0) {
      toast.error(".md 파일을 선택해주세요")
      return
    }

    setFiles(entries)
  }, [])

  const handleImport = useCallback(async () => {
    setImporting(true)
    try {
      await importDocuments(files)
      reload()
      if (files.length > 0) {
        const first = files[0]
        const html = await mdToHtml(first.content)
        openDoc(DEFAULT_ROOT, first.path, html)
      }
      setDone(true)
      toast.success(`${files.length}개 파일을 가져왔습니다`)
    } catch (e) {
      toast.error("가져오기 실패", { description: String(e) })
    } finally {
      setImporting(false)
    }
  }, [files, reload, openDoc])

  const handleReset = useCallback(() => {
    setFiles([])
    setDone(false)
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const handleClose = useCallback(() => {
    if (importing) return
    onOpenChange(false)
    handleReset()
  }, [importing, onOpenChange, handleReset])

  const [detectFolderSupport, setDetectFolderSupport] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetectFolderSupport(typeof HTMLInputElement !== "undefined" && "webkitdirectory" in HTMLInputElement.prototype)
  }, [])

  const triggerFolderPicker = useCallback(() => {
    if (!fileInputRef.current) return
    const input = fileInputRef.current as HTMLInputElement & { webkitdirectory: boolean }
    input.webkitdirectory = true
    input.multiple = true
    input.click()
  }, [])

  const triggerFilePicker = useCallback(() => {
    if (!fileInputRef.current) return
    const input = fileInputRef.current as HTMLInputElement & { webkitdirectory: boolean }
    input.webkitdirectory = false
    input.multiple = true
    input.click()
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[80vh] w-[90vw] max-w-lg flex flex-col">
        <DialogHeader>
          <DialogTitle>파일 가져오기</DialogTitle>
          <DialogDescription>
            기존 .md 파일을 워크스페이스 폴더로 가져옵니다.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle className="size-10 text-green-500" />
            <p className="text-sm font-medium">
              {files.length}개 파일을 가져왔습니다
            </p>
            <Button onClick={() => { onOpenChange(false); handleReset() }}>
              완료
            </Button>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <input
              ref={fileInputRef}
              type="file"
              accept=".md"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="import-file-input"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2" onClick={triggerFilePicker}>
                <FileUp className="size-4" />
                파일 선택
              </Button>
              {detectFolderSupport && (
                <Button variant="outline" className="gap-2" onClick={triggerFolderPicker}>
                  <FolderUp className="size-4" />
                  폴더 선택
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              .md 파일을 선택하거나 폴더를 선택하여 한 번에 가져올 수 있습니다
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-1 text-sm">
              <FileUp className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {files.length}개 파일 선택됨
              </span>
            </div>
            <ScrollArea className="flex-1 min-h-0 max-h-48">
              <div className="space-y-0.5 px-1">
                {files.map((f) => (
                  <div
                    key={f.path}
                    className="flex items-center gap-2 rounded px-2 py-1 text-xs text-muted-foreground"
                  >
                    <span className="truncate">{f.path}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground/50">
                      {f.content.length} bytes
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex items-center gap-2 pt-2">
              <AlertTriangle className="size-4 text-amber-500 shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                현재 워크스페이스의 기존 파일과 같은 이름이 있으면 덮어씁니다
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
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
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
