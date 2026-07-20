import { useCallback, useRef, useEffect } from "react"
import type { Editor } from "@tiptap/react"
import type { MarginValues } from "@/lib/a4-margins"
import { mmToPx, getPrintableHeight } from "@/lib/a4-margins"
import type { PageMode } from "@/lib/page-mode"

export function useAutoPageBreak(
  editor: Editor | null,
  pageMode: PageMode,
  marginValues: MarginValues | null
) {
  const isSyncing = useRef(false)

  const sync = useCallback(() => {
    if (!editor || isSyncing.current || pageMode !== "bunri" || !marginValues) return
    const dom = editor.view.dom
    if (!dom || !dom.isConnected) return

    isSyncing.current = true

    try {
      const pageBreakType = editor.state.schema.nodes.pageBreak
      if (!pageBreakType) return

      const PAGE_HEIGHT_PX = mmToPx(getPrintableHeight(marginValues))

      let pageBreakHeight = 0
      for (let i = 0; i < dom.children.length; i++) {
        const child = dom.children[i]
        if (child instanceof HTMLElement && child.hasAttribute("data-page-break")) {
          pageBreakHeight += child.offsetHeight || 0
        }
      }

      const contentHeight = Math.max(0, dom.scrollHeight - pageBreakHeight)
      const expectedBreaks = Math.max(0, Math.ceil(contentHeight / PAGE_HEIGHT_PX) - 1)

      const autoPositions: number[] = []
      let totalBreaks = 0

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "pageBreak") {
          totalBreaks++
          if (node.attrs.auto) {
            autoPositions.push(pos)
          }
        }
      })

      if (totalBreaks === expectedBreaks) return

      if (totalBreaks < expectedBreaks) {
        const needed = expectedBreaks - totalBreaks
        const insertPositions: number[] = []
        let nextBoundary = PAGE_HEIGHT_PX
        const proseRect = dom.getBoundingClientRect()

        editor.state.doc.forEach((node, offset) => {
          if (insertPositions.length >= needed) return
          if (node.type.name === "pageBreak") return

          const startCoords = editor.view.coordsAtPos(offset, -1)
          if (!startCoords) return
          const startTop = startCoords.top - proseRect.top

          if (startTop >= nextBoundary && offset > 0) {
            insertPositions.push(offset)
            nextBoundary += PAGE_HEIGHT_PX
            return
          }

          const endPos = offset + node.nodeSize
          const endCoords = editor.view.coordsAtPos(endPos, 1)
          if (!endCoords) return
          const endTop = endCoords.top - proseRect.top

          if (startTop < nextBoundary && endTop >= nextBoundary) {
            insertPositions.push(endPos)
            nextBoundary += PAGE_HEIGHT_PX
          }
        })

        if (insertPositions.length > 0) {
          const tr = editor.state.tr
          for (const pos of insertPositions) {
            tr.insert(pos, pageBreakType.create({ auto: true }))
          }
          editor.view.dispatch(tr)
        }
      } else if (totalBreaks > expectedBreaks && autoPositions.length > 0) {
        const excess = totalBreaks - expectedBreaks
        const toRemove = Math.min(excess, autoPositions.length)
        const removePositions = autoPositions.slice(-toRemove).reverse()

        if (removePositions.length > 0) {
          const tr = editor.state.tr
          for (const pos of removePositions) {
            const node = editor.state.doc.nodeAt(pos)
            if (node) {
              tr.delete(pos, pos + node.nodeSize)
            }
          }
          editor.view.dispatch(tr)
        }
      }
    } finally {
      isSyncing.current = false
    }
  }, [editor, pageMode, marginValues])

  useEffect(() => {
    if (!editor) return

    let timer: ReturnType<typeof setTimeout> | undefined

    const handler = () => {
      clearTimeout(timer)
      timer = setTimeout(sync, 150)
    }

    editor.on("update", handler)

    timer = setTimeout(sync, 300)

    return () => {
      editor.off("update", handler)
      clearTimeout(timer)
    }
  }, [editor, sync])
}
