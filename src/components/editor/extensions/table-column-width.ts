import { Extension } from "@tiptap/core"
import { TableMap, cellAround, findCell } from "@tiptap/pm/tables"
import { findParentNode } from "@tiptap/core"
import type { Editor } from "@tiptap/react"

export interface ColumnInfo {
  index: number
  width: number
}

export function getColumnInfo(editor: Editor): ColumnInfo | null {
  const { selection } = editor.state
  const table = findParentNode(node => node.type.name === "table")(selection)
  if (!table) return null

  const $cell = cellAround(selection.$from)
  if (!$cell) return null

  const cellRect = findCell($cell)
  const colIndex = cellRect.left

  const tableMap = TableMap.get(table.node)
  const firstCellPos = tableMap.map[colIndex]
  const firstCell = table.node.nodeAt(firstCellPos)

  if (firstCell) {
    const colwidth = firstCell.attrs.colwidth
    if (colwidth && Array.isArray(colwidth)) {
      const firstCellRect = tableMap.findCell(firstCellPos)
      const localIndex = colIndex - firstCellRect.left
      const w = colwidth[localIndex]
      if (typeof w === "number") {
        return { index: colIndex, width: w }
      }
    }
  }

  const headerDom = editor.view.nodeDOM(table.start + firstCellPos)
  if (headerDom instanceof HTMLElement) {
    return { index: colIndex, width: headerDom.offsetWidth }
  }

  return { index: colIndex, width: 80 }
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableColumnWidth: {
      setColumnWidth: (colIndex: number, width: number) => ReturnType
    }
  }
}

export const TableColumnWidth = Extension.create({
  name: "tableColumnWidth",

  addCommands() {
    return {
      setColumnWidth:
        (colIndex: number, width: number) =>
        ({ editor, tr, dispatch }) => {
          const table = findParentNode(node => node.type.name === "table")(editor.state.selection)
          if (!table) return false

          if (dispatch) {
            const tableNode = table.node
            const tableStart = table.start
            const tableMap = TableMap.get(tableNode)

            const cellsInColumn = tableMap.cellsInRect({
              left: colIndex,
              top: 0,
              right: colIndex + 1,
              bottom: tableMap.height,
            })

            const uniqueCells = [...new Set(cellsInColumn)]

            uniqueCells.forEach(cellPos => {
              const cellRect = tableMap.findCell(cellPos)
              const cell = tableNode.nodeAt(cellPos)
              if (!cell) return

              const localColIndex = colIndex - cellRect.left
              const colwidth = cell.attrs.colwidth ? [...cell.attrs.colwidth] : []

              while (colwidth.length <= localColIndex) {
                colwidth.push(25)
              }
              colwidth[localColIndex] = width

              const docPos = tableStart + cellPos
              tr.setNodeMarkup(docPos, undefined, {
                ...cell.attrs,
                colwidth,
              })
            })

            tr.scrollIntoView()
            dispatch(tr)
          }
          return true
        },
    }
  },
})
