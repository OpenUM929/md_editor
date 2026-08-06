"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import type { Editor } from "@tiptap/react"
import type { Node as PmNode } from "@tiptap/pm/model"
import { findParentNode } from "@tiptap/core"
import { CellSelection, TableMap } from "@tiptap/pm/tables"

export function RowHeightSlider({ editor }: { editor: Editor | null }) {
  const [visible, setVisible] = useState(false)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const [value, setValue] = useState(30)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState("")
  const editRef = useRef<HTMLInputElement>(null)
  const rowIndexRef = useRef(0)
  const selectedRowsRef = useRef<number[]>([])
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
    let selectedRows: number[] = []

    if (selection instanceof CellSelection) {
      const anchorRect = tableMap.findCell(selection.$anchorCell.pos - table.start)
      const headRect = tableMap.findCell(selection.$headCell.pos - table.start)
      const top = Math.min(anchorRect.top, headRect.top)
      const bottom = Math.max(anchorRect.bottom, headRect.bottom)
      for (let r = top; r < bottom; r++) {
        selectedRows.push(r)
      }
    } else {
      const cell = findParentNode((n) => n.type.name === "tableCell" || n.type.name === "tableHeader")(selection)
      if (!cell) { setVisible(false); return }
      const cellPos = cell.pos - table.start
      const cellRect = tableMap.findCell(cellPos)
      selectedRows = [cellRect.top]
    }

    selectedRowsRef.current = selectedRows

    const firstRow = selectedRows[0]
    const cells = tableMap.cellsInRect({
      left: 0,
      top: firstRow,
      right: tableMap.width,
      bottom: firstRow + 1,
    })
    const uniqueCells = [...new Set(cells)]
    if (uniqueCells.length === 0) { setVisible(false); return }

    const firstCellPos = uniqueCells[0]
    const dom = editor.view.nodeDOM(table.start + firstCellPos)
    if (!(dom instanceof HTMLElement)) { setVisible(false); return }

    const rect = dom.getBoundingClientRect()
    const currentRowHeight = table.node.nodeAt(firstCellPos)?.attrs.rowHeight ?? null

    rowIndexRef.current = firstRow
    tableStartRef.current = table.start
    tableNodeRef.current = table.node
    setValue(currentRowHeight || 30)

    setStyle({
      left: Math.max(rect.left - 48, 4),
      top: Math.max(rect.top + rect.height / 2 - 40, 4),
    })
    setVisible(true)
  }, [editor, editing])

  useEffect(() => {
    if (!editor) return
    editor.on("selectionUpdate", update)
    update()
    return () => { editor.off("selectionUpdate", update) }
  }, [editor, update])

  const MIN = 10
  const MAX = 300

  const applyRowHeight = useCallback(
    (v: number) => {
      if (!editor) return
      v = Math.max(MIN, Math.min(MAX, v))
      const rows = selectedRowsRef.current
      const ts = tableStartRef.current
      const tn = tableNodeRef.current
      if (!tn || rows.length === 0) return

      const tr = editor.state.tr
      const tableMap = TableMap.get(tn)

      rows.forEach((ri) => {
        const cells = tableMap.cellsInRect({
          left: 0,
          top: ri,
          right: tableMap.width,
          bottom: ri + 1,
        })
        const uniqueCells = [...new Set(cells)]

        uniqueCells.forEach((cellPos) => {
          const cell = tn.nodeAt(cellPos)
          if (!cell) return
          tr.setNodeMarkup(ts + cellPos, undefined, { ...cell.attrs, rowHeight: v })
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
      applyRowHeight(Number(e.target.value))
    },
    [applyRowHeight],
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
      const clamped = Math.max(MIN, Math.min(MAX, v))
      applyRowHeight(clamped)
    }
    setEditing(false)
  }, [editText, applyRowHeight])

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
      className="fixed z-[9999] flex flex-col items-center gap-1 rounded-lg border bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur-sm"
      style={style}
    >
      <input
        type="range"
        min={MIN}
        max={MAX}
        value={value}
        onChange={handleSliderInput}
        className="h-20 w-1.5 cursor-pointer appearance-none rounded-full bg-muted accent-primary [writing-mode:vertical-lr] [direction:rtl] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
      />
      {editing ? (
        <input
          ref={editRef}
          type="number"
          min={MIN}
          max={MAX}
          value={editText}
          onChange={handleEditChange}
          onKeyDown={handleEditKeyDown}
          onBlur={handleEditBlur}
          className="h-5 w-12 shrink-0 rounded border bg-background px-1 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      ) : (
        <button
          onClick={handleValueClick}
          className="shrink-0 rounded px-1 text-xs font-mono text-muted-foreground tabular-nums hover:bg-muted/50 cursor-text"
          title="Click to edit"
        >
          {value}px
        </button>
      )}
    </div>
  )
}
