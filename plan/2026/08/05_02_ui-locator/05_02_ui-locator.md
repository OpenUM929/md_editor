# 계획서 — ui-locator (UI 좌표·명칭 공유 도구)

> 상태: Todo | 작성일: 2026-08-05
> 작업 유형: B (기능 개선/신규 기능)
> 선행: 없음

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-08-05 | 생성 | 초기 계획서 작성 |

---

## 1. 배경 및 목적

개발 과정에서 사용자와 AI 에이전트가 대화로 특정 UI 요소를 지목할 때 "저 버튼", "왼쪽 위 메뉴" 등 모호한 표현이 빈번하다. 화면에서 마우스가 일정 시간 정지하면 해당 지점의 **레이아웃 명칭 계층**을 마우스 포인터 옆에 표시하고, **백틱(`)** 키로 그 정보(레이아웃 경로 + 구현 파일 + 버튼 명칭)를 클립보드에 복사해 대화에 바로 붙여넣을 수 있게 하여, 사용자-에이전트 간 UI 좌표를 정확히 일치시키는 것을 목적으로 한다.

## 2. 요구사항

1. 마우스가 일정 시간(기본 700ms) 정지하면 마우스 포인터 옆에 해당 지점의 레이아웃 명칭 툴팁 표시
2. 버튼 위에서는 `현재레이아웃명칭 - 내부레이아웃명칭 - 버튼명칭` 형식으로 표시
3. 백틱(`) 키를 누르면 해당 정보를 클립보드로 복사 → 대화에 붙여넣어 사용자-에이전트 답변
4. 복사 내용에 해당 UI의 **기능 구현 정보**(구현 파일 경로/컴포넌트) 포함
5. **개발 모드에서만** 활성 (`NODE_ENV === "development"`)
6. **토글 단축키**(`Ctrl+Shift+L`)로 켜고 끔
7. 추가 의존성 없이 클립보드·DOM API만 사용

## 3. 현재 시스템 분석 (코드 실측 확인 완료)

### 3.1 루트 마운트 지점
- `src/app/layout.tsx` — `ThemeProvider` > `TooltipProvider`(`src/components/ui/tooltip.tsx`) > `{children}` + `Toaster`. 그 아래 `DevSWCleanup`(`src/components/dev-sw-cleanup.tsx`)이 **dev 전용 컴포넌트 마운트의 전례**: `useEffect`에서 `if (process.env.NODE_ENV !== "development") return` (line 7). 이 패턴을 그대로 답습함.

### 3.2 버튼 명칭 소스 (자동 추출 가능)
- `src/components/editor/editor-toolbar.tsx:96` — `ToolButton`이 `aria-label={label}` + `title={label}` 을 갖는 Shadcn `Button`. 즉 버튼은 `aria-label || title || textContent` 로 명칭 추출 가능.
- `src/components/tab/tab-bar.tsx:72` — 닫기 버튼 `title="닫기"`. `role="button"`(line 43) 활용.

### 3.3 레이아웃 컨테이너 (마커 부여 대상 존재)
- `(markdown)/layout.tsx` — `aside`(사이드바, line 293), `main`(워크스페이스, line 302). `SidebarInner` 내부에 Files/Templates 탭.
- `tab-bar.tsx`, `editor-toolbar.tsx`, `file-tree.tsx`, `template-tab.tsx` 등 루트 컨테이너 존재.
- **명칭 자동 추론은 불가** (`aria-label`은 버튼 한정) → 명시적 `data-layout` 마커가 필요. 이는 §4에서 확정함.

### 3.4 프로덕션 보호
- `next.config.ts` — `NODE_ENV ==="production"`에서만 `withSerwist`. dev 설정 불변.
- 클립보드는 `navigator.clipboard`(secure context) — dev `http://10.10.102.223` 에서는 `localhost`가 아니어도 동작하나, 실패 시 `document.execCommand("copy")` 또는 fallback 텍스트 영역 방식으로 처리.

---

## 4. 구현/수정 상세

> **확정 결정**: ① 개발 전용 ② `data-layout` 마커 수동 부여 ③ 토글 단축키 `Ctrl+Shift+L`.

### 4.1 레이아웃 마커 규약
각 컨테이너 루트에 두 속성을 부여한다.
- `data-layout="<한국어 명칭>"` — 표시용 레이아웃 이름 (예: `"사이드바"`, `"파일 트리"`, `"탭 바"`, `"에디터 툴바"`)
- `data-ui-file="<상대경로>"` — 구현 파일 경로 (복사 정보에 포함)

부여 대상과 값 (실측 컨테이너):
| 파일 | 마커 |
|------|------|
| `src/app/(markdown)/layout.tsx` `aside` | `data-layout="사이드바"`, `data-ui-file="src/app/(markdown)/layout.tsx"` |
| `src/app/(markdown)/layout.tsx` `main` | `data-layout="워크스페이스"`, `data-ui-file="src/app/(markdown)/layout.tsx"` |
| `src/components/tab/tab-bar.tsx` 루트 div | `data-layout="탭 바"`, `data-ui-file="src/components/tab/tab-bar.tsx"` |
| `src/components/editor/editor-toolbar.tsx` 루트 div | `data-layout="에디터 툴바"`, `data-ui-file="src/components/editor/editor-toolbar.tsx"` |
| `src/components/file-tree/file-tree.tsx` 루트 | `data-layout="파일 트리"`, `data-ui-file="src/components/file-tree/file-tree.tsx"` |
| `src/components/template/template-tab.tsx` 루트 | `data-layout="템플릿 탭"`, `data-ui-file="src/components/template/template-tab.tsx"` |

> `main`/`aside`의 레이어(`(markdown)`) 구분은 하위 컨테이너 마커가 있으면 `사이드바 > 파일 트리`처럼 자연스럽게 내부로 드러난다. 중복은 피하고 최상위 컨테이너에만 부여한다.

### 4.2 검색 로직 (`src/lib/ui-locator-registry.ts`)
```ts
export const UI_HOVER_DELAY_MS = 700
export function locateAt(x: number, y: number):
  { path: string; button: string | null; file: string | null } {
  const el = document.elementFromPoint(x, y)
  if (!el) return { path: "", button: null, file: null }
  const layouts: string[] = []
  let file: string | null = null
  let cur: Element | null = el
  while (cur) {
    const l = cur.getAttribute?.("data-layout")
    if (l && !layouts.includes(l)) layouts.unshift(l)   // 외부→내부 순
    if (!file) file = cur.getAttribute?.("data-ui-file") ?? null
    cur = cur.parentElement
  }
  const node = el.closest("button, [role='button'], a")
  const button = node
    ? (node.getAttribute("aria-label") || node.getAttribute("title") || node.textContent?.trim() || null)
    : null
  return { path: layouts.join(" > "), button, file }
}
```

### 4.3 툴팁/복사 컴포넌트 (`src/components/dev/ui-locator.tsx`, `"use client"`)
- 상태: `active`(토글), `pos {x,y}`, `info`, `visible`
- 이벤트:
  - `keydown` 전역 → `Ctrl+Shift+L` 로 `active` 토글 (`preventDefault`). `active` && `key === "`"` 이면 복사 후 `active=false`.
  - `active` 중 `mousemove` → `{x,y}` 갱신 + 700ms 타이머. 타이머 만료 시 `elementFromPoint` → `locateAt` → `visible=true`.
  - `mouseleave`/`mousemove` 이동 시 `visible=false`, 타이머 리셋.
  - `active=false` 시 리스너 해제, 툴팁 숨김.
- 툴팁 렌더: `createPortal` 또는 루트 내 `position:fixed` div — `left: x+16, top: y+16`. 표시 문자열: `path > [버튼] <button>` 형태. `path`가 빈 문자열이면 "레이아웃 정보 없음" 생략.
- 클립보드: `navigator.clipboard.writeText` 성공 시 `toast("복사됨: <path…>")`, 실패 시 fallback(보이지 않는 `textarea` + `execCommand('copy')`).
- 복사 포맷:
  ```
  [UI 좌표] <path> > [버튼] <button>
  [구현]   <file>
  ```
  (`file` 없으면 `[구현]   (안내 없음)`)

### 4.4 마운트 (`src/app/layout.tsx`)
- `<dev-sw-cleanup>` 하단에 `<UiLocator />` 추가. 컴포넌트 내부에서 `NODE_ENV !== "development"`면 즉시 `null` (DevSWCleanup 패턴).

---

## 5. 영향도 분석

| 파일 | 유형 | 영향 |
|------|------|------|
| `src/components/dev/ui-locator.tsx` | 신규 | 정지 감지/툴팁/클립보드/토글 |
| `src/lib/ui-locator-registry.ts` | 신규 | 검색 로직 + 딜레이 상수 |
| `src/app/layout.tsx` | 수정 | `<UiLocator />` 마운트(dev 가드) |
| `src/app/(markdown)/layout.tsx` | 수정 | `aside`/`main`에 `data-layout`/`data-ui-file` 마커 |
| `src/components/tab/tab-bar.tsx` | 수정 | 루트 div에 마커 |
| `src/components/editor/editor-toolbar.tsx` | 수정 | 루트 div에 마커 |
| `src/components/file-tree/file-tree.tsx` | 수정 | 루트에 마커 |
| `src/components/template/template-tab.tsx` | 수정 | 루트에 마커 |

- **무변경 보장**: `next.config.ts`, `package.json`(의존성), 에디터 직렬화/저장 로직, `/api` 경로
- dev 전용이므로 프로덕션 번들·동작에 **영향 없음** (빌드 시 트리셰이크/가드로 미포함)
- 기존 `DevSWCleanup`/`TooltipProvider`와 무관하게 독립 동작

---

## 6. 테스트/검증 계획

1. `npm run lint` + `npx tsc --noEmit` 통과
2. dev(`npm run dev`)에서 `Ctrl+Shift+L` → 활성 확인(작은 배지 or 첫 hover 툴팁)
3. 버튼 위 정지 700ms → 툴팁 `사이드바 > … > [버튼] <명칭>` 표시
4. 백틱(`) → 클립보드에 `[UI 좌표] …/[구현] …` 붙여넣기 확인
5. `Ctrl+Shift+L` 재토글 → 비활성으로 툴팁·복사 동작 중지
6. 마커 미부여 영역(본문 등) 정지 → 빈 path는 버튼이 있어도 레이아웃 문자열 숨김 동작 확인
7. `npm run build`(prod) → `UiLocator` 미포함(소스 가드) 확인

---

## 7. 리스크 및 제약

- **레이아웃 명칭 부정확**: 자동 추론이 아니라 수동 마커 기반이라, 마커를 붙이지 않은 컨테이너는 빈 경로로 표시 → 명시적 규약(§4.1) 문서화로 완화
- **정지 감지의 오탐**: 빠른 마우스 이동/스크롤 시 툴팁 잔상 → 이동 시 즉시 숨김 처리로 방지
- **클립보드 권한**: `navigator.clipboard` 거부 시 `execCommand('copy')` fallback
- **dev 전용 기능**: 프로덕션에서 미동작 의도적(요구사항 5번 확정)
- **관련 없는 마커 중복**: `data-layout` 값 중복 방지를 위해 부여 표(§4.1)를 단일 진실원으로 유지

---

## 8. 구현 순서

| 순서 | 작업 내용 | 의존 |
|------|-----------|------|
| 1 | 마커 부여: `(markdown)/layout.tsx`, `tab-bar.tsx`, `editor-toolbar.tsx`, `file-tree.tsx`, `template-tab.tsx` | — |
| 2 | `ui-locator-registry.ts` 검색 로직 | — |
| 3 | `dev/ui-locator.tsx` 컴포넌트(툴팁/복사/토글) | 2 |
| 4 | `app/layout.tsx` 마운트 | 3 |
| 5 | 검증(lint/tsc/dev 손테스트/prod 미포함) | 1-4 |