"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import type { Editor } from "@tiptap/react"

type SlashItem = {
  title: string
  description: string
  icon: string
  command: (editor: Editor) => void
}

const ITEMS: SlashItem[] = [
  { title: "Heading 1", description: "큰 제목", icon: "H1", command: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { title: "Heading 2", description: "중간 제목", icon: "H2", command: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { title: "Heading 3", description: "작은 제목", icon: "H3", command: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { title: "Bullet List", description: "글머리 기호 목록", icon: "\u2022", command: (e) => e.chain().focus().toggleBulletList().run() },
  { title: "Ordered List", description: "번호 목록", icon: "1.", command: (e) => e.chain().focus().toggleOrderedList().run() },
  { title: "Task List", description: "체크박스 목록", icon: "\u2611", command: (e) => e.chain().focus().toggleTaskList().run() },
  { title: "Blockquote", description: "인용구", icon: "\u275D", command: (e) => e.chain().focus().toggleBlockquote().run() },
  { title: "Code Block", description: "코드 블록", icon: "<>", command: (e) => e.chain().focus().toggleCodeBlock().run() },
  { title: "Table", description: "테이블", icon: "\u229E", command: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3 }).run() },
  { title: "Horizontal Rule", description: "구분선", icon: "\u2014", command: (e) => e.chain().focus().setHorizontalRule().run() },
  { title: "Image", description: "이미지 삽입", icon: "\uD83D\uDDBC", command: (e) => {
    const url = window.prompt("이미지 URL:")
    if (url) e.chain().focus().setImage({ src: url }).run()
  }},
  { title: "Link", description: "링크 삽입", icon: "\uD83D\uDD17", command: (e) => {
    const url = window.prompt("링크 URL:")
    if (url) e.chain().focus().setLink({ href: url }).run()
  }},
  { title: "Page Break", description: "페이지 나누기", icon: "\u23AF", command: (e) => e.chain().focus().insertContent({ type: "pageBreak", attrs: { auto: false } }).run() },
]

type Pos = { x: number; y: number }

type Props = {
  editor: Editor | null
}

export function SlashCommandPopup({ editor }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 })
  const [search, setSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const editorRef = useRef(editor)
  const selectedIndexRef = useRef(selectedIndex)
  const filteredRef = useRef<SlashItem[]>(ITEMS)

  const filtered = ITEMS.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.description.includes(search)
  )

  useEffect(() => {
    editorRef.current = editor
    filteredRef.current = filtered
    selectedIndexRef.current = selectedIndex
  })

  const close = useCallback(() => {
    setOpen(false)
    setSearch("")
    setSelectedIndex(0)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Pos>).detail
      setPos(detail)
      setSearch("")
      setSelectedIndex(0)
      setOpen(true)
    }

    const keyHandler = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === "Escape") { close(); return }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filteredRef.current.length - 1)); return }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); return }
      if (e.key === "Enter") {
        e.preventDefault()
        const item = filteredRef.current[selectedIndexRef.current]
        if (item && editorRef.current) {
          item.command(editorRef.current)
          close()
        }
        return
      }
    }

    document.addEventListener("slash-open" as unknown as keyof WindowEventMap, handler as EventListener)
    document.addEventListener("keydown", keyHandler)
    return () => {
      document.removeEventListener("slash-open" as unknown as keyof WindowEventMap, handler as EventListener)
      document.removeEventListener("keydown", keyHandler)
    }
  }, [open, close])

  if (!open) return null

  return createPortal(
    <div className="fixed z-[100] w-64 rounded-lg border bg-popover p-1 shadow-lg" style={{ left: pos.x, top: pos.y + 4 }}>
      {filtered.length === 0 && (
        <div className="px-2 py-4 text-center text-sm text-muted-foreground">일치하는 항목이 없습니다</div>
      )}
      {filtered.map((item, i) => (
        <button
          key={item.title}
          className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors ${i === selectedIndex ? "bg-muted" : ""}`}
          onClick={() => {
            if (editorRef.current) {
              item.command(editorRef.current)
              close()
            }
          }}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded border bg-background text-xs font-mono">{item.icon}</span>
          <div className="flex flex-col items-start">
            <span className="font-medium">{item.title}</span>
            <span className="text-xs text-muted-foreground">{item.description}</span>
          </div>
        </button>
      ))}
    </div>,
    document.body
  )
}
