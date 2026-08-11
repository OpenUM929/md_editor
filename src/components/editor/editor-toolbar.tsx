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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
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
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ArrowUpFromLine,
  ArrowDownToLine,
  ArrowLeftFromLine,
  ArrowRightToLine,
  Trash2,
  SquareX,
  Ban,
  PaintBucket,
  TableCellsMerge,
  TableCellsSplit,
  FileSpreadsheet,
  FileType2,
  ListTree,
} from "lucide-react"
import { useState, useCallback, useRef, useEffect, forwardRef, createContext, useContext } from "react"
import type { Editor } from "@tiptap/react"
import { continueList } from "@/lib/list-continue"
import type { MarginPresetId } from "@/lib/a4-margins"
import { A4_MARGIN_PRESETS } from "@/lib/a4-margins"
import type { PageMode } from "@/lib/page-mode"
import type { ReportTheme } from "@/lib/report-theme"
import { REPORT_THEMES, REPORT_THEME_LABELS } from "@/lib/report-theme"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getRecentColors, addRecentColor } from "@/lib/recent-colors"

const HEADING_ACCENT_THICKNESS_PRESETS = [
  { label: "2pt", value: "2pt" },
  { label: "3pt", value: "3pt" },
  { label: "4pt", value: "4pt" },
  { label: "5pt", value: "5pt" },
  { label: "6pt", value: "6pt" },
  { label: "8pt", value: "8pt" },
]

const HEADING_ACCENT_COLOR_DEFAULT = "#1b1760"

// Alt 키팁 활성 상태를 ToolButton 배지 렌더에 전달하는 컨텍스트.
const KeytipsContext = createContext(false)

const ToolButton = forwardRef<HTMLButtonElement, {
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  isActive?: boolean
  children: React.ReactNode
  label: string
  disabled?: boolean
  keytip?: string
  className?: string
}>(function ToolButton({
  onClick,
  isActive = false,
  children,
  label,
  disabled = false,
  keytip,
  className,
  ...rest
}, ref) {
  const keytipsActive = useContext(KeytipsContext)
  return (
    <Button ref={ref} variant={isActive ? "default" : "ghost"} size="icon-sm" onClick={onClick} aria-label={label} title={label} disabled={disabled} data-keytip={keytip} className={cn(keytip && "relative", className)} {...rest}>
      {children}
      {keytip && keytipsActive && (
        <kbd className="pointer-events-none absolute -right-0.5 -top-0.5 z-10 rounded-[3px] border border-border bg-background px-0.5 text-[9px] font-semibold leading-[1.1] text-foreground shadow-sm">
          {keytip}
        </kbd>
      )}
    </Button>
  )
})

const FONT_SIZES = [
  "8pt", "9pt", "10pt", "10.5pt", "11pt", "12pt", "13pt", "14pt", "15pt", "16pt",
  "18pt", "20pt", "22pt", "24pt", "26pt", "28pt", "32pt", "36pt", "42pt", "48pt",
  "54pt", "60pt", "72pt",
]

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
  reportTheme?: ReportTheme
  onReportThemeChange?: (theme: ReportTheme) => void
  headingNumbering?: boolean
  onHeadingNumberingChange?: (enabled: boolean) => void
  onSaveHwpx?: () => void
  onSaveDocx?: () => void
}

export function EditorToolbar({ editor, pageMode = "bunri", onPageModeChange, marginPresetId = "medium", onMarginPresetChange, reportTheme = "plain", onReportThemeChange, headingNumbering = false, onHeadingNumberingChange, onSaveHwpx, onSaveDocx }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const editorRef = useRef(editor)

  // Alt 키팁: Alt 단독 press → 활성, 영숫자 키 → 툴바 버튼 실행, Alt release/기타 키 → 비활성.
  const toolbarRootRef = useRef<HTMLDivElement>(null)
  const [keytipsActive, setKeytipsActive] = useState(false)
  const keytipsActiveRef = useRef(keytipsActive)

  useEffect(() => {
    keytipsActiveRef.current = keytipsActive
  }, [keytipsActive])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Alt 단독(다른 수정자 없이) → 브라우저 메뉴 포커스 방지 + 키팁 활성
      if (event.key === "Alt" && !event.ctrlKey && !event.shiftKey && !event.metaKey) {
        event.preventDefault()
        setKeytipsActive(true)
        return
      }
      if (!keytipsActiveRef.current) return
      // 활성 중 영숫자 단일 키 → 해당 data-keytip 버튼 실행
      if (/^[a-zA-Z0-9]$/.test(event.key)) {
        const root = toolbarRootRef.current
        const target = root?.querySelector<HTMLButtonElement>(`[data-keytip="${event.key.toUpperCase()}"]`)
        if (target && !target.disabled) {
          event.preventDefault()
          target.click()
          setKeytipsActive(false)
        }
        return
      }
      // 그 외 조합키가 아닌 단일 키 → 키팁 닫기
      if (!event.ctrlKey && !event.shiftKey && !event.metaKey) {
        setKeytipsActive(false)
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt") {
        setKeytipsActive(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [])

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

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageFile = useCallback((file: File) => {
    const ed = editorRef.current
    if (!ed) return
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 선택할 수 있습니다")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      ed.chain().focus().setImage({ src: reader.result as string }).run()
    }
    reader.readAsDataURL(file)
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

  const colorInputRef = useRef<HTMLInputElement>(null)

  const handleCellBgColor = useCallback((color: string) => {
    const ed = editorRef.current
    if (!ed) return
    const value = color === "" ? null : color
    ed.chain().focus().setCellAttribute("background", value).run()
  }, [])

  const removeCellBgColor = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return
    ed.chain().focus().setCellAttribute("background", null).run()
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

  const [headingAccentOpen, setHeadingAccentOpen] = useState(false)
  const [headingRecentColors, setHeadingRecentColors] = useState<string[]>(() => getRecentColors())
  const headingAccentDropdownRef = useRef<HTMLDivElement>(null)

  const getHeadingAccentAttrs = useCallback(() => {
    if (!editor || !editor.isActive("heading")) return { color: null, width: null }
    const attrs = editor.getAttributes("heading")
    return {
      color: (attrs.accentBorderColor as string) || null,
      width: (attrs.accentBorderWidth as string) || null,
    }
  }, [editor])

  const updateHeadingAccent = useCallback((color: string | null, width: string | null) => {
    if (!editor || !editor.isActive("heading")) return
    editor.chain().focus().updateAttributes("heading", {
      accentBorderColor: color,
      accentBorderWidth: width,
    }).run()
  }, [editor])

  // 이 헤딩 하나의 글자 크기/굵기 — h 태그 자체에 실리므로 번호 매기기(::before)가
  // 항상 같은 값을 상속받는다(list-continue.ts의 continueList와 무관, custom-heading.ts 참조).
  const getHeadingFontAttrs = useCallback(() => {
    if (!editor || !editor.isActive("heading")) return { size: null, bold: null }
    const attrs = editor.getAttributes("heading")
    return {
      size: (attrs.fontSize as string) || null,
      bold: (attrs.bold as boolean | null) ?? null,
    }
  }, [editor])

  const updateHeadingFontSize = useCallback((size: string | null) => {
    if (!editor || !editor.isActive("heading")) return
    editor.chain().focus().updateAttributes("heading", { fontSize: size }).run()
  }, [editor])

  const updateHeadingBold = useCallback((bold: boolean | null) => {
    if (!editor || !editor.isActive("heading")) return
    editor.chain().focus().updateAttributes("heading", { bold }).run()
  }, [editor])

  if (!editor) return null

  const currentHeading = editor.isActive("heading")
    ? `h${editor.getAttributes("heading").level}`
    : "p"
  const currentFontSize = editor.getAttributes("textStyle").fontSize || "12pt"
  // 표 도구는 항상 노출하되, 표 안에 커서가 없으면 비활성(흐림) 처리한다.
  // → 표를 클릭할 때마다 상단 메뉴 폭이 늘었다 줄었다 하는 리플로우를 제거.
  const inTable = editor.isActive("table")

  return (
    <KeytipsContext.Provider value={keytipsActive}>
    <div
      ref={toolbarRootRef}
      data-layout="에디터 툴바"
      data-ui-file="src/components/editor/editor-toolbar.tsx"
      data-keytips={keytipsActive || undefined}
      className="flex items-center gap-0.5 min-w-0"
    >
      {/* 포맷 버튼 그룹 (공간 부족 시 가로 스크롤) */}
      <div className="flex items-center gap-0.5 flex-nowrap overflow-x-auto min-w-0 whitespace-nowrap">
      {/* Undo / Redo */}
      <ToolButton onClick={() => editor.chain().focus().undo().run()} isActive={false} label="Undo" keytip="Z">
        <Undo2 className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().redo().run()} isActive={false} label="Redo" keytip="Y">
        <Redo2 className="size-4" />
      </ToolButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Bold / Italic / Underline / Strike */}
      <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} label="Bold (Ctrl+B)" keytip="B">
        <Bold className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} label="Italic (Ctrl+I)" keytip="I">
        <Italic className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")} label="Underline (Ctrl+U)" keytip="U">
        <Underline className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} label="Strikethrough" keytip="S">
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

      {/* 제목 스타일 설정 — 강조 바 색상/두께 + 이 헤딩만의 글자 크기/굵기.
          모두 h 태그 자체의 인라인 스타일로 실려(custom-heading.ts), 번호 매기기(::before)가
          항상 같은 값을 상속받는다. */}
      {editor.isActive("heading") && (
        <DropdownMenu open={headingAccentOpen} onOpenChange={setHeadingAccentOpen}>
          <DropdownMenuTrigger
            render={(props) => {
              const hAttrs = getHeadingAccentAttrs()
              return (
                <ToolButton
                  {...props}
                  isActive={headingAccentOpen}
                  label="제목 스타일 설정 (강조 바·글자 크기·굵기)"
                >
                  <div
                    className="size-3 rounded-sm border border-border"
                    style={{
                      backgroundColor: hAttrs.color || HEADING_ACCENT_COLOR_DEFAULT,
                      borderLeftWidth: hAttrs.width || "4pt",
                    }}
                  />
                </ToolButton>
              )
            }}
          />
          <DropdownMenuContent align="start" className="w-52 p-3">
            <div className="space-y-3">
              {/* 두께 */}
              <div className="space-y-1">
                <label className="text-xs font-medium">두께</label>
                <div className="flex flex-wrap gap-1">
                  {HEADING_ACCENT_THICKNESS_PRESETS.map((preset) => {
                    const hAttrs = getHeadingAccentAttrs()
                    const current = hAttrs.width || "4pt"
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          const hAttrs = getHeadingAccentAttrs()
                          updateHeadingAccent(
                            hAttrs.color || HEADING_ACCENT_COLOR_DEFAULT,
                            preset.value,
                          )
                        }}
                        className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                          current === preset.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:bg-accent"
                        }`}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* 색상 */}
              <div className="space-y-1">
                <label className="text-xs font-medium">색상</label>
                {headingRecentColors.length > 0 && (
                  <div className="flex items-center gap-1 mb-1">
                    {headingRecentColors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          const hAttrs = getHeadingAccentAttrs()
                          updateHeadingAccent(c, hAttrs.width || "4pt")
                          setHeadingRecentColors(addRecentColor(c))
                        }}
                        className="size-5 rounded border border-border cursor-pointer hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={getHeadingAccentAttrs().color || HEADING_ACCENT_COLOR_DEFAULT}
                    onChange={(e) => {
                      const hAttrs = getHeadingAccentAttrs()
                      updateHeadingAccent(e.target.value, hAttrs.width || "4pt")
                      setHeadingRecentColors(addRecentColor(e.target.value))
                    }}
                    className="size-7 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => updateHeadingAccent(null, null)}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    초기화
                  </button>
                </div>
              </div>
              {/* 글자 크기 — 이 헤딩에만 적용(본문 텍스트 선택 후 거는 폰트 크기 마크와 달리
                  h 태그 자체의 스타일이라 번호 매기기 숫자도 항상 같은 크기로 그려진다). */}
              <div className="space-y-1">
                <label className="text-xs font-medium">글자 크기</label>
                <Select
                  value={getHeadingFontAttrs().size || "default"}
                  onValueChange={(value: string | null) => {
                    updateHeadingFontSize(!value || value === "default" ? null : value)
                  }}
                >
                  <SelectTrigger className="h-7 w-full text-xs px-2">
                    <SelectValue placeholder="기본값" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">기본값</SelectItem>
                    {FONT_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        <span style={{ fontSize: size, lineHeight: 1.2 }}>{size}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* 굵기 — 3상태(기본/보통/굵게). "기본"은 테마·prose 기본 굵기를 그대로 따름. */}
              <div className="space-y-1">
                <label className="text-xs font-medium">굵기</label>
                <div className="flex gap-1">
                  {[
                    { label: "기본", value: null },
                    { label: "보통", value: false },
                    { label: "굵게", value: true },
                  ].map((opt) => {
                    const current = getHeadingFontAttrs().bold
                    const active = current === opt.value
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => updateHeadingBold(opt.value)}
                        className={`flex-1 px-2 py-0.5 text-xs rounded border transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:bg-accent"
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* 번호 매기기 — Word/한글의 "다단계 목록"과 같은 개념. 문서 단위 토글(프론트매터
          headingNumbering에 저장). 켜면 h1~h4가 1 / 1.1 / 1.1.1 / 1.1.1.1로 자동 번호 매겨짐
          (편집화면·인쇄/PDF는 CSS counter, DOCX/HWPX 내보내기는 heading-numbering.ts로 계산해 반영). */}
      <ToolButton
        onClick={() => onHeadingNumberingChange?.(!headingNumbering)}
        isActive={headingNumbering}
        label="번호 매기기 (제목 자동 번호, Word/한글 다단계 목록과 동일)"
        keytip="X"
      >
        <ListTree className="size-4" />
      </ToolButton>

      {/* Font size select */}
      <Select
        value={currentFontSize}
        onValueChange={(value: string | null) => {
          if (!value || value === "") {
            editor.chain().focus().unsetFontSize().run()
          } else {
            editor.chain().focus().setFontSize(value).run()
          }
        }}
      >
        <SelectTrigger className="h-7 w-[80px] text-xs px-2">
          <SelectValue placeholder="12pt" />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZES.map((size) => (
            <SelectItem key={size} value={size}>
              <span style={{ fontSize: size, lineHeight: 1.2 }}>{size}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 정렬 */}
      <ToolButton onClick={() => editor.chain().focus().setTextAlign("left").run()} isActive={editor.isActive({ textAlign: "left" })} label="왼쪽 정렬" keytip="L">
        <AlignLeft className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().setTextAlign("center").run()} isActive={editor.isActive({ textAlign: "center" })} label="가운데 정렬" keytip="C">
        <AlignCenter className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().setTextAlign("right").run()} isActive={editor.isActive({ textAlign: "right" })} label="오른쪽 정렬" keytip="R">
        <AlignRight className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().setTextAlign("justify").run()} isActive={editor.isActive({ textAlign: "justify" })} label="양쪽 정렬" keytip="J">
        <AlignJustify className="size-4" />
      </ToolButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Lists */}
      <ToolButton onClick={() => continueList(editor, "bulletList") || editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")} label="Bullet List" keytip="1">
        <List className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => continueList(editor, "orderedList") || editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")} label="Ordered List" keytip="2">
        <ListOrdered className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => continueList(editor, "taskList") || editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive("taskList")} label="Task List" keytip="3">
        <CheckSquare className="size-4" />
      </ToolButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Insert */}
      <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive("blockquote")} label="Blockquote" keytip="Q">
        <Quote className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive("codeBlock")} label="Code Block" keytip="K">
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
      <ToolButton onClick={insertLink} isActive={editor.isActive("link")} label="Insert Link" keytip="G">
        <Link className="size-4" />
      </ToolButton>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={(props) => (
            <ToolButton {...props} isActive={false} label="Insert Image" keytip="E">
              <ImageIcon className="size-4" />
            </ToolButton>
          )}
        />
        <DropdownMenuContent align="start" className="min-w-[140px]">
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <span>파일에서 선택</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={insertImage}>
            <span>URL 입력</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleImageFile(file)
          e.target.value = ""
        }}
      />
      <ToolButton onClick={insertTable} isActive={editor.isActive("table")} label="Insert Table" keytip="T">
        <Table className="size-4" />
      </ToolButton>
      <Separator orientation="vertical" className="mx-1 h-6" />
      <ToolButton onClick={() => editor.chain().focus().addRowBefore().run()} isActive={false} disabled={!inTable} label="행 위에 추가" keytip="A">
        <ArrowUpFromLine className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().addRowAfter().run()} isActive={false} disabled={!inTable} label="행 아래에 추가" keytip="H">
        <ArrowDownToLine className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().addColumnBefore().run()} isActive={false} disabled={!inTable} label="열 앞에 추가" keytip="O">
        <ArrowLeftFromLine className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().addColumnAfter().run()} isActive={false} disabled={!inTable} label="열 뒤에 추가" keytip="V">
        <ArrowRightToLine className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().mergeCells().run()} isActive={false} disabled={!inTable} label="셀 병합" keytip="4">
        <TableCellsMerge className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().splitCell().run()} isActive={false} disabled={!inTable} label="셀 분할" keytip="5">
        <TableCellsSplit className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().deleteRow().run()} isActive={false} disabled={!inTable} label="행 삭제" keytip="6">
        <Trash2 className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().deleteColumn().run()} isActive={false} disabled={!inTable} label="열 삭제" keytip="7">
        <SquareX className="size-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().deleteTable().run()} isActive={false} disabled={!inTable} label="표 삭제" keytip="8">
        <Ban className={cn("size-4", inTable && "text-destructive")} />
      </ToolButton>
      <div className="relative flex items-center">
        <input
          ref={colorInputRef}
          type="color"
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          tabIndex={-1}
          disabled={!inTable}
          onChange={(e) => handleCellBgColor(e.target.value)}
          title="셀 배경색"
        />
        <ToolButton
          onClick={() => colorInputRef.current?.click()}
          isActive={false}
          disabled={!inTable}
          label="셀 배경색"
          keytip="9"
        >
          <PaintBucket className="size-4" />
        </ToolButton>
      </div>
      <ToolButton onClick={removeCellBgColor} isActive={false} disabled={!inTable} label="배경색 제거" keytip="0">
        <span className="text-xs font-bold leading-none">×</span>
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().setHorizontalRule().run()} isActive={false} label="Horizontal Rule (삽입)" keytip="M">
        <Minus className="size-4" />
      </ToolButton>

      <ToolButton onClick={() => editor.chain().focus().insertContent({ type: "pageBreak", attrs: { auto: false } }).run()} isActive={false} label="Page Break" keytip="P">
        <SeparatorHorizontal className="size-4" />
      </ToolButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Fullscreen */}
      <ToolButton onClick={toggleFullscreen} isActive={false} label="Fullscreen" keytip="F">
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
        keytip="W"
      >
        <Maximize className="size-4" />
      </ToolButton>
      <ToolButton
        onClick={() => onPageModeChange?.("ilche")}
        isActive={pageMode === "ilche"}
        label="일체 (A4 연속)"
        keytip="D"
      >
        <FileText className="size-4" />
      </ToolButton>
      <ToolButton
        onClick={() => onPageModeChange?.("bunri")}
        isActive={pageMode === "bunri"}
        label="분리 (A4 페이지 구분)"
        keytip="N"
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

          {/* 보고서 양식(테마) 선택 — 편집 화면이 곧 결과물 양식 */}
          <Select
            value={reportTheme}
            onValueChange={(v: string | null) => {
              if (v && (REPORT_THEMES as string[]).includes(v)) {
                onReportThemeChange?.(v as ReportTheme)
              }
            }}
          >
            <SelectTrigger className="h-7 w-[100px] text-xs px-2">
              <SelectValue placeholder="양식" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_THEMES.map((key) => (
                <SelectItem key={key} value={key}>
                  {REPORT_THEME_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        </>
      )}

      {/* Print — 인쇄도 PDF 저장과 동일한 통일 엔진(prepare→window.print)을 거쳐야
          @page 여백·페이지 경계가 화면과 일치한다. window.print() 직접 호출 금지. */}
      <ToolButton
        onClick={() => window.dispatchEvent(new CustomEvent("md-editor:export-pdf"))}
        isActive={false}
        label="Print (Ctrl+P)"
      >
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

      {/* Save as HWPX */}
      <ToolButton
        onClick={() => onSaveHwpx?.()}
        isActive={false}
        label="HWPX(한글) 저장"
      >
        <FileSpreadsheet className="size-4" />
      </ToolButton>

      {/* Save as DOCX(Word) */}
      <ToolButton
        onClick={() => onSaveDocx?.()}
        isActive={false}
        label="Word(.docx) 저장"
      >
        <FileType2 className="size-4" />
      </ToolButton>
      </div>
    </div>
    </KeytipsContext.Provider>
  )
}