# 계획서 — 글머리표 및 문단 번호 (한글/워드 수준 목록 기능)

> 상태: Todo | 작성일: 2026-07-27
> 작업 유형: B (기능 개선/신규 기능)
> 선행: `plans/2026/07/27_04_list-continue-numbering`, `plans/2026/07/27_02_heading-numbering-toggle`
> 기반 PRD: [prd.md](./prd.md)
> 참조 문서: `clinerules/core/00-core/03-plan-mode/README.md`, `clinerules/core/00-core/03-plan-mode/type-b-feature.md`

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-27 | 최초 작성 | PRD v1.0 기반 1차 범위(FR-1~FR-9) 계획 수립 |

---

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | 문단 번호 드롭다운에서 `가.` 를 고르면 커서 위치 목록의 마커가 `가. 나. 다.` 로 바뀌는가? | Y | - |
| 1.2 | 글머리표 드롭다운에서 `□` 를 고르면 마커가 `□` 로 바뀌는가? | Y | - |
| 1.3 | 마커 12종(ordered) + 10종(bullet)이 모두 갤러리에 미리보기와 함께 노출되는가? | Y | - |
| 2.1 | 기본 프로필에서 1수준 `1.`, Tab 후 2수준이 `가.` 로 자동 표시되는가? | Y | - |
| 2.2 | 3수준 `1)`, 4수준 `(가)` 가 표시되는가? | Y | - |
| 2.3 | 5수준 이상에서 4수준 서식이 반복되는가? | Y | - |
| 2.4 | 글머리표 4수준이 `□ / ○ / – / ·` 로 표시되는가? | Y | - |
| 3.1 | 툴바 "수준 내리기/올리기" 버튼이 Tab/Shift+Tab 과 동일 결과를 내는가? | Y | - |
| 4.1 | "1부터 다시 시작" 실행 시 해당 목록이 1부터 시작하는가? | Y | - |
| 4.2 | 문단·표가 사이에 낀 상태에서 "이전 목록에 이어서 계속" 이 정확한 번호를 산출하는가? | Y | - |
| 4.3 | "시작 번호 지정" 으로 지정한 값이 저장·재열람 후에도 유지되는가? | Y | - |
| 5.1 | "목록 서식…" 패널에서 수준별 마커를 바꾸면 문서 전체 목록에 즉시 반영되는가? | Y | - |
| 5.2 | 프로필이 프론트매터 `listStyle` 로 저장되는가? | Y | - |
| 5.3 | 프로필을 건드리지 않은 문서는 저장 시 프론트매터에 `listStyle` 키가 생기지 않는가? | Y | - |
| 6.1 | 특정 목록만 `①` 로 바꾸면 `.md` 에 `<!-- list: marker=circled -->` 디렉티브가 생기는가? | Y | - |
| 6.2 | 오버라이드된 목록이 열기→저장→열기 왕복 후에도 유지되는가? | Y | - |
| 6.3 | 오버라이드가 없는 목록은 `.md` 에 주석이 생기지 않는가? | Y | - |
| 7.1 | `indent.step`/`hanging` 변경이 편집화면 마커·본문 위치에 반영되는가? | Y | - |
| 7.2 | 동일 값이 인쇄/PDF 에도 반영되는가? | Y | - |
| 8.1 | 탭 전환(언마운트) 후 재마운트 시 목록 서식이 유지되는가? | Y | - |
| 8.2 | 기존 문서(프론트매터 없음)를 열고 저장했을 때 `.md` diff 가 0인가? | Y | - |
| 9.1 | DOCX 로 내보낸 뒤 Word 에서 열었을 때 `가.`/`①` 마커가 화면과 일치하는가? | Y | - |
| 9.2 | HWPX 로 내보낸 뒤 한글에서 열었을 때 글머리표 문자·4수준 들여쓰기가 일치하는가? | Y | - |
| 9.3 | 인쇄 미리보기·PDF 내보내기 결과가 편집화면과 일치하는가? | Y | - |
| 10.1 | 기존 `list-continue.ts` 의 "윗 리스트 합류" 동작이 회귀 없이 유지되는가? | Y | - |
| 10.2 | 보고서 테마 문서에서 프로필 미지정 시 기존 `□/○` 표시가 유지되는가? | Y | - |

---

## 1. 배경 및 목적

md_editor의 목록 기능은 Tiptap StarterKit 기본 동작에 `list-continue.ts`(인접 리스트 합류)만 얹은 상태다. 마커 선택·수준별 서식·번호 제어·들여쓰기 조절이 전무해, 주 사용자층(관공서 보고서 실무자)이 기준으로 삼는 **한글의 "글머리표 및 문단 번호"·워드의 "다단계 목록"과 기능적 공통점이 거의 없다.**

본 계획서는 PRD v1.0의 **1차 범위(FR-1~FR-9)** 를 구현한다. 핵심은 다음 4가지다.

1. 마커 서식 카탈로그와 갤러리 UI
2. 문서 단위 목록 스타일 프로필(수준별 마커 + 들여쓰기) — 프론트매터 저장
3. 번호 제어(시작값/이어가기/다시 시작)와 목록별 오버라이드
4. 화면·인쇄·PDF·DOCX·HWPX 5개 출력의 서식 일치

**설계 원칙**: 마커 표현은 **CSS `@counter-style` + `list-style-type`** 으로만 처리한다. JS로 마커 텍스트를 그리지 않으므로 `page-flow-core.ts` 의 페이지 분할 계산에 부하나 간섭이 없고, 목록 시맨틱(스크린리더)도 유지된다.

## 2. 현재 시스템 분석

### 2.1 편집기 스키마

`src/components/editor/tiptap-editor.tsx:150-158`

```
StarterKit.configure({ heading: false, codeBlock: false, link: false, underline: false, horizontalRule: false })
TaskList, TaskItem.configure({ nested: true })
```

- `bulletList` / `orderedList` / `listItem` 은 StarterKit 기본값 그대로 사용하며 **커스텀 속성이 없다.**
- `CustomHeading`·`CustomHorizontalRule`·`TableColumnWidth` 처럼 확장으로 속성을 덧붙이는 선례가 이미 있다 → 동일 패턴 적용 가능.

### 2.2 툴바

`src/components/editor/editor-toolbar.tsx:453-462`

```tsx
<ToolButton onClick={() => continueList(editor, "bulletList") || editor.chain().focus().toggleBulletList().run()} ... />
<ToolButton onClick={() => continueList(editor, "orderedList") || editor.chain().focus().toggleOrderedList().run()} ... />
<ToolButton onClick={() => continueList(editor, "taskList") || editor.chain().focus().toggleTaskList().run()} ... />
```

- 드롭다운 패턴은 같은 파일의 제목 강조색 UI(`DropdownMenu` + `DropdownMenuContent`, 349-401행)에 선례가 있다.

### 2.3 수준 변경

`node_modules/@tiptap/extension-list/dist/index.js:513-514` — `ListItem` 이 `Tab → sinkListItem`, `Shift-Tab → liftListItem` 을 기본 바인딩한다. **동작 자체는 이미 있으나** 수준별 마커가 없어 사용자가 수준 변화를 인지하지 못한다.

### 2.4 화면 스타일

- `src/app/globals.css:139-142` — `.a4-canvas .ProseMirror :is(p, ul, ol, blockquote)` 여백 `0.7em` 고정. 목록 마커/들여쓰기 규칙 없음.
- `src/app/globals.css:375-383` — 목록 `break-inside: avoid`.
- `src/app/report-theme.css:90-127` — 보고서 테마일 때 `ul { list-style: none }` + `li::before { content: "□" }`, 중첩은 `○`. **사용자 선택 불가한 고정 규칙이며, `::before` 방식이라 프로필과 충돌한다.**
- `src/app/layout.tsx:8` — `report-theme.css` 를 전역 import. 신규 CSS도 동일 방식으로 등록 가능.

### 2.5 문서 옵션 저장 경로 (선례)

`src/lib/heading-numbering.ts` / `src/lib/report-theme.ts` 가 동일 구조를 갖는다.

- `xxxFromMarkdown(md)` / `xxxFromHtml(html)` — 프론트매터 파싱
- `xxxClass(value)` — 표면 요소에 붙일 클래스
- `doc-tab-content.tsx:49-66, 131-160` — state + `injectFrontmatter` 로 왕복 보장
- **주의**: Tiptap이 `getHTML()` 에서 `<template data-frontmatter>` 를 떨궈내므로 `updateTabContent` 마다 `injectFrontmatter` 재부착이 필수 (기존 회귀 이력).

### 2.6 마크다운 왕복

`src/lib/markdown.ts`

- `turndown` 커스텀 규칙: `taskList`, `strikethrough`, `gfmTable`, `pageBreak`, `imageCanonical`
- `marked` 커스텀 확장: `pagebreak`
- 목록은 두 라이브러리 기본 규칙 사용. **turndown 기본 `list` 규칙은 `ol[start]` 를 인식**하므로 시작 번호는 별도 작업 없이 왕복된다. **`data-*` 속성은 유실**되므로 오버라이드 표현이 필요하다.

### 2.7 DOCX 내보내기

`src/lib/docx-export.ts:353-374` — 넘버링 정의가 **하드코딩**.

- `ordered`: `LevelFormat.DECIMAL`, `text: "%n."`, 5수준, `indent { left: 720*(n+1), hanging: 360 }`
- `reportBullet`: `□`/`○`/`–` 3수준, 마커색 = 강조색

`docx` 라이브러리는 필요한 한글 서식을 이미 제공한다 (`node_modules/docx/dist/index.d.ts:2039-2046`): `DECIMAL_ENCLOSED_CIRCLE`(①), `GANADA`(가나다), `CHOSUNG`(ㄱㄴㄷ), `IDEOGRAPH__DIGITAL`(一二三), `UPPER_LETTER`/`LOWER_LETTER`/`UPPER_ROMAN`/`LOWER_ROMAN`.

### 2.8 HWPX 내보내기

- `src/lib/hwpx-plan.ts:19-20` — 블록 타입 `{ type: "bullet" | "ordered"; level; items: string[] }`
- `src/lib/hwpx-plan.ts:89-117` — `pushList`, 중첩은 level+1
- `scripts/hwpx_gen.py:118-126` — `doc.ensure_numbering(kind="bullet", levels=[{"char":"□"},{"char":"○"},{"char":"–"}])`, `kind="number"` 는 `levels=[{},{},{}]`
- `scripts/hwpx_gen.py:147-160` — `lvl = min(level, 2)` 로 **3수준 상한**

## 3. 구현 상세

### 3.1 신규: `src/lib/list-style.ts` (마커 카탈로그 + 프로필)

`report-theme.ts` / `heading-numbering.ts` 와 대칭 구조.

```typescript
export type OrderedMarkerId =
  | "decimal" | "decimalParen" | "paren" | "circled"
  | "hangulSyllable" | "hangulParen" | "hangulConsonant"
  | "upperAlpha" | "lowerAlpha" | "upperRoman" | "lowerRoman" | "hanja"

export type BulletMarkerId =
  | "disc" | "circle" | "square" | "hollowSquare" | "diamond"
  | "dash" | "middot" | "check" | "star" | "triangle"

export type ListStyleProfile = {
  ordered: OrderedMarkerId[]   // 수준 1~4
  bullet: BulletMarkerId[]     // 수준 1~4
  indent: { step: number; hanging: number }  // pt
}

export const DEFAULT_LIST_STYLE: ListStyleProfile = {
  ordered: ["decimal", "hangulSyllable", "decimalParen", "paren"],
  bullet: ["hollowSquare", "circle", "dash", "middot"],
  indent: { step: 20, hanging: 18 },
}

// 마커 ID → 각 출력 계층 표현
export const ORDERED_MARKERS: Record<OrderedMarkerId, {
  label: string           // 갤러리 미리보기 "가. 나. 다."
  counterStyle: string    // CSS list-style-type 값 (@counter-style 이름 또는 내장)
  docx: { format: string; text: string }   // LevelFormat + "%n." 패턴
  hwpx: { kind: "number"; format: string }
}>

export const BULLET_MARKERS: Record<BulletMarkerId, {
  label: string
  counterStyle: string
  char: string            // DOCX/HWPX 로 전달할 실제 문자
}>

export function listStyleFromMarkdown(md: string): ListStyleProfile
export function listStyleFromHtml(html: string): ListStyleProfile
export function isDefaultListStyle(p: ListStyleProfile): boolean   // 프론트매터 미기록 판단용
export function listStyleVars(p: ListStyleProfile): React.CSSProperties  // CSS 변수 생성
```

`listStyleVars` 출력 예:

```
--ls-o1: md-decimal;  --ls-o2: md-ganada;  --ls-o3: md-decimal-paren;  --ls-o4: md-paren;
--ls-b1: md-hollow-square; ... --ls-step: 20pt; --ls-hanging: 18pt;
```

### 3.2 신규: `src/app/list-style.css`

`layout.tsx` 에서 `report-theme.css` 와 동일하게 전역 import.

**(a) `@counter-style` 정의** — 브라우저 내장 스타일에 의존하지 않고 한글 글리프를 확정한다.

```css
@counter-style md-ganada { system: alphabetic; symbols: "가" "나" "다" "라" "마" "바" "사" "아" "자" "차" "카" "타" "파" "하"; suffix: ". "; }
@counter-style md-ganada-paren { system: alphabetic; symbols: "가" "나" … "하"; suffix: ") "; }
@counter-style md-chosung { system: alphabetic; symbols: "ㄱ" "ㄴ" "ㄷ" "ㄹ" "ㅁ" "ㅂ" "ㅅ" "ㅇ" "ㅈ" "ㅊ" "ㅋ" "ㅌ" "ㅍ" "ㅎ"; suffix: ". "; }
@counter-style md-circled { system: fixed; symbols: "①" … "⑳"; suffix: " "; fallback: md-paren; }
@counter-style md-decimal-paren { system: extends decimal; suffix: ") "; }
@counter-style md-paren { system: extends decimal; prefix: "("; suffix: ") "; }
@counter-style md-hanja { system: extends cjk-ideographic; suffix: ". "; }
@counter-style md-hollow-square { system: cyclic; symbols: "□"; suffix: " "; }
/* ○ ■ ◆ – · ✓ ※ ▶ 동일 패턴 */
```

**(b) 수준별 적용** — 표면 3종(편집/인쇄/PDF)에 동일 적용.

```css
:is(.a4-canvas .ProseMirror, .print-pages, .pdf-preview-sheet).list-styled {
  ol { list-style-type: var(--ls-o1); }
  ol ol { list-style-type: var(--ls-o2); }
  ol ol ol { list-style-type: var(--ls-o3); }
  ol ol ol ol { list-style-type: var(--ls-o4); }
  /* 5수준 이상은 4수준 상속(별도 규칙 없음) */
  ul { list-style-type: var(--ls-b1); }   /* ul ul, ul ul ul … 동일 */

  :is(ul, ol) { padding-left: calc(var(--ls-step) + var(--ls-hanging)); }
  li { text-indent: 0; }
}
```

**(c) 목록별 오버라이드** — 마커 ID마다 정적 규칙 1줄(총 22줄).

```css
ol[data-marker="circled"] { list-style-type: md-circled; }
ul[data-marker="hollowSquare"] { list-style-type: md-hollow-square; }
/* … */
```

**(d) 테마 충돌 해소 (O-1)** — `report-theme.css:90-127` 의 `ul { list-style: none } / li::before` 규칙에 `:not(.list-styled)` 를 추가해, 프로필이 적용된 문서에서는 테마의 고정 마커가 비활성화되도록 한다. 프로필 미지정 문서는 기존 표시(`□`/`○`)를 그대로 유지한다.

### 3.3 신규: `src/components/editor/extensions/list-attrs.ts`

`orderedList` / `bulletList` 확장 + 명령 추가.

```typescript
export const OrderedListAttrs = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      marker: { default: null, parseHTML: el => el.getAttribute("data-marker") },
    }
  },
  renderHTML({ node, HTMLAttributes }) { /* marker 있을 때만 data-marker 출력 */ },
})
// BulletListAttrs 동일

// 명령
setListMarker(markerId: string | null)   // 커서 위치 목록의 marker 속성 갱신
restartNumbering()                        // start = 1
setListStart(n: number)                   // start = n
continuePreviousNumbering()               // 문서 앞쪽 동일 타입·동일 깊이 목록 항목 수 합산 → start
```

`continuePreviousNumbering` 은 `list-continue.ts` 의 문서 순회 방식(doc.child 반복)을 재사용해 커서 앞쪽에서 가장 가까운 `orderedList` 를 찾고 `start + itemCount` 를 계산한다.

**주의**: `CustomTableCell` / `CustomHeading` 과 동일하게 `mergeAttributes` 로 기존 속성을 보존하고, 속성이 `null` 이면 `data-marker` 를 출력하지 않아야 한다(불필요한 왕복 노이즈 방지).

### 3.4 `src/components/editor/tiptap-editor.tsx` 수정

1. StarterKit 에서 `bulletList: false, orderedList: false` 로 끄고 `OrderedListAttrs`, `BulletListAttrs` 등록 (`heading: false` + `CustomHeading` 과 동일 패턴).
2. Props 에 `listStyle?: ListStyleProfile` 추가.
3. 표면 요소에 `list-styled` 클래스(`themeClass`/`numberingClass` 와 나란히) + `listStyleVars(listStyle)` 를 인라인 CSS 변수로 주입.
4. 인쇄/PDF 표면(`.print-pages`, `.pdf-preview-sheet`)을 만드는 경로에도 동일 클래스·변수를 전달한다 — 화면·인쇄·PDF 단일 코어 원칙(`page-flow-core.ts`) 준수.

### 3.5 `src/components/editor/editor-toolbar.tsx` 수정

- 목록 그룹을 분할 버튼으로 재구성. 버튼 본체는 **기존 `continueList(...) || toggle...` 호출을 그대로 유지**(회귀 방지), 화살표는 `DropdownMenu`.
- 드롭다운 구성: 마커 갤러리 그리드 → 구분선 → 번호 제어 3항목(ordered만) → 구분선 → "목록 서식…".
- "수준 내리기 / 수준 올리기" `ToolButton` 2개 추가 (`sinkListItem("listItem")` / `liftListItem("listItem")`).
- "목록 서식…" 패널: 수준 1~4 마커 `Select` 8개 + `step`/`hanging` 숫자 입력 + 미리보기. Props 로 `listStyle`, `onListStyleChange` 수신.

### 3.6 `src/lib/markdown.ts` 수정

**(a) turndown — 오버라이드 목록 → 디렉티브 주석**

```typescript
turndown.addRule("listDirective", {
  filter: (node) => (node.nodeName === "OL" || node.nodeName === "UL") && node.hasAttribute("data-marker"),
  replacement: (content, node) => {
    const marker = node.getAttribute("data-marker")
    const start = node.getAttribute("start")
    const attrs = [`marker=${marker}`, start && start !== "1" ? `start=${start}` : ""].filter(Boolean).join(" ")
    return `\n<!-- list: ${attrs} -->\n${content}`
  },
})
```

- 목록 항목 본문은 turndown 기본 규칙이 처리하므로 **표준 마크다운을 유지**한다(FR-6, NFR-1).
- `data-marker` 가 없으면 이 규칙이 걸리지 않아 기존 출력과 동일 → 기존 문서 diff 0 (요구 8.2).

**(b) marked 후처리 — 디렉티브 → 속성 복원**

`mdToHtml` 결과에서 `<!-- list: … -->` 주석 바로 뒤의 `<ol>`/`<ul>` 여는 태그에 `data-marker`/`start` 를 부여하고 주석은 제거한다. `pagebreak` 확장처럼 marked 확장으로 처리해도 되지만, 주석과 다음 블록의 결합이라 **HTML 후처리가 단순하고 안전**하다.

### 3.7 `src/components/tab/doc-tab-content.tsx` 수정

`reportTheme` / `headingNumbering` 과 완전히 동일한 패턴으로 추가.

- `const [listStyle, setListStyle] = useState(() => listStyleFromHtml(tab.content || ""))`
- 파일 로드 시 `setListStyle(listStyleFromMarkdown(md))`
- `handleListStyleChange`: state 갱신 + 프론트매터 갱신 + `updateTabContent(tab.id, injectFrontmatter(content, next))` + dirty 표시
- **기본값이면 `delete next.listStyle`** (요구 5.3)
- `TiptapEditor` / `EditorToolbar` 로 전달

### 3.8 `src/lib/docx-export.ts` 수정

- `listToParagraphs` 가 리스트의 `marker` 오버라이드와 프로필을 함께 받도록 시그니처 확장.
- `numbering.config` 를 **프로필로부터 동적 생성**: 수준 0~3 각각 `ORDERED_MARKERS[id].docx` 의 `format`/`text` 사용, 들여쓰기는 `indent.step`/`hanging` 을 트윕으로 환산(1pt = 20twip).
- 오버라이드가 있는 목록은 별도 `reference` 를 추가 생성(`ordered-circled` 등)해 참조.
- 글머리표는 `LevelFormat.BULLET` + `BULLET_MARKERS[id].char`.
- 기존 `reportBullet` 참조는 **프로필 미지정 문서용 폴백**으로 유지(회귀 방지).

### 3.9 `src/lib/hwpx-plan.ts` + `scripts/hwpx_gen.py` 수정

- 블록 타입에 마커 정보 추가: `{ type: "bullet" | "ordered"; level; marker: string; items: string[] }`
- 계획(JSON)에 `listStyle` 프로필을 함께 실어 보낸다.
- `hwpx_gen.py`:
  - `ensure_numbering(kind="bullet", levels=[{"char": …} × 4])` — 프로필 문자로 생성, **3수준 → 4수준 확대**
  - `min(level, 2)` → `min(level, 3)`
  - 문단 번호는 `ensure_numbering(kind="number", …)` 에 서식 옵션 전달 시도. **미지원 시(O-2) 폴백**: 번호 문자열을 항목 텍스트 앞에 직접 붙여 렌더한다(현재도 task list 를 `☐`/`☑` 문자로 처리하는 선례가 있음 — `hwpx-plan.ts:111`).

## 4. 구현 순서

| 순서 | 작업 내용 | 의존 |
|------|-----------|------|
| 1 | `src/lib/list-style.ts` 신규 — 타입·카탈로그·기본 프로필·프론트매터 파서·CSS 변수 생성 | - |
| 2 | `src/app/list-style.css` 신규 + `layout.tsx` import — `@counter-style` 정의, 수준별 규칙, 오버라이드 규칙 | 1 |
| 3 | `report-theme.css` 목록 규칙에 `:not(.list-styled)` 추가 (테마 충돌 해소) | 2 |
| 4 | `extensions/list-attrs.ts` 신규 — `marker` 속성 + 4개 명령 | 1 |
| 5 | `tiptap-editor.tsx` — 확장 교체, `listStyle` prop, 표면에 클래스·CSS 변수 주입 | 2, 4 |
| 6 | `doc-tab-content.tsx` — state·프론트매터 왕복·핸들러 | 1, 5 |
| 7 | `editor-toolbar.tsx` — 분할 버튼·마커 갤러리·번호 제어·수준 버튼·"목록 서식…" 패널 | 4, 6 |
| 8 | `markdown.ts` — turndown 디렉티브 규칙 + mdToHtml 후처리 | 4 |
| 9 | `docx-export.ts` — 프로필 기반 넘버링 동적 생성 | 1 |
| 10 | `hwpx-plan.ts` + `scripts/hwpx_gen.py` — 마커 전달, 4수준 확대, 폴백 | 1 |
| 11 | `e2e/list-style.spec.ts` 신규 + 기존 `e2e/list-continue.spec.ts` 회귀 확인 | 7, 8 |
| 12 | `tsc --noEmit` + `eslint` + DOCX/HWPX 실제 열기 검증 | 전체 |

**선행 검증(순서 1 이전 권장)**: 서버 `python-hwpx` 의 `ensure_numbering(kind="number")` 가 한글식 번호 서식을 지원하는지 확인한다. 결과에 따라 순서 10의 구현 방식이 갈린다(O-2).

## 5. 영향도 분석

| 파일 | 변경 | 영향 |
|------|------|------|
| `src/lib/list-style.ts` | 신규 | 없음(신규 모듈) |
| `src/app/list-style.css` | 신규 | 전역 CSS. `.list-styled` 스코프 안에서만 동작하므로 미적용 문서에 영향 없음 |
| `src/app/layout.tsx` | import 1줄 | 낮음 |
| `src/app/report-theme.css` | `ul` 규칙에 `:not(.list-styled)` 추가 | **중** — 보고서 테마 문서의 목록 표시. 프로필 미지정 시 기존 동작 유지되는지 반드시 확인(요구 10.2) |
| `src/components/editor/extensions/list-attrs.ts` | 신규 | 없음(신규 모듈) |
| `src/components/editor/tiptap-editor.tsx` | StarterKit 옵션·확장 등록·prop·클래스 주입 | **높음** — 목록 스키마 교체. 기존 문서 파싱 호환 확인 필요 |
| `src/components/editor/editor-toolbar.tsx` | 목록 그룹 재구성 + 버튼 2개 추가 | **중** — 기존 토글 동작(`continueList` 폴백)은 그대로 유지 |
| `src/components/tab/doc-tab-content.tsx` | state 1개·핸들러 1개 추가 | **중** — 프론트매터 왕복. `injectFrontmatter` 누락 시 서식 유실(기존 회귀 이력 있음) |
| `src/lib/markdown.ts` | turndown 규칙 1개 + mdToHtml 후처리 | **높음** — 마크다운 왕복 핵심. 표·이미지·페이지나눔 기존 규칙 회귀 확인 필수 |
| `src/lib/docx-export.ts` | 넘버링 동적 생성 | **중** — `reportBullet` 폴백 유지로 기존 문서 회귀 방지 |
| `src/lib/hwpx-plan.ts` | 블록 타입 확장 | **중** |
| `scripts/hwpx_gen.py` | 넘버링 생성·수준 상한 | **중** — 서버 Python 환경 의존 |
| `src/hooks/use-page-flow.ts`, `src/lib/page-flow-core.ts` | **변경 없음** | 마커를 CSS로만 처리하므로 분할 계산 로직 무영향 |

## 6. 테스트/검증 계획

### 6.1 정적 검증

| # | 항목 | 기대 |
|---|------|------|
| 1 | `npx tsc --noEmit` | 에러 0 |
| 2 | 변경 파일 `eslint` | 신규 에러 0 |

### 6.2 기능 시나리오 (요구사항 원자화 표와 1:1)

| # | 시나리오 | 기대 | 대응 원자 |
|---|----------|------|-----------|
| 1 | 문단 번호 갤러리에서 `가.` 선택 | 마커가 `가. 나. 다.` | 1.1 |
| 2 | 글머리표 갤러리 `□` 선택 | 마커 `□` | 1.2 |
| 3 | 기본 프로필로 4수준 목록 작성(Tab×3) | `1.` `가.` `1)` `(가)` | 2.1~2.3 |
| 4 | 글머리표 4수준 | `□ ○ – ·` | 2.4 |
| 5 | 툴바 수준 버튼 | Tab/Shift+Tab 과 동일 | 3.1 |
| 6 | "1부터 다시 시작" | `start=1` | 4.1 |
| 7 | 문단·표를 사이에 두고 "이어서 계속" | 앞 목록 마지막+1 | 4.2 |
| 8 | 시작 번호 5 지정 → 저장 → 재열람 | `5.` 유지 | 4.3 |
| 9 | "목록 서식…" 에서 2수준을 `①` 로 변경 | 문서 전체 2수준 반영 | 5.1 |
| 10 | 저장 후 `.md` 확인 | `listStyle` 프론트매터 존재 | 5.2 |
| 11 | 프로필 미변경 문서 저장 | `listStyle` 키 없음, diff 0 | 5.3, 8.2 |
| 12 | 특정 목록만 `①` 오버라이드 → 저장 | `<!-- list: marker=circled -->` 1줄, 나머지 목록엔 없음 | 6.1, 6.3 |
| 13 | 오버라이드 문서 왕복 | 서식 유지 | 6.2 |
| 14 | `step` 20→30 변경 | 화면·인쇄 들여쓰기 반영 | 7.1, 7.2 |
| 15 | 탭 전환 후 복귀 | 서식 유지 | 8.1 |
| 16 | DOCX 내보내기 → Word 열기 | `가.`·`①` 마커 일치 | 9.1 |
| 17 | HWPX 내보내기 → 한글 열기 | 글머리표 문자·4수준 일치 | 9.2 |
| 18 | 인쇄 미리보기 / PDF | 편집화면과 동일 | 9.3 |

### 6.3 회귀 검증 (필수)

| # | 항목 | 기대 | 근거 |
|---|------|------|------|
| R-1 | `e2e/list-continue.spec.ts` | 전건 통과 | 인접 리스트 합류 기능 보존 (10.1) |
| R-2 | 보고서 테마 + 프로필 미지정 문서 | `□`/`○` 기존 표시 유지 | 10.2 |
| R-3 | 표·이미지·페이지나눔 왕복 | 회귀 없음 | `markdown.ts` 변경 영향. **에디터 HTML → `htmlToMd` 경로로 검증** (2026-07-22 표 실종 회귀 이력) |
| R-4 | `e2e/page-flow.spec.ts`, `pagination-stability.spec.ts` | 통과 | 페이지 분할 무영향 확인 |
| R-5 | 기존 `md_docs/` 실문서 열기→저장 | `.md` diff 0 | 하위 호환 |

## 7. 리스크 및 제약

| # | 리스크 | 영향 | 대응 |
|---|--------|------|------|
| K-1 | `python-hwpx` 가 한글식 번호 서식을 지원하지 않을 수 있음 (O-2) | HWPX 문단 번호 서식 미반영 | 구현 착수 전 실측. 미지원 시 번호를 텍스트로 직접 렌더(글머리표는 `char` 지정이 되므로 영향 없음) |
| K-2 | `markdown.ts` 변경이 표·이미지 왕복을 깨뜨릴 위험 | 내보내기에서 표 실종 등 치명적 회귀(선례 있음) | 신규 turndown 규칙의 filter 를 `data-marker` 보유 목록으로 좁게 한정. R-3 검증 필수 |
| K-3 | StarterKit 목록 확장 교체 시 기존 문서 파싱 호환성 | 기존 문서 목록 깨짐 | `parseHTML` 을 부모 확장에서 상속하고 속성만 추가. 실문서로 R-5 검증 |
| K-4 | `report-theme.css` 의 `::before` 마커와 `list-style-type` 이중 표시 | 마커 2개 표시 | 순서 3에서 `:not(.list-styled)` 로 상호 배타 처리 후 R-2 검증 |
| K-5 | `@counter-style` 브라우저 지원 | 구형 브라우저에서 마커 미표시 | Chromium 91+ 지원. 각 `@counter-style` 에 `fallback` 지정 |
| K-6 | 프론트매터 `listStyle` 이 중첩 객체라 기존 단순 키(boolean/string) 대비 파싱 실패 여지 | 서식 유실 | `listStyleFromX` 에서 값 검증 후 잘못된 값은 기본값으로 대체(기존 `normalize` 패턴 준용) |
| K-7 | 5수준 이상 목록 | 4수준 서식 반복 | PRD 명시 제약. 한글 7수준·워드 9수준 대비 축소이며 2차 확대 대상 |

### 제약 (1차 범위 밖 — PRD FR-10~13)

- 계층 결합 번호(`1.1.1`), 사용자 정의 번호 서식(`제 %1 장`), 개요(제목) 번호 연동, 마커 글자 모양(색·굵기) 개별 지정
- Task list 는 체크박스 표시 유지(수준별 마커 미적용)
