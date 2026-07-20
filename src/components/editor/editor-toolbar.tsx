"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Link,
  ImageIcon,
  Table,
  Minus,
  SeparatorHorizontal,
  Undo2,
  Redo2,
  Maximize,
  Minimize,
  FileText,
  Printer,
  FileDown,
} from "lucide-react"
import { useState, useCallback, useRef, useEffect } from "react"
import type { Editor } from "@tiptap/react"
import type { MarginPresetId } from "@/lib/a4-margins"
import { A4_MARGIN_PRESETS } from "@/lib/a4-margins"
import type { PageMode } from "@/lib/page-mode"

function ToolButton({
  onClick,
  isActive,
  children,
  label,
}: {
  onClick: () => void
  isActive: boolean
  children: React.ReactNode
  label: string
}) {
  return (
    <Button variant={isActive ? "default" : "ghost"} size="icon-sm" onClick={onClick} aria-label={label} title={label}>
      {children}
    </Button>
  )
}

const CODE_LANGS = [
  { label: "Plain Text", value: null },
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "HTML", value: "html" },
  { label: "CSS", value: "css" },
  { label: "Python", value: "python" },
  { label: "Rust", value: "rust" },
  { label: "Go", value: "go" },
  { label: "Bash", value: "bash" },
  { label: "JSON", value: "json" },
  { label: "SQL", value: "sql" },
]

type Props = {
  editor: Editor | null
  pageMode?: PageMode
  onPageModeChange?: (mode: PageMode) => void
  marginPresetId?: MarginPresetId
  onMarginPresetChange?: (preset: MarginPresetId) => void
}

export function EditorToolbar({ editor, pageMode = "bunri", onPageModeChange, marginPresetId = "medium", onMarginPresetChange }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const editorRef = useRef(editor)

  useEffect(() => {
    editorRef.current = editor
  })

  const insertLink = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return
    const previousUrl = ed.getAttributes("link").href
    const url = window.prompt("링크 URL을 입력하세요:", previousUrl || "https://")
    if (url === null) return
    if (url === "") {
      ed.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    ed.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [])

  const insertImage = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return
    const url = window.prompt("이미지 URL을 입력하세요:", "https://")
    if (url) {
      ed.chain().focus().setImage({ src: url }).run()
    }
  }, [])

  const insertTable = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return
    const rows = window.prompt("행 개수:", "3")
    const cols = window.prompt("열 개수:", "3")
    if (rows && cols) {
      ed.chain().focus().insertTable({ rows: parseInt(rows), cols: parseInt(cols) }).run()
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  if (!editor) return null

  const currentHeading = editor.isActive("heading")
    ? `h${editor.getAttributes("heading").level}`
    : "p"

  return (
    <div className="flex items-center gap-0.5 min-w-0">
      {/* 포맷 버튼 그룹 (공간 부족 시 가로 스크롤) */}
      <div className="flex items-center gap-0.5 flex-nowrap overflow-x-auto min-w-0 whitespace-nowrap">
      {/* Undo / Redo */}
      <ToolButton onClick={() => editor.chain().focus().undo().run()} isActive={false} label="Undo">
        <Undo2 className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().redo().run()} isActive={false} label="Redo">
        <Redo2 className="size-4" />
      </ToolButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Bold / Italic / Underline / Strike */}
      <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} label="Bold (Ctrl+B)">
        <Bold className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} label="Italic (Ctrl+I)">
        <Italic className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")} label="Underline (Ctrl+U)">
        <Underline className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} label="Strikethrough">
        <Strikethrough className="size-4" />
      </ToolButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Heading select */}
      <Select
        value={currentHeading}
        onValueChange={(value: string | null) => {
          if (value === "p") {
            editor.chain().focus().setParagraph().run()
          } else if (value) {
            const level = parseInt(value.replace("h", "")) as 1 | 2 | 3 | 4
            editor.chain().focus().toggleHeading({ level }).run()
          }
        }}
      >
        <SelectTrigger className="h-7 w-[110px] text-xs px-2">
          <SelectValue placeholder="Paragraph" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="p">Paragraph</SelectItem>
          <SelectItem value="h1">Heading 1</SelectItem>
          <SelectItem value="h2">Heading 2</SelectItem>
          <SelectItem value="h3">Heading 3</SelectItem>
          <SelectItem value="h4">Heading 4</SelectItem>
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Lists */}
      <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")} label="Bullet List">
        <List className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")} label="Ordered List">
        <ListOrdered className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive("taskList")} label="Task List">
        <CheckSquare className="size-4" />
      </ToolButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Insert */}
      <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive("blockquote")} label="Blockquote">
        <Quote className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive("codeBlock")} label="Code Block">
        <Code className="size-4" />
      </ToolButton>
      {editor.isActive("codeBlock") && (
        <select
          value={editor.getAttributes("codeBlock").language || ""}
          onChange={(e) => {
            const val = e.target.value || null
            editor.chain().focus().updateAttributes("codeBlock", { language: val }).run()
          }}
          className="h-7 rounded border bg-background px-1.5 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {CODE_LANGS.map((lang) => (
            <option key={lang.value || ""} value={lang.value || ""}>
              {lang.label}
            </option>
          ))}
        </select>
      )}
      <ToolButton onClick={insertLink} isActive={editor.isActive("link")} label="Insert Link">
        <Link className="size-4" />
      </ToolButton>
      <ToolButton onClick={insertImage} isActive={false} label="Insert Image">
        <ImageIcon className="size-4" />
      </ToolButton>
      <ToolButton onClick={insertTable} isActive={editor.isActive("table")} label="Insert Table">
        <Table className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().setHorizontalRule().run()} isActive={false} label="Horizontal Rule">
        <Minus className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().insertContent({ type: "pageBreak", attrs: { auto: false } }).run()} isActive={false} label="Page Break">
        <SeparatorHorizontal className="size-4" />
      </ToolButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Fullscreen */}
      <ToolButton onClick={toggleFullscreen} isActive={false} label="Fullscreen">
        {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
      </ToolButton>
      </div>

      {/* 뷰/인쇄 컨트롤 그룹 (항상 노출) */}
      <div className="flex items-center gap-0.5 shrink-0">
      {/* Wide / 일체(A4 연속) / 분리(A4 페이지 구분) 3단 토글 */}
      <ToolButton
        onClick={() => onPageModeChange?.("wide")}
        isActive={pageMode === "wide"}
        label="Wide (전폭 연속)"
      >
        <Maximize className="size-4" />
      </ToolButton>
      <ToolButton
        onClick={() => onPageModeChange?.("ilche")}
        isActive={pageMode === "ilche"}
        label="일체 (A4 연속)"
      >
        <FileText className="size-4" />
      </ToolButton>
      <ToolButton
        onClick={() => onPageModeChange?.("bunri")}
        isActive={pageMode === "bunri"}
        label="분리 (A4 페이지 구분)"
      >
        <SeparatorHorizontal className="size-4" />
      </ToolButton>

      {/* A4 margin preset selector */}
      {pageMode !== "wide" && (
        <>
          <Select
            value={marginPresetId}
            onValueChange={(v: string | null) => {
              if (v === "very-narrow" || v === "narrow" || v === "medium") {
                onMarginPresetChange?.(v)
              }
            }}
          >
            <SelectTrigger className="h-7 w-[90px] text-xs px-2">
              <SelectValue placeholder="여백" />
            </SelectTrigger>
            <SelectContent>
              {(["very-narrow", "narrow", "medium"] as const).map((key) => (
                <SelectItem key={key} value={key}>
                  {A4_MARGIN_PRESETS[key].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {/* Print */}
      <ToolButton onClick={() => window.print()} isActive={false} label="Print (Ctrl+P)">
        <Printer className="size-4" />
      </ToolButton>

      {/* Save as PDF */}
      <ToolButton
        onClick={() => window.dispatchEvent(new CustomEvent("md-editor:export-pdf"))}
        isActive={false}
        label="PDF 저장"
      >
        <FileDown className="size-4" />
      </ToolButton>
      </div>
    </div>
  )
}