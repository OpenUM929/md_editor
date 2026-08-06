"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import { Fragment, Slice, type Node as PMNode } from "@tiptap/pm/model"
import { mergeAttributes } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import { Table } from "@tiptap/extension-table"
import { TableHeader } from "@tiptap/extension-table-header"
import { TableRow } from "@tiptap/extension-table-row"
import { TableCell } from "@tiptap/extension-table-cell"
import Link from "@tiptap/extension-link"
import { ResolvedImage } from "./extensions/resolved-image"
import Placeholder from "@tiptap/extension-placeholder"
import Emoji from "@tiptap/extension-emoji"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import TextAlign from "@tiptap/extension-text-align"
import { TextStyle } from "@tiptap/extension-text-style/text-style"
import { FontSize } from "@tiptap/extension-text-style/font-size"
import { common, createLowlight } from "lowlight"
import { useEffect, useRef, useMemo, useState } from "react"
import { usePageFlow } from "@/hooks/use-page-flow"
import { cn } from "@/lib/utils"
import { SlashCommandPopup } from "./slash-command-popup"
import { ColumnWidthSlider } from "./column-width-slider"
import { RowHeightSlider } from "./row-height-slider"
import { TableColumnWidth } from "./extensions/table-column-width"
import { PageBreak } from "./extensions/page-break"
import { CustomHorizontalRule } from "./extensions/custom-horizontal-rule"
import { CustomHeading } from "./extensions/custom-heading"
import { computePageFlow, type FlowBlock } from "@/lib/page-flow-core"
import type { MarginPresetId } from "@/lib/a4-margins"
import { A4_MARGIN_PRESETS, A4_DIMENSIONS } from "@/lib/a4-margins"
import type { PageMode } from "@/lib/page-mode"
import type { ReportTheme } from "@/lib/report-theme"
import { reportThemeClass } from "@/lib/report-theme"
import { headingNumberingClass } from "@/lib/heading-numbering"

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      background: {
        default: null,
        parseHTML: el => el.style.backgroundColor || null,
      },
      rowHeight: {
        default: null,
        parseHTML: el => {
          const v = el.style.height
          if (!v) return null
          const num = parseInt(v, 10)
          return isNaN(num) ? null : num
        },
      },
    }
  },
  renderHTML({ node, HTMLAttributes }) {
    const styles: string[] = []
    if (node.attrs.background) styles.push(`background-color: ${node.attrs.background}`)
    if (node.attrs.rowHeight) styles.push(`height: ${node.attrs.rowHeight}px`)
    const htmlAttrs = { ...HTMLAttributes }
    if (styles.length > 0) {
      htmlAttrs.style = styles.join("; ")
    } else {
      delete htmlAttrs.style
    }
    return ["td", mergeAttributes(this.options.HTMLAttributes, htmlAttrs), 0]
  },
})

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      background: {
        default: null,
        parseHTML: el => el.style.backgroundColor || null,
      },
      rowHeight: {
        default: null,
        parseHTML: el => {
          const v = el.style.height
          if (!v) return null
          const num = parseInt(v, 10)
          return isNaN(num) ? null : num
        },
      },
    }
  },
  renderHTML({ node, HTMLAttributes }) {
    const styles: string[] = []
    if (node.attrs.background) styles.push(`background-color: ${node.attrs.background}`)
    if (node.attrs.rowHeight) styles.push(`height: ${node.attrs.rowHeight}px`)
    const htmlAttrs = { ...HTMLAttributes }
    if (styles.length > 0) {
      htmlAttrs.style = styles.join("; ")
    } else {
      delete htmlAttrs.style
    }
    return ["th", mergeAttributes(this.options.HTMLAttributes, htmlAttrs), 0]
  },
})

const lowlight = createLowlight(common)

// 붙여넣기 정리: ProseMirror 기본 파이프라인은 복사(slice) 내용을 그대로 되살리므로,
// 데이터 등 블록을 드래그 선택해 복제할 때 대상 앞뒤의 빈 문단(<p></p>)이 딸려 와
// 저장 시 마크다운 빈 줄(`\n\n`)로 남는다. 블록 경계의 빈 문단만 제거한다.
const isEmptyParagraphNode = (node: PMNode): boolean =>
  node.type.name === "paragraph" && node.textContent.trim() === ""

function stripEmptyBoundaryParagraphs(slice: Slice): Slice {
  const children = slice.content.content.slice()
  let start = 0
  while (start < children.length && isEmptyParagraphNode(children[start])) start++
  let end = children.length
  while (end > start && isEmptyParagraphNode(children[end - 1])) end--
  if (start === 0 && end === children.length) return slice
  const content = Fragment.from(children.slice(start, end))
  if (content.childCount === 0) return slice
  const openStart = Math.max(0, slice.openStart - (start > 0 ? 1 : 0))
  const openEnd = Math.max(0, slice.openEnd - (end < children.length ? 1 : 0))
  return new Slice(content, openStart, openEnd)
}

const isEmptyParagraphMarkup = (el: Element): boolean =>
  el.tagName === "P" && el.textContent?.trim() === ""

function stripEmptyBoundaryMarkup(html: string): string {
  const body = new DOMParser().parseFromString(html, "text/html").body
  const trim = (dir: "start" | "end") => {
    while (body.children.length) {
      const el = dir === "start" ? body.children[0] : body.children[body.children.length - 1]
      if (!isEmptyParagraphMarkup(el)) break
      el.remove()
    }
  }
  trim("start")
  trim("end")
  return body.innerHTML
}

type Props = {
  content: string
  onChange?: (html: string) => void
  onSave?: () => void
  onEditorReady?: (editor: import("@tiptap/react").Editor) => void
  className?: string
  pageMode?: PageMode
  marginPresetId?: MarginPresetId
  reportTheme?: ReportTheme
  headingNumbering?: boolean
  editable?: boolean
}

export function TiptapEditor({
  content, onChange, onSave, onEditorReady, className, pageMode = "bunri", marginPresetId = "medium", reportTheme = "plain", headingNumbering = false, editable = true,
}: Props) {
  const themeClass = reportThemeClass(reportTheme)
  const numberingClass = headingNumberingClass(headingNumbering)
  const onChangeRef = useRef(onChange)
  const readyRef = useRef(onEditorReady)

  useEffect(() => { onChangeRef.current = onChange })
  useEffect(() => { readyRef.current = onEditorReady })

  const marginValues = useMemo(
    () => A4_MARGIN_PRESETS[marginPresetId].values,
    [marginPresetId]
  )

  // 紐⑤뱺 A4 紐⑤뱶(?쇱껜쨌遺꾨━)媛 ?숈씪???щ갚???⑥꽌 "臾몄꽌 湲곕낯 ?묒떇"??紐⑤뱶? 臾닿??섍쾶
  // ?쇨??섍쾶 ?좎??쒕떎. (?댁쟾???쇱껜留??곹븯 0?쇰줈 媛뺤젣??紐⑤뱶 ?꾪솚 ???쒕ぉ ?꾩튂媛 ??덉쓬)
  const effectiveMargins = marginValues

  const editor = useEditor({
    editable,
    extensions: [
      Emoji,
      CodeBlockLowlight.configure({ lowlight }),
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        link: false,
        underline: false,
        horizontalRule: false,
      }),
      CustomHeading,
      Underline,
      TextStyle,
      FontSize,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      CustomTableHeader,
      TableRow,
      CustomTableCell,
      TableColumnWidth,
      Link.configure({ openOnClick: false }),
      ResolvedImage,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "臾몄꽌瑜??낅젰?섏꽭??.." }),
      PageBreak,
      CustomHorizontalRule,
    ],
    editorProps: {
      transformPasted: (slice) => slice,
      transformPastedHTML: (html) => stripEmptyBoundaryMarkup(html),
      transformPastedText: (text) =>
        text.replace(/^\n+/, "").replace(/\n+\s*$/, "").replace(/\n{3,}/g, "\n\n"),
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
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === "i" || event.key === "I")) {
          event.preventDefault()
          const input = document.createElement("input")
          input.type = "file"
          input.accept = "image/*"
          input.onchange = () => {
            const file = input.files?.[0]
            if (!file) return
            if (!file.type.startsWith("image/")) return
            const reader = new FileReader()
            reader.onload = () => {
              view.dispatch(view.state.tr.replaceSelectionWith(
                view.state.schema.nodes.image.create({ src: reader.result as string })
              ))
            }
            reader.readAsDataURL(file)
          }
          input.click()
          return true
        }
        if ((event.ctrlKey || event.metaKey) && (event.key === "k" || event.key === "K")) {
          event.preventDefault()
          const url = window.prompt("링크 URL을 입력하세요:", "https://")
          if (url === null) return true
          if (url === "") {
            view.dispatch(view.state.tr.removeMark(
              view.state.selection.from,
              view.state.selection.to,
              view.state.schema.marks.link
            ))
          } else {
            view.dispatch(view.state.tr.addMark(
              view.state.selection.from,
              view.state.selection.to,
              view.state.schema.marks.link.create({ href: url })
            ))
          }
          return true
        }
        if ((event.ctrlKey || event.metaKey) && event.key === "/") {
          event.preventDefault()
          const { selection } = view.state
          const { $from } = selection
          const rect = view.coordsAtPos($from.pos)
          view.dom.dispatchEvent(new CustomEvent("slash-open", {
            detail: { x: rect.left, y: rect.bottom },
          }))
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
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false
        const files = event.dataTransfer?.files
        if (!files || files.length === 0) return false
        const dropX = event.clientX
        const dropY = event.clientY
        for (const file of Array.from(files)) {
          if (!file.type.startsWith("image/")) continue
          event.preventDefault()
          const reader = new FileReader()
          reader.onload = () => {
            const pos = view.posAtCoords({ left: dropX, top: dropY })
            if (!pos) return
            const tr = view.state.tr.insert(
              pos.pos,
              view.state.schema.nodes.image.create({ src: reader.result as string })
            )
            view.dispatch(tr)
          }
          reader.readAsDataURL(file)
        }
        return true
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

  const [pageCount, setPageCount] = useState(1)

  // 상태 비의존 페이지 흐름(워드/한글 방식). 문서를 변경하지 않고 표시만 재계산 →
  // 편집 시 다른 페이지가 흔들리는 연쇄가 구조적으로 발생하지 않는다.
  usePageFlow(editor, pageMode, marginValues, setPageCount)

  useEffect(() => {
    if (editor) editor.setEditable(editable)
  }, [editor, editable])

  useEffect(() => {
    if (!editor || !content) return
    if (content === editor.getHTML()) return
    queueMicrotask(() => {
      editor.commands.setContent(content)
      // setContent 는 전체 문서를 교체(replaceWith)하므로 이전 선택이 삽입 끝으로 밀려
      // 커서가 문서 맨 끝에 놓인다. 이 상태에서 툴바 focus() 를 호출하면 마지막 페이지로
      // 스크롤 점프한다 → 로드 직후 커서를 문서 시작으로 되돌린다.
      editor.commands.setTextSelection(0)
    })
  }, [editor, content])

  const cssVars = useMemo(() => ({
    "--a4-m-tb": `${effectiveMargins.top}mm`,
    "--a4-m-lr": `${effectiveMargins.left}mm`,
    "--a4-gap": `${A4_DIMENSIONS.gap}mm`,
  } as Record<string, string>), [effectiveMargins])

  const printRef = useRef<HTMLDivElement>(null)
  const preparedRef = useRef(false)

  // 인쇄/PDF = 화면과 "같은 엔진". editor.getHTML() 을 .print-pages 에 넣고,
  // 화면과 동일한 공용 코어(computePageFlow)로 페이지 경계를 계산해 자동 넘침 블록에
  // break-before 를 찍은 뒤 브라우저 네이티브 인쇄로 벡터 A4 PDF 를 만든다.
  useEffect(() => {
    const PX_PER_MM = 96 / 25.4

    const waitImages = async (root: HTMLElement) => {
      const imgs = Array.from(root.querySelectorAll("img"))
      await Promise.race([
        Promise.all(
          imgs.map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => {})))
        ),
        new Promise((r) => setTimeout(r, 1500)),
      ])
    }

    // 화면과 동일한 CSS(.print-pages)·인쇄 usable 폭으로 오프스크린 측정 →
    // 어느 블록이 자동으로 다음 페이지에서 시작하는지 계산.
    // @page 여백 = 현재 프리셋(브라우저가 각 A4 시트에 이 여백을 준다). 동기 주입.
    // + 내용 열 폭을 에디터와 동일한 usable 폭으로 "고정" 한다. 이유: 브라우저 인쇄
    //   대화상자의 여백 설정이 우리 @page 를 덮어쓰면(예: 기본 ~10mm) 내용 상자가 넓어져
    //   .print-pages 가 그 폭으로 리플로우 → 줄바꿈이 줄고 블록이 짧아져 → 20mm 기준으로
    //   계산한 페이지 경계가 일찍 끊겨 "절반 빈 페이지"가 생긴다. 폭을 usable 로 못박고
    //   가운데 정렬하면 대화상자 설정과 무관하게 화면과 동일한 폭·줄바꿈·페이지 경계가 된다.
    const injectPageRule = () => {
      const m = marginValues
      const usableW = A4_DIMENSIONS.width - m.left - m.right
      let rule = document.getElementById("print-page-rule") as HTMLStyleElement | null
      if (!rule) {
        rule = document.createElement("style")
        rule.id = "print-page-rule"
        document.head.appendChild(rule)
      }
      rule.textContent =
        `@page { size: A4; margin: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm; }\n` +
        `@media print { .print-pages { width: ${usableW}mm !important; margin-left: auto !important; margin-right: auto !important; padding: 0 !important; box-sizing: border-box; } }`
    }

    const prepare = async () => {
      const printEl = printRef.current
      if (!editor || !printEl) return
      const html = editor.getHTML()
      printEl.innerHTML = html
      injectPageRule()

      const m = marginValues
      // 오프스크린 측정 컨테이너(같은 클래스·테마, usable 폭).
      const usableWidthMm = A4_DIMENSIONS.width - m.left - m.right
      const meas = document.createElement("div")
      meas.className = printEl.className
      meas.setAttribute("data-page-mode", pageMode)
      meas.style.cssText = `position:fixed;left:-10000px;top:0;display:block;width:${usableWidthMm}mm;`
      meas.innerHTML = html
      document.body.appendChild(meas)
      await waitImages(meas)
      void meas.getBoundingClientRect()

      const measTop = meas.getBoundingClientRect().top
      const blocks: FlowBlock[] = Array.from(meas.children).map((c) => {
        const r = (c as HTMLElement).getBoundingClientRect()
        return { top: r.top - measTop, height: r.height, isBreak: (c as HTMLElement).classList.contains("page-break") }
      })
      const sheetPx = A4_DIMENSIONS.height * PX_PER_MM
      const { startsNewPage } = computePageFlow(blocks, {
        pageStepPx: sheetPx, // 인쇄는 화면과 달리 페이지 간격(gap)이 없다
        sheetHeightPx: sheetPx,
        topMarginPx: m.top * PX_PER_MM,
        botMarginPx: m.bottom * PX_PER_MM,
      })
      document.body.removeChild(meas)

      // 실제 인쇄 컨테이너에 break-before 적용(자동 넘침만; 수동 나눔은 CSS 가 처리).
      Array.from(printEl.children).forEach((c, i) => {
        if (startsNewPage[i]) (c as HTMLElement).style.breakBefore = "page"
      })
    }

    const runPrint = async () => {
      preparedRef.current = true
      await prepare()
      window.print()
    }

    const onExport = () => { void runPrint() }
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault()
        void runPrint()
      }
    }
    // 우리 경로를 거치지 않은 인쇄(브라우저 ⋮ 메뉴 등) 폴백: beforeprint 는 async
    // 측정을 기다릴 수 없으므로 페이지 경계 계산은 생략하되, 최소한 내용과 @page
    // 여백(프리셋)은 동기로 채워 화면과 여백이 어긋나지 않게 한다.
    const onBefore = () => {
      if (preparedRef.current) return
      if (printRef.current && editor) printRef.current.innerHTML = editor.getHTML()
      injectPageRule()
    }
    const onAfter = () => {
      if (printRef.current) printRef.current.innerHTML = ""
      document.getElementById("print-page-rule")?.remove()
      preparedRef.current = false
    }

    window.addEventListener("md-editor:export-pdf", onExport)
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("beforeprint", onBefore)
    window.addEventListener("afterprint", onAfter)
    return () => {
      window.removeEventListener("md-editor:export-pdf", onExport)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("beforeprint", onBefore)
      window.removeEventListener("afterprint", onAfter)
    }
  }, [editor, marginValues, pageMode])

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
        <div className={cn("a4-canvas a4-canvas--bunri", themeClass, numberingClass)}>
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
        <div className={cn("a4-canvas a4-canvas--ilche", themeClass, numberingClass)}>
          <EditorContent editor={editor} />
        </div>
      )}

      <SlashCommandPopup editor={editor} />
      <ColumnWidthSlider editor={editor} />
      <RowHeightSlider editor={editor} />
    </div>

    <div
      ref={printRef}
      className={cn("print-pages prose max-w-none", themeClass, numberingClass)}
      data-page-mode={pageMode}
      style={cssVars}
    />
    </>
  )
}
