"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { UI_HOVER_DELAY_MS, locateAt, type UiLocatorInfo } from "@/lib/ui-locator-registry"

export function UiLocator() {
  const [active, setActive] = useState(false)
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [info, setInfo] = useState<UiLocatorInfo>({ path: "", button: null, file: null })

  const activeRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const posRef = useRef({ x: 0, y: 0 })

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!activeRef.current) return
      posRef.current = { x: e.clientX, y: e.clientY }
      setPos({ x: e.clientX, y: e.clientY })
      clearTimer()
      setVisible(false)
      timerRef.current = setTimeout(() => {
        const result = locateAt(posRef.current.x, posRef.current.y)
        setInfo(result)
        setVisible(true)
      }, UI_HOVER_DELAY_MS)
    },
    [clearTimer]
  )

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === "KeyL") {
        e.preventDefault()
        activeRef.current = !activeRef.current
        setActive(activeRef.current)
        setVisible(false)
        if (!activeRef.current) clearTimer()
        return
      }

      if (activeRef.current && e.key === "`") {
        e.preventDefault()
        const { path, button, file } = info
        if (!path && !button) {
          toast("복사할 UI 정보가 없습니다")
          return
        }
        const lines = [
          `[UI 좌표] ${path ? path + (button ? ` > [버튼] ${button}` : "") : `[버튼] ${button}`}`,
          `[구현]   ${file ?? "(안내 없음)"}`,
        ]
        void copyToClipboard(lines.join("\n"))
        toast("복사됨")
        activeRef.current = false
        setActive(false)
        setVisible(false)
        clearTimer()
      }
    },
    [copyToClipboard, info, clearTimer]
  )

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("keydown", handleKeyDown)
      clearTimer()
    }
  }, [handleMouseMove, handleKeyDown, clearTimer])

  if (process.env.NODE_ENV !== "development") return null

  if (!active) return null

  return (
    <div
      data-ui-locator="true"
      className="pointer-events-none fixed z-[9999]"
      style={{ left: pos.x + 16, top: pos.y + 16 }}
    >
      {visible && (
        <div className="max-w-xs rounded-md border bg-popover px-3 py-2 text-xs shadow-lg">
          <div className="font-medium text-foreground">
            {info.path || (info.button ? `[버튼] ${info.button}` : "레이아웃 정보 없음")}
          </div>
          {info.button && info.path && (
            <div className="mt-0.5 text-muted-foreground">[버튼] {info.button}</div>
          )}
          {info.file && <div className="mt-0.5 text-muted-foreground">{info.file}</div>}
        </div>
      )}
    </div>
  )
}