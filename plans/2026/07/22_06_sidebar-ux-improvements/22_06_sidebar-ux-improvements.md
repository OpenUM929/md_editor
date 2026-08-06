# 계획서 ? 사이드바/에디터 UX 개선 4건

> 상태: Todo | 작성일: 2026-07-22
> 작업 유형: B (기능 개선)
> 선행: 없음

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-22 | 최초 작성 | 리사이즈 핸들, 툴팁, 탭 전환, 탭 툴팁 4건 |

---

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | 왼쪽 사이드바와 본문 사이의 구분선을 마우스로 드래그하여 사이드바 너비를 조절할 수 있는가? | Y | |
| 1.2 | 드래그로 너비를 줄이거나 늘릴 때 실시간으로 사이드바 크기가 변하는가? | Y | |
| 1.3 | 사이드바 너비에 최소/최대 제한이 있는가? (최소 160px, 최대 500px) | Y | |
| 2.1 | 파일 트리에서 파일/폴더에 마우스를 올리면 툴팁으로 전체 파일명이 표시되는가? | Y | |
| 2.2 | 이름이 잘릴 때(truncate)만 툴팁이 의미 있는가? (아니면 항상 표시) | Y ? 항상 표시 | |
| 3.1 | 이미 탭으로 열려 있는 파일을 파일 트리에서 다시 클릭하면 새 탭이 아닌 기존 탭으로 이동하는가? | Y | |
| 3.2 | 기존 탭으로 전환할 때 파일을 다시 읽지 않는가? (URL 네이게이션 없이 탭만 활성화) | Y | |
| 4.1 | 에디터 탭 바의 탭 이름에 마우스를 올리면 툴팁으로 전체 파일명이 표시되는가? | Y | |

---

## 1. 배경 및 목적

MD Editor의 좌측 사이드바와 에디터 탭 영역에서 사용자 편의성 개선이 필요하다:

1. **사이드바 리사이즈**: 현재 사이드바는 `w-64`(256px) 고정 너비다. 파일 경로가 길거나 에디터 영역이 넓어야 할 때 사용자가 직접 조절할 수 없어 불편하다.
2. **파일명 툴팁**: 파일 트리와 탭 바에서 이름이 `truncate`되어 잘리면 전체 파일명을 확인할 수 없다. 마우스 호버 시 툴팁으로 전체 이름을 보여주면 불편함이 해소된다.
3. **탭 중복 방지**: 파일 트리에서 이미 열려 있는 파일을 클릭하면 `router.push`로 URL이 변경되면서 `readMdFile`이 다시 호출된다. 기존 탭이 있으면 탭만 활성화하면 불필요한 I/O를 줄일 수 있다.

## 2. 현재 시스템 분석

- **사이드바 레이아웃**: `src/app/(markdown)/layout.tsx:104`
  ```tsx
  <aside className="hidden w-64 shrink-0 border-r bg-sidebar print:hidden md:flex md:flex-col">
  ```
  - `w-64` 고정, `shrink-0`으로 축소 방지
  - 사이드바 열기/닫기는 `SidebarProvider`(`src/lib/sidebar-context.tsx`)의 `open: boolean`으로만 관리

- **사이드바 컨텍스트**: `src/lib/sidebar-context.tsx`
  - `open: boolean`, `setOpen`만 존재. 너비 상태 없음.

- **파일 트리 노드**: `src/components/file-tree/file-tree-node.tsx:290`
  ```tsx
  <span className="truncate flex-1">{node.name}</span>
  ```
  - `truncate` 적용됨, 툴팁 없음

- **탭 바**: `src/components/tab/tab-bar.tsx:61`
  ```tsx
  <span className="truncate max-w-28">{tab.title}</span>
  ```
  - `truncate max-w-28` 적용됨, 툴팁 없음

- **탭 컨텍스트 ? 중복 탭 검사**: `src/lib/tab-context.tsx:63-88`
  ```typescript
  const openDoc = useCallback((root: string, filePath: string, initialContent?: string): string => {
    const id = genId()
    let resultId = id
    setTabs((prev) => {
      const existing = prev.find(
        (t): t is DocTab => t.type === "doc" && t.root === root && t.filePath === filePath
      )
      if (existing) {
        resultId = existing.id
        setActiveTabId(existing.id)
        return prev
      }
      // ... 새 탭 생성
    })
    return resultId
  }, [])
  ```
  - `openDoc`에 이미 중복 검사 로직 존재하나, 호출 전에 `router.push`가 발생하여 매번 파일을 다시 읽음

- **파일 클릭 시 네비게이션**: `src/components/file-tree/file-tree-node.tsx:74-76`
  ```typescript
  clearSelection()
  const encodedPath = node.path.split("/").map(encodeURIComponent).join("/")
  router.push(`/${encodedPath}`)
  ```
  - 항상 `router.push`로 페이지 이동 → `page.tsx`에서 `readMdFile` 호출 → `Workspace`에서 `openDoc`

- **컴포넌트 트리**: `MarkdownLayoutInner` > `TabProvider` > `aside` + `main`. 파일 트리는 `TabProvider` 안에 있으므로 `useTabs` 접근 가능.

- **투팁 컴포넌트**: `src/components/ui/tooltip.tsx` ? `@base-ui/react/tooltip` 기반, `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` export. 이미 구현 완료.

## 3. 구현 상세

### 3.1 사이드바 리사이즈 핸들

**변경 파일**: `src/lib/sidebar-context.tsx`, `src/app/(markdown)/layout.tsx`

#### 3.1.1 sidebar-context.tsx ? 너비 상태 추가

`SidebarContext`에 `sidebarWidth`, `setSidebarWidth` 추가:

```typescript
type SidebarContext = {
  open: boolean
  setOpen: (v: boolean) => void
  sidebarWidth: number
  setSidebarWidth: (v: number) => void
}
```

기본값: `256` (기존 `w-64`). `setSidebarWidth`는 `160~500` 범위로 클램핑.

#### 3.1.2 layout.tsx ? 사이드바 너비 적용 + 드래그 핸들

1. `aside`의 `w-64`를 `style={{ width: sidebarWidth }}`로 교체
2. `aside` 하단(또는 오른쪽 끝)에 드래그 핸들 `<div>` 추가:
   - 스타일: `w-1 cursor-col-resize hover:bg-border transition-colors`
   - `onMouseDown`에서 드래그 시작:
     - `document.addEventListener("mousemove", onDrag)` / `document.addEventListener("mouseup", onDragEnd)`
     - `onDrag`: `setSidebarWidth( clamp(startWidth + (e.clientX - startX), 160, 500) )`
     - `onDragEnd`: 이벤트 리스너 제거
3. `useRef`로 드래그 시작 시 마우스 위치와 사이드바 너비 저장

### 3.2 파일 트리 이름 툴팁

**변경 파일**: `src/components/file-tree/file-tree-node.tsx`

1. import 추가: `Tooltip`, `TooltipTrigger`, `TooltipContent` from `@/components/ui/tooltip"`
2. 파일 트리 노드의 `<div role="button">` 내부를 `Tooltip` + `TooltipTrigger`로 감싸기
3. `TooltipContent`에 `node.name` 표시
4. `TooltipProvider`는 `layout.tsx`의 `SidebarInner` 상위에 1회 배치 (또는 `file-tree.tsx`에서 제공)

### 3.3 파일 선택 시 기존 탭 전환 (중복 방지)

**변경 파일**: `src/components/file-tree/file-tree-node.tsx`

1. import 추가: `useTabs` from `@/lib/tab-context"`
2. `handleClick`의 파일 분기에서 `router.push` 전에 탭 존재 여부 확인:

```typescript
// 기존:
clearSelection()
const encodedPath = node.path.split("/").map(encodeURIComponent).join("/")
router.push(`/${encodedPath}`)

// 변경:
clearSelection()
const { tabs, activateTab } = useTabs()
const existing = tabs.find(
  (t) => t.type === "doc" && t.filePath === node.path
)
if (existing) {
  activateTab(existing.id)
} else {
  const encodedPath = node.path.split("/").map(encodeURIComponent).join("/")
  router.push(`/${encodedPath}`)
}
```

### 3.4 에디터 탭 이름 툴팁

**변경 파일**: `src/components/tab/tab-bar.tsx`

1. import 추가: `Tooltip`, `TooltipTrigger`, `TooltipContent` from `@/components/ui/tooltip"`
2. 탭의 `<div>` 내부 `<span>`을 `Tooltip` + `TooltipTrigger`로 감싸기
3. `TooltipContent`에 `tab.title` 표시
4. `TooltipProvider`는 `layout.tsx`의 `TabProvider` 상위에 1회 배치

## 4. 구현 순서

| 순서 | 작업 내용 | 의존 |
|------|-----------|------|
| 1 | `sidebar-context.tsx`: `sidebarWidth`, `setSidebarWidth` 상태 추가 | - |
| 2 | `layout.tsx`: 사이드바 `style={{ width }}` 적용 + 드래그 핸들 구현 | 1 |
| 3 | `file-tree-node.tsx`: `useTabs` import + 파일 클릭 시 기존 탭 전환 로직 | - |
| 4 | `file-tree-node.tsx`: 파일/폴더 이름 툴팁 추가 | - |
| 5 | `tab-bar.tsx`: 탭 이름 툴팁 추가 | - |
| 6 | `layout.tsx` 또는 `file-tree.tsx`: `TooltipProvider` 배치 | 4, 5 |
| 7 | TypeScript 타입 검증 + 빌드 확인 | 1~6 |

## 5. 영향도 분석

| 파일 | 변경 범위 | 영향 |
|------|-----------|------|
| `src/lib/sidebar-context.tsx` | Context 타입 확장 (너비 상태 추가) | 기존 `useSidebar` 사용자에게 `sidebarWidth` 추가 노출 |
| `src/app/(markdown)/layout.tsx` | 사이드바 너비 적용 + 드래그 핸들 + TooltipProvider | 레이아웃 구조 변경 |
| `src/components/file-tree/file-tree-node.tsx` | 툴팁 + 탭 전환 로직 | 파일 클릭 동작 변경 (네이게이션 → 탭 전환) |
| `src/components/tab/tab-bar.tsx` | 탭 이름 툴팁 | 탭 바 시각 변경 없음 (호버 시에만 표시) |

- 기존 사이드바 열기/닫기 토글 동작 변경 없음
- 모바일(`md:hidden`) 시트 레이아웃에는 드래그 핸들 미적용
- `TooltipProvider`는 전역 1회 배치로 모든 툴팁 공유

## 6. 테스트/검증 계획

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| 1 | 사이드바 오른쪽 끝 구분선을 마우스로 드래그하여 우로 이동 | 사이드바가 넓어지고 본문이 좁아짐 |
| 2 | 드래그로 좌로 이동 | 사이드바가 좁아지고 본문이 넓어짐 |
| 3 | 최소 너비(160px) 이하로 드래그 시도 | 160px에서 고정 |
| 4 | 최대 너비(500px) 이상으로 드래그 시도 | 500px에서 고정 |
| 5 | 파일 트리에서 긴 파일명 파일에 마우스 호버 | 전체 파일명 툴팁 표시 |
| 6 | 파일 트리에서 폴더에 마우스 호버 | 전체 폴더명 툴팁 표시 |
| 7 | 이미 탭으로 열려 있는 파일을 파일 트리에서 클릭 | 새 탭 없이 기존 탭으로 이동 + 파일 재읽기 없음 |
| 8 | 열려 있지 않은 파일을 파일 트리에서 클릭 | 새 탭이 열리며 정상 동작 |
| 9 | 에디터 탭에서 긴 파일명 탭에 마우스 호버 | 전체 파일명 툴팁 표시 |
| 10 | 사이드바 닫기 → 다시 열기 | 이전 리사이즈 너비가 유지됨 |

## 7. 리스크 및 제약

- **드래그 핸들 z-index**: 드래그 중 마우스가 본문 영역으로 넘어가도 이벤트가 동작하도록 `document` 레벨 이벤트 리스너 사용. `user-select: none` 적용 필요.
- **SSR 호환**: `sidebarWidth`는 클라이언트 상태이므로 SSR 시 깜빡임 방지를 위해 `useEffect`에서 초기화하거나 CSS 변수 사용 고려.
- **TooltipProvider 위치**: 전역 1회 배치 시 레이아웃 변경. 기존 `Tooltip` 사용처가 없어 충돌 없음.
- **탭 전환 시 URL 동기화**: `activateTab`만으로 전환하면 URL이 변경되지 않음. 브라우저 뒤로가기 시 예상과 다를 수 있음. 향후 `window.history.replaceState` 고려 가능하나本次 범위 밖.

## 실행 로그(수행일·작업자)

> 아직 미수행
