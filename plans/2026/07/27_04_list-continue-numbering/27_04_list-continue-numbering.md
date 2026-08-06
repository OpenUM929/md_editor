# 계획서 — 목록(리스트) 넘버링 이어서 생성 기능

> 상태: Doing | 작성일: 2026-07-27
> 작업 유형: B (기능 개선)
> 선행: -

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-27 | 최초 작성 | |

---

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | Ordered list가 있는 paragraph 바로 아래에서 ordered list 토글 시, 기존 `<ol>`에 합류하여 번호가 이어서(2, 3, 4...) 생성되는가? | Y | - |
| 1.2 | Bullet list가 있는 paragraph 바로 아래에서 bullet list 토글 시, 기존 `<ul>`에 합류하는가? | Y | - |
| 1.3 | Task list가 있는 paragraph 바로 아래에서 task list 토글 시, 기존 `<ul class="task-list-item">`에 합류하는가? | Y | - |
| 1.4 | 이미 listItem 안에 커서가 있을 때 list 토글 버튼 클릭 시, 기존 동작(토글 해제)이 유지되는가? | Y | - |
| 1.5 | 이전 형제 노드가 리스트가 아닐 때(heading, paragraph 등), list 토글 시 새 리스트가 정상 생성되는가? | Y | - |
| 1.6 | 이전 형제 노드가 다른 타입 리스트일 때(예: bullet 위에서 ordered 토글), 새 리스트가 정상 생성되는가? | Y | - |
| 1.7 | 슬래시 커맨드(`/`)로 ordered/bullet/task list 선택 시에도 동일한 합류 동작이 적용되는가? | Y | - |

---

## 1. 배경 및 목적

md_editor의 툴바·슬래시 커맨드에서 ordered/bullet/task list를 토글할 때, 바로 위에 동일 타입의 리스트가 있어도 항상 **새로운 리스트를 생성**한다.

이로 인해 "1. 시스템 접속" 아래에서 ordered list를 토글하면 "1."이 다시 시작되는 문제가 발생한다. 사용자는 이전 항목의 번호를 이어서("2.") 생성되기를 기대한다.

**목적**: paragraph 아래에 동일 타입 리스트가 있을 때, 기존 리스트에 합류하여 번호/불릿이 자동으로 이어지도록 개선한다.

## 2. 현재 시스템 분석

### 2.1 툴바 핸들러 (현재 동작)

```
src/components/editor/editor-toolbar.tsx:435-443
```

- `toggleBulletList()`: `editor.chain().focus().toggleBulletList().run()`
- `toggleOrderedList()`: `editor.chain().focus().toggleOrderedList().run()`
- `toggleTaskList()`: `editor.chain().focus().toggleTaskList().run()`

모두 Tiptap 기본 토글 명령만 호출. 현재 커서의 노드 타입이나 이전 형제 노드를 확인하지 않음.

### 2.2 슬래시 커맨드 (현재 동작)

```
src/components/editor/slash-command-popup.tsx:18-20
```

- 동일하게 `toggleBulletList()`, `toggleOrderedList()`, `toggleTaskList()` 호출

### 2.3 문제점

Tiptap의 `toggleOrderedList()`는 현재 paragraph를 `<ol><li>`로 감싸서 **새로운 `<ol>` 요소**를 항상 생성한다. 이전 노드가 orderedList인지 확인하지 않으므로, 같은 `<ol>` 안에 합류하지 않고 별도 `<ol>`이 만들어져 번호가 "1."부터 재시작된다.

## 3. 구현 상세

### 3.1 신규 파일: `src/lib/list-continue.ts`

```typescript
import type { Editor } from "@tiptap/react"

type ListType = "orderedList" | "bulletList" | "taskList"

/**
 * paragraph가 동일 타입 리스트 바로 아래에 있을 때,
 * 기존 리스트에 합류하여 새 항목을 만든다.
 * 합류 불가 시 false를 반환하여 기존 toggle 동작으로 폴백한다.
 */
export function continueList(editor: Editor, listType: ListType): boolean {
  const { state } = editor
  const { selection } = state
  const { $from } = selection

  // 1. 현재 노드가 paragraph인지 확인
  if ($from.parent.type.name !== "paragraph") return false

  // 2. paragraph가 listItem 내부에 있는지 확인 (이미 리스트 항목이면 토글 유지)
  if ($from.parent.parent?.type.name === "listItem") return false

  // 3. 현재 블록의 시작 위치
  const blockStart = $from.before(1)
  if (blockStart <= 0) return false

  // 4. 이전 형제 노드가 같은 타입 리스트인지 확인
  const $prev = state.doc.resolve(blockStart - 1)
  const parent = $prev.parent
  const index = $prev.index($prev.depth - 1)
  if (index <= 0) return false

  const prevNode = parent.child(index - 1)
  if (prevNode.type.name !== listType) return false

  // 5. paragraph 내용을 복사
  const content = $from.parent.content

  // 6. 기존 리스트 끝 위치 (마지막 listItem 뒤)
  const prevListEnd = blockStart - 1 + prevNode.nodeSize

  // 7. 새 listItem 생성
  const listItemType = state.schema.nodes.listItem
  const paragraphType = state.schema.nodes.paragraph
  const newParagraph = paragraphType.create(null, content)
  const newListItem = listItemType.create(null, newParagraph)

  // 8. transaction: 기존 리스트 끝에 삽입 + 원래 paragraph 삭제
  const tr = state.tr.insert(prevListEnd - 1, newListItem)
  const insertedSize = newListItem.nodeSize

  // paragraph 위치 (삽입 후 조정)
  const deleteFrom = blockStart - 1
  const deleteTo = blockStart + $from.parent.nodeSize - 1
  tr.delete(deleteFrom + insertedSize, deleteTo + insertedSize)

  // 9. 커서를 새 listItem 끝으로 이동
  const cursorPos = prevListEnd - 1 + newListItem.nodeSize - 1
  tr.setSelection(state.selection.constructor.near(tr.doc.resolve(cursorPos)))

  editor.view.dispatch(tr.scrollIntoView())
  return true
}
```

**동작 원리:**
1. 현재 노드가 paragraph인지 확인
2. paragraph가 이미 listItem 내부에 없는지 확인 (이미 리스트 항목이면 토글 해제 동작 유지)
3. 이전 형제 노드가 같은 타입 리스트인지 확인
4. 확인 시: ProseMirror transaction으로 기존 리스트 마지막 항목 뒤에 새 listItem 삽입 + 원래 paragraph 삭제
5. orderedList인 경우: 같은 `<ol>` 내부이므로 번호 자동 증가

### 3.2 툴바 핸들러 수정: `src/components/editor/editor-toolbar.tsx`

기존:
```typescript
<ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} ... />
<ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} ... />
<ToolButton onClick={() => editor.chain().focus().toggleTaskList().run()} ... />
```

변경:
```typescript
import { continueList } from "@/lib/list-continue"

<ToolButton onClick={() => continueList(editor, "bulletList") || editor.chain().focus().toggleBulletList().run()} ... />
<ToolButton onClick={() => continueList(editor, "orderedList") || editor.chain().focus().toggleOrderedList().run()} ... />
<ToolButton onClick={() => continueList(editor, "taskList") || editor.chain().focus().toggleTaskList().run()} ... />
```

**논리:** `continueList()`가 `true`를 반환하면 합류 완료. `false`를 반환하면(합류 조건 미충족) 기존 `toggle` 명령으로 폴백.

### 3.3 슬래시 커맨드 수정: `src/components/editor/slash-command-popup.tsx`

동일 패턴으로 `ITEMS` 배열의 command 함수를 변경.

## 4. 구현 순서

| 순서 | 작업 내용 | 의존 |
|------|-----------|------|
| 1 | `src/lib/list-continue.ts` 신규 생성 | - |
| 2 | `editor-toolbar.tsx` 툴바 핸들러 수정 + import 추가 | 1 |
| 3 | `slash-command-popup.tsx` 슬래시 커맨드 수정 + import 추가 | 1 |
| 4 | `tsc --noEmit` + `eslint` 검증 | 2, 3 |

## 5. 영향도 분석

| 파일 | 변경 내용 | 영향 |
|------|-----------|------|
| `src/lib/list-continue.ts` | 신규 | 없음(신규 모듈) |
| `src/components/editor/editor-toolbar.tsx` | import 추가 + onClick 핸들러 3개 수정 | 기존 버튼 동작은 continueList가 false일 때 폴백으로 보존 |
| `src/components/editor/slash-command-popup.tsx` | import 추가 + command 함수 3개 수정 | 동일 |

## 6. 테스트/검증 계획

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| 1 | `npx tsc --noEmit` | 에러 0건 |
| 2 | 관련 파일 `eslint` | 신규 에러 0건 |
| 3 | "1. 항목" 바로 아래 paragraph에서 ordered list 토글 | "2." 번호 이어서 생성 |
| 4 | "• 항목" 바로 아래 paragraph에서 bullet list 토글 | 동일 `<ul>`에 합류 |
| 5 | "☐ 항목" 바로 아래 paragraph에서 task list 토글 | 동일 `<ul class="task-list-item">`에 합류 |
| 6 | 이미 listItem 안에서 list 토글 클릭 | 토글 해제 (기존 동작 유지) |
| 7 | heading 아래에서 ordered list 토글 | 새 `<ol>` "1." 생성 (기존 동작 유지) |
| 8 | bullet list 아래에서 ordered list 토글 | 새 `<ol>` 생성 (타입 다름) |
| 9 | 슬래시 커맨드로 ordered list 선택 시 | 툴바와 동일한 합류 동작 |

## 7. 리스크 및 제약

- **paragraph 뒤 빈 리스트 항목 생성**: 빈 paragraph에서 토글 시 빈 "2." 항목이 생성됨. 이는 사용자가 텍스트를 입력할 위치를 제공하는 것이므로 의도된 동작.
- **nested list 미지원**: 깊이 들어간 nested list 항목 뒤 paragraph에서의 합류는 이번 범위 밖. 현재 `prevNode`가 최상위 레벨 리스트만 확인.
- **기존 토글 동작 보존**: `continueList()`가 `false`를 반환하면 반드시 기존 `toggle` 명령이 실행되므로, 조건 미충족 시 회귀 없음.
