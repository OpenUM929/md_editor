"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import type { Editor } from "@tiptap/react"
import type { Node as PmNode } from "@tiptap/pm/model"
import { findParentNode } from "@tiptap/core"
import { CellSelection, TableMap } from "@tiptap/pm/tables"
import { getColumnInfo } from "./extensions/table-column-width"

export function ColumnWidthSlider({ editor }: { editor: Editor | null }) {
  const [visible, setVisible] = useState(false)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const [value, setValue] = useState(80)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState("")
  const editRef = useRef<HTMLInputElement>(null)
  const colIndexRef = useRef(0)
  const selectedColsRef = useRef<number[]>([])
  const tableStartRef = useRef(0)
  const tableNodeRef = useRef<PmNode | null>(null)

  const update = useCallback(() => {
    if (editing) return
    if (!editor || !editor.isActive("table")) {
      setVisible(false)
      return
    }

    const { selection } = editor.state
    const table = findParentNode((n) => n.type.name === "table")(selection)
    if (!table) { setVisible(false); return }

    const tableMap = TableMap.get(table.node)
    let selectedCols: number[] = []

    if (selection instanceof CellSelection) {
      const anchorRect = tableMap.findCell(selection.$anchorCell.pos - table.start)
      const headRect = tableMap.findCell(selection.$headCell.pos - table.start)
      const left = Math.min(anchorRect.left, headRect.left)
      const right = Math.max(anchorRect.right, headRect.right)
      for (let c = left; c < right; c++) {
        selectedCols.push(c)
      }
    } else {
      const info = getColumnInfo(editor)
      if (!info) { setVisible(false); return }
      selectedCols = [info.index]
    }

    selectedColsRef.current = selectedCols

    const firstCol = selectedCols[0]
    const cellPos = tableMap.map[firstCol]
    const dom = editor.view.nodeDOM(table.start + cellPos)
    if (!(dom instanceof HTMLElement)) { setVisible(false); return }

    const rect = dom.getBoundingClientRect()
    const firstCell = table.node.nodeAt(cellPos)
    const colwidth = firstCell?.attrs.colwidth
    const width = (colwidth && Array.isArray(colwidth) && typeof colwidth[0] === "number") ? colwidth[0] : rect.width

    colIndexRef.current = firstCol
    tableStartRef.current = table.start
    tableNodeRef.current = table.node
    setValue(width)
    setStyle({ left: rect.left, top: rect.top - 38, width: Math.max(rect.width, 140) })
    setVisible(true)
  }, [editor, editing])

  useEffect(() => {
    if (!editor) return
    editor.on("selectionUpdate", update)
    update()
    return () => { editor.off("selectionUpdate", update) }
  }, [editor, update])

  const MIN = 40
  const MAX = 500

  const applyWidth = useCallback(
    (v: number) => {
      if (!editor) return
      v = Math.max(MIN, Math.min(MAX, v))
      const cols = selectedColsRef.current
      const ts = tableStartRef.current
      const tn = tableNodeRef.current
      if (!tn || cols.length === 0) return

      const tr = editor.state.tr
      const tableMap = TableMap.get(tn)

      cols.forEach((ci) => {
        const cells = tableMap.cellsInRect({
          left: ci,
          top: 0,
          right: ci + 1,
          bottom: tableMap.height,
        })
        const uniqueCells = [...new Set(cells)]

        uniqueCells.forEach((cellPos) => {
          const cellRect = tableMap.findCell(cellPos)
          const cell = tn.nodeAt(cellPos)
          if (!cell) return

          const localIdx = ci - cellRect.left
          const colwidth = cell.attrs.colwidth ? [...cell.attrs.colwidth] : []
          while (colwidth.length <= localIdx) colwidth.push(25)
          colwidth[localIdx] = v

          tr.setNodeMarkup(ts + cellPos, undefined, { ...cell.attrs, colwidth })
        })
      })

      tr.scrollIntoView()
      editor.view.dispatch(tr)
      setValue(v)
    },
    [editor],
  )

  const handleSliderInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      applyWidth(Number(e.target.value))
    },
    [applyWidth],
  )

  const handleValueClick = useCallback(() => {
    setEditText(String(value))
    setEditing(true)
  }, [value])

  const handleEditChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditText(e.target.value)
    },
    [],
  )

  const commitEdit = useCallback(() => {
    const v = parseInt(editText)
    if (!isNaN(v)) {
      const clamped = Math.max(40, Math.min(500, v))
      applyWidth(clamped)
    }
    setEditing(false)
  }, [editText, applyWidth])

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        commitEdit()
      }
      if (e.key === "Escape") {
        setEditing(false)
      }
    },
    [commitEdit],
  )

  const handleEditBlur = useCallback(() => {
    commitEdit()
  }, [commitEdit])

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus()
      editRef.current.select()
    }
  }, [editing])

  if (!visible) return null

  return (
    <div
      className="fixed z-[9999] flex items-center gap-2 rounded-lg border bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur-sm"
      style={style}
    >
      <input
        type="range"
        min={40}
        max={500}
        value={value}
        onChange={handleSliderInput}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
      />
      {editing ? (
        <input
          ref={editRef}
          type="number"
          min={40}
          max={500}
          value={editText}
          onChange={handleEditChange}
          onKeyDown={handleEditKeyDown}
          onBlur={handleEditBlur}
          className="h-5 w-14 shrink-0 rounded border bg-background px-1 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      ) : (
        <button
          onClick={handleValueClick}
          className="shrink-0 rounded px-1 text-xs font-mono text-muted-foreground tabular-nums hover:bg-muted/50 cursor-text"
          title="클릭하여 값 입력"
        >
          {value}px
        </button>
      )}
    </div>
  )
}
