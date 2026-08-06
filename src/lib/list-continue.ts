import type { Editor } from "@tiptap/react"
import { TextSelection } from "prosemirror-state"

type ListType = "orderedList" | "bulletList" | "taskList"

/**
 * 1) paragraph가 동일 타입 리스트 바로 아래에 있을 때 → 기존 리스트에 합류
 * 2) paragraph가 번호가 포함된 heading 바로 아래에 있을 때 → heading 번호 이어붙여 새 리스트 생성
 * 해당 없으면 false 반환하여 기존 toggle 동작으로 폴백.
 */
export function continueList(editor: Editor, listType: ListType): boolean {
  const { state } = editor
  const { $from } = state.selection

  if ($from.parent.type.name !== "paragraph") return false
  if ($from.depth > 2) return false

  const doc = state.doc
  const paragraph = $from.parent

  let paragraphIndex = -1
  for (let i = 0; i < doc.childCount; i++) {
    if (doc.child(i) === paragraph) {
      paragraphIndex = i
      break
    }
  }
  if (paragraphIndex <= 0) return false

  const prevNode = doc.child(paragraphIndex - 1)

  if (prevNode.type.name === listType) {
    const content = paragraph.content

    let prevListStart = 0
    for (let i = 0; i < paragraphIndex - 1; i++) {
      prevListStart += doc.child(i).nodeSize
    }
    const prevListEnd = prevListStart + prevNode.nodeSize

    const insertPos = prevListEnd - 1

    const listItemType = state.schema.nodes.listItem
    const paragraphType = state.schema.nodes.paragraph
    const newParagraph = paragraphType.create(null, content)
    const newListItem = listItemType.create(null, newParagraph)

    const tr = state.tr.insert(insertPos, newListItem)
    const insertedSize = newListItem.nodeSize

    const oldParaStart = prevListEnd
    const oldParaEnd = oldParaStart + paragraph.nodeSize
    tr.delete(oldParaStart + insertedSize, oldParaEnd + insertedSize)

    const cursorPos = insertPos + newListItem.nodeSize - 1
    tr.setSelection(TextSelection.near(tr.doc.resolve(cursorPos)))

    editor.view.dispatch(tr.scrollIntoView())
    return true
  }

  if (listType === "orderedList" && prevNode.type.name === "heading") {
    const match = prevNode.textContent.match(/^(\d+)\./)
    if (match) {
      const startNum = parseInt(match[1]) + 1

      let paraStart = 0
      for (let i = 0; i < paragraphIndex; i++) {
        paraStart += doc.child(i).nodeSize
      }
      const paraEnd = paraStart + paragraph.nodeSize

      const listItemType = state.schema.nodes.listItem
      const paragraphType = state.schema.nodes.paragraph
      const listItem = listItemType.create(null, paragraphType.create(null, paragraph.content))
      const ol = state.schema.nodes.orderedList.create({ start: startNum }, listItem)

      const tr = state.tr.replaceWith(paraStart, paraEnd, ol)
      const cursorPos = paraStart + ol.nodeSize - 2
      tr.setSelection(TextSelection.near(tr.doc.resolve(cursorPos)))

      editor.view.dispatch(tr.scrollIntoView())
      return true
    }
  }

  return false
}
