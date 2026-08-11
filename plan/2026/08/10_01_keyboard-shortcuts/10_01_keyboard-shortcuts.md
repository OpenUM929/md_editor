# 계획서 — 에디터 키보드 단축키 개선 (Page Break Ctrl+Enter + Alt 키팁)

> 상태: Done | 작성일: 2026-08-10
> 작업 유형: B (기능 개선/신규 기능)
> 선행: 없음

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | Page Break를 키보드로 삽입할 수 있는가? — 어떤 키인가? | Ctrl+Enter (Word 방식) | |
| 1.2 | Alt 키를 누르면 툴바 버튼들 위에 단축키 배지(키팁)가 나타나는가? | 예 — 전체 ToolButton 대상 | |
| 1.3 | 키팁이 보이는 상태에서 해당 키를 누르면 그 버튼 명령이 실행되는가? | 예 | |
| 1.4 | 키팁은 Alt를 떼면 사라지는가? | 예 — keyup 시 비활성 | |
| 1.5 | 트리거·배지가 Windows Edge/Chrome에서 브라우저 메뉴 포커스를 유발하지 않는가? | 예 — Alt 단독 keydown preventDefault | |
| 1.6 | 탭이 여러 개일 때 한 툴바의 키팁이 다른 탭 툴바에 간섭하지 않는가? | 예 — 루트 ref 범위 querySelector | |
| 1.7 | 현재 단축키(Ctrl+S, Ctrl+K, Ctrl+Shift+I, Ctrl+/)가 함께 동작하는가? | 예 — 새 단축키와 충돌 없음 | |

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-08-10 | 생성 | 초기 계획서 작성 |

---

## 1. 배경 및 목적

현재 Page Break는 `/` 슬래시 커맨드(`src/components/editor/slash-command-popup.tsx:57`)와 툴바 버튼(`src/components/editor/editor-toolbar.tsx:655`)으로만 삽입할 수 있고, 키보드 단축키가 없어 문서 작업 흐름이 끊긴다. Word/한글 사용자가 익숙한 **Ctrl+Enter(Page Break)** 단축키를 추가하고, 오피스의 **Alt 키팁**(키보드만으로 툴바 전체를 조작하는 접근성 규격)을 구현하여 마우스 없이 서식을 일괄 조작할 수 있게 한다.

## 2. 요구사항

1. Page Break 노드에 `Mod-Enter` 단축키 추가 (Windows에서는 Ctrl+Enter, Mac은 Cmd+Enter로 매핑)
2. 툴바의 모든 `ToolButton`에 키팁(단축키 배지) 부여
3. `Alt` 단독 press → 키팁 배지 일괄 표시
4. 키팁 표시 상태에서 해당 키 press → 해당 툴바 동작 실행 후 키팁 닫힘
5. `Alt` release(또는 다른 키) → 키팁 닫힘
6. Windows Edge/Chrome에서 Alt 단독 press 시 브라우저 메뉴 포커스 방지(`preventDefault`)
7. Select/Dropdown 트리거(제목·폰트 크기·여백·테마)는 ToolButton이 아니므로 키팁 제외 (1차 범위)

## 3. 현재 시스템 분석 (코드 실측 확인 완료)

### 3.1 Page Break 삽입 경로 (단축키 없음)
- `src/components/editor/extensions/page-break.ts` — `PageBreak = Node.create({...})`, **`addKeyboardShortcuts` 없음**. `group: "block"`, `atom: true`, `selectable: false`.
- 삽입 명령 (2곳 동일): `editor.chain().focus().insertContent({ type: "pageBreak", attrs: { auto: false } }).run()`
  - `editor-toolbar.tsx:655` (툴바 버튼)
  - `slash-command-popup.tsx:57` (슬래시 커맨드)

### 3.2 기존 키보드 핸들러 (충돌 검토 대상)
- `src/components/editor/tiptap-editor.tsx` — `handleKeyDown` (246~320행):
  - `Ctrl+S`(저장), `Ctrl+Shift+I`(이미지 삽입), `Ctrl+K`(링크), `Ctrl+/`(슬래시 오픈), `/` 단독(슬래시)
  - **Ctrl+Enter 매핑 없음** → 충돌 없음 확정
- Tiptap `Mod` 규약: `event.metaKey || event.ctrlKey` → Windows/Linux Ctrl, Mac Cmd

### 3.3 툴바 버튼 구조
- `src/components/editor/editor-toolbar.tsx` — `ToolButton`(forwardRef, 81~100행): Shadcn `Button`에 `aria-label={label}`, `title={label}` 부여. `data-*` 속성은 `{...rest}`로 전달 가능.
- `EditorToolbar` 루트 div(269~274행)에 `data-layout="에디터 툴바"`, `data-ui-file=...` 마커만 있고 키팁용 상태·키 처리 없음.
- `ToolButton` 호출 수: 약 37개 (Undo/Redo/서식/정렬/리스트/삽입/표 작업군/뷰 모드 등)
- `Button`은 `variant`, `size`, `disabled` 외 props를 spread로 수용 (라디우스/데카레이션 등).

### 3.4 키팁 기존 자산
- `src/components/dev/ui-locator.tsx:55` — 전역 `keydown`(Ctrl+Shift+L 토글) 인스턴스 존재하나 키팁과 무관. 키팁 구현은 별도 신규.
- 단축키 표기 라이브러리/접근성 컴포넌트 없음. 순수 DOM/React로 구현 (추가 의존성 없음).

## 4. 구현 상세

### 4.1 Page Break 단축키 (`src/components/editor/extensions/page-break.ts`)
```ts
// PageBreak Node.create({...}) 내부에 추가
addKeyboardShortcuts() {
  return {
    "Mod-Enter": () =>
      this.editor.chain().focus().insertContent({ type: "pageBreak", attrs: { auto: false } }).run(),
  }
}
```
- 반환 `true`(처리됨) — 반환 불명 시 Tiptap이 다음 핸들러로 이벤트를 계속 흘려보낼 수 있음
- 기존 `handleKeyDown`(tiptap-editor.tsx)과 키 겹침 없음(§3.2)

### 4.2 ToolButton 키팁 지원 (`src/components/editor/editor-toolbar.tsx`)
- `ToolButton`에 `keytip?: string` prop 추가:
  ```tsx
  <Button ref={ref} data-keytip={keytip} aria-label={label} title={label} ...>
  ```
- 호출부에 `keytip="P"` 방식으로 부여
- 배지 렌더: `ToolButton` 내부에서 `keytipsActive`(상태)일 때 우상단에 키 문자 배지 표시. 키팁 활성 상태는 EditorToolbar에서 Context 또는 prop으로 전달.
- 구조: 버튼 루트를 `relative`로 감싸고 키팁 span `<kbd>`를 `absolute top-0 right-0`에 배치

### 4.3 Alt 키팁 상태·리스너 (EditorToolbar)
- 상태: `const [keytipsActive, setKeytipsActive] = useState(false)`
- 루트 ref: `const toolbarRef = useRef<HTMLDivElement>(null)` → 루트 div에 부착
- `useEffect`로 window `keydown`/`keyup` 등록:
  - `keydown`:
    - `event.key === "Alt"` 단독(`altKey && !ctrlKey && !shiftKey && !metaKey`) → `preventDefault()` + `setKeytipsActive(true)`
    - `keytipsActive`로 참조하는 상태와 조합 시, 영숫자(`/^[a-zA-Z0-9]$/`) 단일 키 → `toolbarRef.current?.querySelector('[data-keytip="'+key.toUpperCase()+'"]')` → `(el as HTMLButtonElement).click()` + `setKeytipsActive(false)`
    - 다른 일반 키 → `setKeytipsActive(false)`
  - `keyup`:
    - `event.key === "Alt"` → `setKeytipsActive(false)`
- 인스턴스 충돌 방지: querySelector 범위를 `toolbarRef.current`(각 툴바 루트)로 한정 → 탭 다중 인스턴스가 자기 것만 조작
- 리스너 클린업: `removeEventListener`

### 4.4 키 배정 (전체 ToolButton, 고유)
> 라벨 메모닉 우선, 중복 시 대체. 표 작업군은 숫자 포함 풀에서 고유 배정.

| 버튼 | 키 | 근거 |
|------|----|------|
| Undo | Z | Ctrl+Z 메모닉 |
| Redo | Y | Ctrl+Y 메모닉 |
| Bold | B | |
| Italic | I | |
| Underline | U | Ctrl+U 메모닉 |
| Strikethrough | S | |
| 번호 매기기 | N | Numbering |
| 왼쪽 정렬 | L | Left |
| 가운데 정렬 | C | Center |
| 오른쪽 정렬 | R | Right |
| 양쪽 정렬 | J | Justify |
| Bullet List | 1 | |
| Ordered List | 2 | |
| Task List | 3 | |
| Blockquote | Q | Quote |
| Code Block | K | Code |
| Insert Link | G | 링크(Link는 L 중복 → G) |
| Insert Image | E | Image |
| Insert Table | T | Table |
| Horizontal Rule | M | (구분선) |
| Page Break | P | |
| 행 위 추가 | ↑ | 표 작업군 → 숫자 풀 |
| 행 아래 추가 | ↓ | 표 작업군 → 숫자 풀 |
| 열 앞 추가 | ← | 표 작업군 → 숫자 풀 |
| 열 뒤 추가 | → | 표 작업군 → 숫자 풀 |
| 셀 병합 | 5 | 표 작업군 |
| 셀 분할 | 6 | 표 작업군 |
| 행 삭제 | 7 | 표 작업군 |
| 열 삭제 | 8 | 표 작업군 |
| 표 삭제 | 9 | 표 작업군 |
| 셀 배경색 | 0 | 표 작업군 |
| Fullscreen | F | |
| Wide | W | |
| 일체(A4 연속) | E | (충돌: Insert Image와 중복 → 대체) |
| 분리(A4 페이지 구분) | D | |
| Horizontal Rule(표) | M | |

> 최종 키는 구현 시 중복 검증 후 결정. 충돌 항목(Image=E vs 일체=E)은 대체 키로 조정하고 §키 배정 표를 갱신한다.

## 5. 영향도 분석

| 파일 | 유형 | 영향 |
|------|------|------|
| `src/components/editor/extensions/page-break.ts` | 수정 | `addKeyboardShortcuts` 추가 — 동작 변경 없음, Ctrl+Enter만 신규 |
| `src/components/editor/editor-toolbar.tsx` | 수정 | ToolButton props + 키팁 배지 + Alt 키팁 상태/리스너 + keytip 배정 |

- **무변경 보장**: `slash-command-popup.tsx`, `tiptap-editor.tsx`(핸들러 구조), 저장 로직, 직렬화, `next.config.ts`, `package.json`(추가 의존성 없음)
- 추가 의존성: 없음 (순수 React/DOM)
- 타 사용처(`editor-page.tsx` / `doc-tab-content.tsx`)는 `EditorToolbar`를 그대로 쓰므로 자동 적용, 별도 수정 불필요
- 페이지 나눔 동작·인쇄/PDF·마크다운 직렬화에 영향 없음 (단위키 추가만)

## 6. 테스트/검증 계획

1. `npm run lint` + `npx tsc --noEmit` 통과
2. 커서 위치에서 `Ctrl+Enter` → manual Page Break 삽입 확인 (§4.1)
3. 기존 단축키 동작 유지: `Ctrl+S` 저장, `Ctrl+K` 링크, `Ctrl+Shift+I` 이미지, `Ctrl+/`·`/` 슬래시
4. `Alt` 단독 → 툴바 전체 버튼에 키팁 배지 표시 (`data-keytip` 존재 + 시각 배지)
5. 키팁 표시 중 `P` → Page Break 삽입 + 키팁 닫힘
6. `Alt` release → 키팁 닫힘
7. Edge + Chrome 각각에서 브라우저 메뉴 포커스가 뜨지 않는지 확인
8. 탭 2개 열고 각각 키팁 실행 → 다른 탭 버튼 간섭 없는지 확인

## 7. 리스크 및 제약

- **Alt 단독 press가 브라우저 메뉴 포커스를 유발**(특히 Firefox/일부 환경): Edge/Chrome에서는 `preventDefault()`로 차단 가능(요구 확인완료). Firefox는 완전 차단이 어려울 수 있음 — 대상은 Edge/Chrome이므로 허용.
- **키 중복**: 버튼 수(~37) > 영숫자(36)에 근접. 표 작업군은 평소 비활성일 때가 많아 충돌 시 대체 키 사용. 중복은 구현 시 검증.
- **키팁 표시 중 일반 타이핑 입력 차단**: 키팁 활성 시 영숫자 키를 버튼 실행에 쓰므로, 이 상태에서는 편집 입력이 중단됨 — Alt를 누른 채로 입력하던 습관 사용자에게 주의 필요 (Word와 동일한 동작이라 수용).
- **`disabled` 버튼**: `click()`은 disabled 버튼에서 no-op이므로 안전. 필요 시 disabled 버튼은 배지 숨김 처리 선택.

## 8. 구현 순서

| 순서 | 작업 내용 | 의존 |
|------|-----------|------|
| 1 | PageBreak 확장에 Ctrl+Enter 단축키 추가 (`extensions/page-break.ts`) | — |
| 2 | ToolButton에 keytip prop + `data-keytip` 부여 (`editor-toolbar.tsx`) | — |
| 3 | Alt 키팁 상태·keydown/keyup 리스너 구현 (`editor-toolbar.tsx`) | 2 |
| 4 | 키팁 배지 렌더 + 전체 ToolButton 키 배정 (`editor-toolbar.tsx`) | 3 |
| 5 | 검증: lint/tsc + dev 수동 확인 (단축키·키팁·탭 간섭) | 1-4 |

> 담당: 이 작업은 프론트엔드 UI 단일 도메인 복합 기능으로, 작업 1~4까지 순차 구현 후 작업 5에서 일괄 검증한다.