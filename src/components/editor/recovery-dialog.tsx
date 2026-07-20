"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useMemo } from "react"

type Props = {
  open: boolean
  onApply: () => void
  onDiscard: () => void
  onClose: () => void
  originalContent: string
  tempContent: string
  tempSavedAt: string
}

function computeDiff(original: string, temp: string): { type: "add" | "remove" | "same"; text: string }[] {
  const origLines = original.split("\n")
  const tempLines = temp.split("\n")
  const result: { type: "add" | "remove" | "same"; text: string }[] = []

  let i = 0, j = 0
  while (i < origLines.length || j < tempLines.length) {
    if (i < origLines.length && j < tempLines.length && origLines[i] === tempLines[j]) {
      result.push({ type: "same", text: origLines[i] })
      i++; j++
    } else {
      if (i < origLines.length) {
        result.push({ type: "remove", text: origLines[i] })
        i++
      }
      if (j < tempLines.length) {
        result.push({ type: "add", text: tempLines[j] })
        j++
      }
    }
  }
  return result
}

export function RecoveryDialog({ open, onApply, onDiscard, onClose, originalContent, tempContent, tempSavedAt }: Props) {
  const diffLines = useMemo(() => computeDiff(originalContent, tempContent), [originalContent, tempContent])
  const addLines = diffLines.filter((l) => l.type === "add").length
  const removeLines = diffLines.filter((l) => l.type === "remove").length
  const hasChanges = addLines > 0 || removeLines > 0

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent style={{ maxWidth: '126rem' }} className="max-h-[60vh] w-[90vw] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>저장되지 않은 변경사항이 있습니다</DialogTitle>
          <DialogDescription>
            이전 편집 세션에서 저장되지 않은 내용이 발견되었습니다.
            {tempSavedAt && <> (마지막 자동 저장: {tempSavedAt})</>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-rows-[35fr_65fr] gap-3 overflow-hidden px-1">
          <div className="min-h-0 flex flex-col border-t pt-4 overflow-hidden" data-testid="comparison-section">
              <div className="flex-1 min-h-0 grid grid-cols-2 gap-4 grid-rows-[1fr]">
                <div className="min-w-0 min-h-0 flex flex-col">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider shrink-0">원본 (마지막 저장)</h4>
                  <div className="flex-1 min-h-0 rounded border bg-muted/30 p-2 overflow-y-auto">
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono">{originalContent || "(내용 없음)"}</pre>
                  </div>
                </div>
                <div className="min-w-0 min-h-0 flex flex-col">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider shrink-0">임시 파일 (편집 중)</h4>
                  <div className="flex-1 min-h-0 rounded border bg-muted/30 p-2 overflow-y-auto">
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono">{tempContent || "(내용 없음)"}</pre>
                  </div>
                </div>
              </div>
            </div>

            {hasChanges && (
              <div className="min-h-0 flex flex-col border rounded-md bg-muted/20 overflow-hidden" data-testid="diff-section">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b shrink-0">
                  변경 내역 ({addLines}줄 추가, {removeLines}줄 삭제)
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <pre className="text-xs leading-relaxed font-mono p-3">
                    {diffLines.map((line, idx) => (
                      <div
                        key={idx}
                        className={
                          line.type === "add"
                            ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200"
                            : line.type === "remove"
                              ? "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200"
                              : ""
                        }
                      >
                        {line.type === "add" ? "+ " : line.type === "remove" ? "- " : "  "}
                        {line.text}
                      </div>
                    ))}
                  </pre>
                </div>
              </div>
            )}
          </div>

        <DialogFooter className="gap-2 shrink-0">
          <Button variant="outline" onClick={onDiscard}>
            임시 파일 삭제
          </Button>
          <Button onClick={onApply}>
            복구 (임시 파일 적용)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}