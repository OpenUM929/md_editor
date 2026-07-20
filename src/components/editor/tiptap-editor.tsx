"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import { Table } from "@tiptap/extension-table"
import { TableHeader } from "@tiptap/extension-table-header"
import { TableRow } from "@tiptap/extension-table-row"
import { TableCell } from "@tiptap/extension-table-cell"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import Emoji from "@tiptap/extension-emoji"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { common, createLowlight } from "lowlight"
import { useEffect, useRef, useMemo, useState } from "react"
import { useAutoPageBreak } from "@/hooks/use-auto-page-break"
import { cn } from "@/lib/utils"
import { SlashCommandPopup } from "./slash-command-popup"
import { PdfExportPreview } from "./pdf-export-preview"
import { PageBreak } from "./extensions/page-break"
import type { MarginPresetId } from "@/lib/a4-margins"
import { A4_MARGIN_PRESETS, A4_DIMENSIONS } from "@/lib/a4-margins"
import type { PageMode } from "@/lib/page-mode"

const lowlight = createLowlight(common)

type Props = {
  content: string
  onChange?: (html: string) => void
  onSave?: () => void
  onEditorReady?: (editor: import("@tiptap/react").Editor) => void
  className?: string
  pageMode?: PageMode
  marginPresetId?: MarginPresetId
  editable?: boolean
}

// 분리(bunri) 모드: 수동 ---pb--- 분할이 A4 격자(297mm + gap)에 정렬되도록
// 각 수동 page-break 앞에 여백을 주어, 다음 섹션이 정확히 다음 흰 시트 상단에서
// 시작하게 한다.这样 흰 카드 밖으로 글자가 새어나가는(spill) 현상을 방지한다.
function useAlignManualBreaks(editor: Editor | null, pageMode: PageMode) {
  useEffect(() => {
    if (!editor || pageMode !== "bunri") return
    const dom = editor.view.dom as HTMLElement
    if (!dom || !dom.isConnected) return

    const align = () => {
      const canvas = dom.closest(".a4-canvas") as HTMLElement | null
      if (!canvas) return
      const pxPerMm = 96 / 25.4
      const pageH = (A4_DIMENSIONS.height + A4_DIMENSIONS.gap) * pxPerMm
      const canvasTop = canvas.getBoundingClientRect().top

      const breaks = Array.from(
        dom.querySelectorAll<HTMLElement>(".page-break")
      )
      breaks.forEach((brk, i) => {
        const desiredTop = (i + 1) * pageH
        const actualTop = brk.getBoundingClientRect().top - canvasTop
        const delta = desiredTop - actualTop
        // break 자체 높이는 작으므로, 위쪽 여백으로 격자에 맞춤
        const pad = Math.max(0, delta)
        brk.style.marginTop = `${pad}px`
        brk.style.marginBottom = "0px"
      })
    }

    let timer: ReturnType<typeof setTimeout>
    const handler = () => {
      clearTimeout(timer)
      timer = setTimeout(align, 150)
    }
    editor.on("update", handler)
    timer = setTimeout(align, 300)
    // 폰트/레이아웃 안정화 후 한 번 더
    const t2 = setTimeout(align, 800)
    return () => {
      clearTimeout(timer)
      clearTimeout(t2)
      editor.off("update", handler)
    }
  }, [editor, pageMode])
}

export function TiptapEditor({
  content, onChange, onSave, onEditorReady, className, pageMode = "bunri", marginPresetId = "medium", editable = true,
}: Props) {
  const onChangeRef = useRef(onChange)
  const readyRef = useRef(onEditorReady)

  useEffect(() => { onChangeRef.current = onChange })
  useEffect(() => { readyRef.current = onEditorReady })

  const marginValues = useMemo(
    () => A4_MARGIN_PRESETS[marginPresetId].values,
    [marginPresetId]
  )

  // 일체(ilche) 모드: 상하 여백을 0으로 (좌우는 프리셋 유지)
  const effectiveMargins = useMemo(
    () => (pageMode === "ilche" ? { ...marginValues, top: 0, bottom: 0 } : marginValues),
    [pageMode, marginValues]
  )

  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [pdfPreviewHtml, setPdfPreviewHtml] = useState("")

  const editor = useEditor({
    editable,
    extensions: [
      Emoji,
      CodeBlockLowlight.configure({ lowlight }),
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: false,
      }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table,
      TableHeader,
      TableRow,
      TableCell,
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder: "문서를 입력하세요..." }),
      PageBreak,
    ],
    editorProps: {
      attributes: {
        class: cn(
          "prose dark:prose-invert max-w-none focus:outline-none",
          pageMode !== "wide"
            ? "w-[210mm] mx-auto bg-transparent"
            : "min-h-[300px] px-8 py-6"
        ),
        style: pageMode !== "wide" ? "" : "min-h-[300px] px-8 py-6",
      },
      handleKeyDown: (view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "s") {
          event.preventDefault()
          onSave?.()
          return true
        }
        if (event.key === "/" && !event.ctrlKey && !event.metaKey) {
          const { selection } = view.state
          const { $from } = selection
          const textBefore = $from.parent.textBetween(0, $from.parentOffset)
          if (textBefore === "" && $from.parent.type.name === "paragraph") {
            const rect = view.coordsAtPos($from.pos)
            view.dom.dispatchEvent(new CustomEvent("slash-open", {
              detail: { x: rect.left, y: rect.bottom },
            }))
          }
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      onChangeRef.current?.(editor.getHTML())
    },
    onCreate: ({ editor }) => {
      readyRef.current?.(editor)
    },
    immediatelyRender: false,
  })

  useAutoPageBreak(editor, pageMode, marginValues)
  useAlignManualBreaks(editor, pageMode)

  useEffect(() => {
    if (editor) editor.setEditable(editable)
  }, [editor, editable])

  useEffect(() => {
    if (!editor || !content) return
    if (content === editor.getHTML()) return
    editor.commands.setContent(content)
  }, [editor, content])

  const [pageCount, setPageCount] = useState(1)

  useEffect(() => {
    if (!editor || pageMode !== "bunri") return
    let timer: ReturnType<typeof setTimeout>
    const count = () => {
      let n = 0
      editor.state.doc.descendants((node) => {
        if (node.type.name === "pageBreak") n++
      })
      setPageCount(Math.max(1, n + 1))
    }
    timer = setTimeout(count, 200)
    editor.on("update", () => {
      clearTimeout(timer)
      timer = setTimeout(count, 200)
    })
    return () => { clearTimeout(timer) }
  }, [editor, pageMode])

  const cssVars = useMemo(() => ({
    "--a4-m-tb": `${effectiveMargins.top}mm`,
    "--a4-m-lr": `${effectiveMargins.left}mm`,
    "--a4-gap": `${A4_DIMENSIONS.gap}mm`,
  } as Record<string, string>), [effectiveMargins])

  const printRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const before = () => {
      if (printRef.current && editor) {
        printRef.current.innerHTML = editor.getHTML()
      }
    }
    const after = () => {
      if (printRef.current) {
        printRef.current.innerHTML = ""
      }
    }
    window.addEventListener("beforeprint", before)
    window.addEventListener("afterprint", after)
    return () => {
      window.removeEventListener("beforeprint", before)
      window.removeEventListener("afterprint", after)
    }
  }, [editor])

  // "PDF 저장" 요청 수신 → 일체 모드는 미리보기 모달(높이=내용, 폭=A4)을 열고,
  // 그 외 모드는 인쇄(A4)로 폴백
  useEffect(() => {
    const handler = () => {
      if (!editor) return
      if (pageMode === "ilche") {
        setPdfPreviewHtml(editor.getHTML())
        setPdfPreviewOpen(true)
      } else {
        window.print()
      }
    }
    window.addEventListener("md-editor:export-pdf", handler)
    return () => window.removeEventListener("md-editor:export-pdf", handler)
  }, [editor, pageMode])

  return (
    <>
      <div
        className={cn(
          "tiptap-editor",
          pageMode !== "wide" && "flex flex-col items-center py-8 bg-muted/30",
          className
        )}
        style={cssVars}
      >
      {pageMode === "wide" ? (
        <EditorContent editor={editor} />
      ) : pageMode === "bunri" ? (
        <div className="a4-canvas a4-canvas--bunri">
          <div
            className="a4-sheets"
            style={{ height: `${pageCount * 297 + (pageCount - 1) * A4_DIMENSIONS.gap}mm` }}
          >
            {Array.from({ length: pageCount }, (_, i) => (
              <div
                key={i}
                className="a4-page"
                style={{ top: `${i * (A4_DIMENSIONS.height + A4_DIMENSIONS.gap)}mm` }}
              />
            ))}
          </div>
          <EditorContent editor={editor} />
        </div>
      ) : (
        <div className="a4-canvas a4-canvas--ilche">
          <EditorContent editor={editor} />
        </div>
      )}

      <SlashCommandPopup editor={editor} />
    </div>

    <div
      ref={printRef}
      className="print-pages prose max-w-none"
      data-page-mode={pageMode}
      style={cssVars}
    />

    {pdfPreviewOpen && (
      <PdfExportPreview
        html={pdfPreviewHtml}
        marginPresetId={marginPresetId}
        onClose={() => setPdfPreviewOpen(false)}
      />
    )}
    </>
  )
}
