# 계획서 — 사이드바 드래그 리사이즈

> 상태: Done | 완료일: 2026-07-27
> 작업 유형: B (기능 추가)
> 선행: -

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-27 | 최초 작성 | 사이드바 우측 경계 드래그로 너비 실시간 조절 (최소 150px, 최대 500px) |
| 2026-07-27 | §실행 로그 | 구현 완료, tsc/lint 검증 통과 |
| 2026-07-27 | §3 수정 | SidebarInner `h-full` → `flex-1 min-h-0` 수정 (ResizeHandle 표시 문제 해결) |
| 2026-07-27 | §3 수정 | 모바일 Sheet 컴포넌트 제거 (지침상 모바일 버전 미지원) |
| 2026-07-27 | §7 신규 | 근본 원인 분석: ResizeHandle 위치 오류 (flex column 하단 배치 → 우측 경계가 아님) |
| 2026-07-27 | §8 신규 | 수정 계획: ResizeHandle을 absolute로 aside 우측 경계에 절대 배치 |
| 2026-07-27 | §8 수행 | ResizeHandle 위치 교정 완료 (absolute right-0 top-0 bottom-0) |

---

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | 사이드바 우측 경계를 마우스로 드래그하면 사이드바 너비가 실시간으로 변경되는가? | Y | Y — ResizeHandle이 `absolute right-0 top-0 bottom-0`으로 aside 우측 경계에 절대 배치됨 (layout.tsx:415,432). 사용자 확인 완료 |
| 1.2 | 드래그 시 사이드바 너비가 150px 미만으로 줄어들지 않는가? | Y | Y — `Math.max(150, ...)` 클램핑 (layout.tsx:398, sidebar-context.tsx:40) |
| 1.3 | 드래그 시 사이드바 너비가 500px 이상으로 늘어나지 않는가? | Y | Y — `Math.min(500, ...)` 클램핑 (layout.tsx:398, sidebar-context.tsx:40) |
| 1.4 | 드래그 중 마우스 버튼을 놓으면 해당 너비가 유지되는가? | Y | Y — `pointerup`에서 이벤트 리스너 제거, 상태는 React state에 유지 (layout.tsx:402-407) |
| 1.5 | 드래그 중 브라우저 내 텍스트 선택이 방지되는가? | Y | Y — `document.body.style.userSelect = "none"` 설정 (layout.tsx:394) |
| 1.6 | 사이드바 너비 변경 후 새로고침해도 마지막 너비가 유지되는가? | Y | Y — `localStorage.setItem(STORAGE_KEY, ...)` 저장 + `readWidth()`에서 복원 (sidebar-context.tsx:10-18, 37-41) |

---

## 1. 배경 및 목적

현재 MD Editor의 사이드바 너비는 고정 `w-64` (256px)로 설정되어 있다:
- `<aside className="hidden w-64 shrink-0 ...">` (`layout.tsx` 원본 기준)

사용자가 사이드바 너비를 자유롭게 조절할 수 없어, 파일 트리가 긴 경로를 표시할 때 공간이 부족하거나, 반대로 불필요한 공간을 차지하는 문제가 있다. 드래그 리사이즈 기능을 통해 사용자 경험을 개선한다.

## 2. 현재 시스템 분석

### 2.1 사이드바 상태 관리

- **`sidebar-context.tsx:5-8`**: `SidebarContext` 타입 — `open: boolean`과 `setOpen`만 포함
- **`sidebar-context.tsx:12-14`**: `SidebarProvider` — `useState(true)`로 기본 열림 상태 관리
- 너비 관련 상태 없음, localStorage 저장 없음

### 2.2 사이드바 렌더링 (수정 전)

- **`layout.tsx`** (`MarkdownLayoutInner`): 메인 레이아웃 구성
- 데스크톱 사이드바 — `<aside className="hidden w-64 shrink-0 border-r bg-sidebar print:hidden md:flex md:flex-col">`
- 고정 `w-64` 클래스 사용, 동적 너비 없음
- 모바일 사이드바 — 지침상 미지원 대상

### 2.3 관련 파일/함수 (실측)

| 파일 | 핵심 위치 | 역할 |
|------|-----------|------|
| `src/lib/sidebar-context.tsx` | `SidebarContext`, `SidebarProvider` | 사이드바 열림/닫힘 상태 관리 |
| `src/app/(markdown)/layout.tsx` | `MarkdownLayoutInner` | 메인 레이아웃 + 사이드바 렌더링 |
| `src/app/(markdown)/layout.tsx` | `<aside>` | 데스크톱 사이드바 (고정 w-64) |
| `src/app/(markdown)/layout.tsx` | `SidebarInner` | 사이드바 내부 콘텐츠 |

## 3. 구현 상세

### 3.1 수정 대상: `src/lib/sidebar-context.tsx` (완료)

**변경 내용: Context에 width 상태 추가**

```typescript
type SidebarContext = {
  open: boolean
  setOpen: (v: boolean) => void
  width: number
  setWidth: (v: number) => void
}
```

- 기본 너비: `256` (기존 `w-64`와 동일)
- `MIN_WIDTH`: `150`, `MAX_WIDTH`: `500`
- localStorage 키: `sidebar-width`
- `readWidth()` 함수로 초기화 시 localStorage에서 복원
- `setWidth`에서 min/max 클램핑 + localStorage 저장

### 3.2 수정 대상: `src/app/(markdown)/layout.tsx` (진행 중)

**변경 내용 0: `SidebarInner` 루트 div 클래스 변경 (완료)**

```diff
- "flex flex-col h-full",
+ "flex flex-col flex-1 min-h-0",
```

**변경 내용 1: 모바일 Sheet 컴포넌트 제거 (완료)**

`Sheet`, `SheetContent`, `SheetTrigger`, `Menu` import 제거 + JSX 제거.

**변경 내용 2: `<aside>` 동적 너비 적용 (완료)**

```tsx
<aside
  style={{ width }}
  className="hidden shrink-0 border-r bg-sidebar print:hidden md:flex md:flex-col"
>
```

**변경 내용 3: `ResizeHandle` 위치 수정 (미완료 — 이번 수정 대상)**

→ §8 상세 참조

### 3.3 ResizeHandle 컴포넌트 — 현재 코드 (layout.tsx:384-420)

```tsx
function ResizeHandle() {
  const { width, setWidth } = useSidebar()

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width

    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    const onPointerMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX
      const newWidth = Math.min(500, Math.max(150, startWidth + delta))
      setWidth(newWidth)
    }

    const onPointerUp = () => {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      document.removeEventListener("pointermove", onPointerMove)
      document.removeEventListener("pointerup", onPointerUp)
    }

    document.addEventListener("pointermove", onPointerMove)
    document.addEventListener("pointerup", onPointerUp)
  }, [width, setWidth])

  return (
    <div
      onPointerDown={onPointerDown}
      className="group relative w-1.5 shrink-0 cursor-col-resize"
    >
      <div className="absolute inset-y-0 -left-1 w-3 group-hover:bg-primary/30 group-active:bg-primary/50 transition-colors" />
    </div>
  )
}
```

### 3.4 aside 내부 구조 — 현재 코드 (layout.tsx:429-436)

```tsx
<aside
  style={{ width }}
  className="hidden shrink-0 border-r bg-sidebar print:hidden md:flex md:flex-col"
>
  <SidebarInner />
  <ResizeHandle />
</aside>
```

### 3.5 구현 순서 (완료분 포함)

| 순서 | 작업 내용 | 상태 |
|------|-----------|------|
| 1 | `sidebar-context.tsx`: `width`/`setWidth` 상태 + localStorage 동기화 | 완료 |
| 2 | `layout.tsx`: `SidebarInner` 루트 div `h-full` → `flex-1 min-h-0` | 완료 |
| 3 | `layout.tsx`: 모바일 Sheet 컴포넌트 제거 | 완료 |
| 4 | `layout.tsx`: `<aside>` 동적 너비 적용 (`style={{ width }}`) | 완료 |
| 5 | `layout.tsx`: `ResizeHandle` 위치를 `absolute right-0`으로 수정 + `aside`에 `relative` 추가 | 완료 |
| 6 | TypeScript 타입 체크 + 빌드 검증 | 완료 |

## 4. 영향도 분석

| 파일 | 변경 내용 | 영향 |
|------|-----------|------|
| `src/lib/sidebar-context.tsx` | Context 타입 확장 + width 상태 추가 | 사이드바 너비 상태 관리 |
| `src/app/(markdown)/layout.tsx` | 동적 너비 + ResizeHandle + 모바일 제거 + SidebarInner 클래스 + ResizeHandle 위치 | 사이드바 레이아웃 |

- `SidebarInner` 내부 콘텐츠 — 변경 없음
- `FileTree`, `TemplateTab` 등 자식 컴포넌트 — 변경 없음
- 에디터 영역(`<main>`) — 사이드바 너비 변경에 따라 유연하게 축소/확대 (flex 레이아웃)

## 5. 테스트/검증 계획

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| 1 | 사이드바 우측 경계에 마우스 호버 | `col-resize` 커서 표시 |
| 2 | 우측 경계를 오른쪽으로 드래그 | 사이드바 너비 증가 (최대 500px) |
| 3 | 우측 경계를 왼쪽으로 드래그 | 사이드바 너비 감소 (최소 150px) |
| 4 | 150px까지 축소 후 계속 왼쪽으로 드래그 | 150px에서 더 이상 줄어들지 않음 |
| 5 | 500px까지 확대 후 계속 오른쪽으로 드래그 | 500px에서 더 이상 늘어나지 않음 |
| 6 | 드래그 중 브라우저 영역에서 텍스트 선택 | 텍스트 선택 방지 (user-select: none) |
| 7 | 드래그 종료 후 페이지 새로고침 | 마지막 너비 유지 (localStorage) |
| 8 | 기본 너비(256px)에서 새로고침 | 256px 유지 |
| 9 | `tsc --noEmit` 실행 | 타입 에러 0건 |
| 10 | `npm run lint` 실행 | 새 lint 에러 0건 |

## 6. 리스크 및 제약

- **브라우저 호환성**: `pointer` 이벤트는 모든 최신 브라우저 지원 (IE 미지원)
- **성능**: `pointermove` 이벤트에서 `setWidth` 호출 → React 리렌더링. `width`가 숫자이므로 리렌더링 비용 낮음
- **localStorage 용량**: 너비 값 1바이트 수준으로 영향 없음

---

## 7. 근본 원인 분석 — ResizeHandle 동작 불가

### 7.1 문제 증상

사이드바 우측 경계선에 마우스를 올려도:
1. 커서가 `col-resize`로 변경되지 않음
2. 드래그로 너비 조절 불가

### 7.2 사실 기반 원인 (실측 코드 근거)

**원인 1: ResizeHandle이 aside 하단에 배치됨 (위치 오류)**

현재 aside는 `md:flex md:flex-col` (layout.tsx:432). flex column에서 자식들은 **수직으로 쌓인다** (CSS flexbox 명세).

현재 DOM 구조:
```
<aside class="flex flex-col" style="width:256px">   ← flex column
  <SidebarInner />                                    ← flex-1 (남은 수직 공간 전부 차지)
  <ResizeHandle />                                    ← 하단(bottom)에 배치됨
</aside>
```

`ResizeHandle`은 aside의 **flex 자식**이므로 aside 하단에 6px(`w-1.5`) 가로 막대로 렌더링된다. 사용자가 기대하는 **우측 경계의 세로 리사이즈 핸들**이 아니다.

| 구분 | 기대 | 실제 |
|------|------|------|
| 핸들 형태 | aside 우측 경계의 **세로** 막대 (전체 높이) | aside 하단의 **가로** 막대 (6px) |
| 커서 변경 위치 | `border-r` 근처 (aside 우측 끝) | 하단 6px 영역 (거의 보이지 않음) |
| 드래그 동작 | aside 너비 실시간 변경 | 불가 (위치가 잘못됨) |

**원인 2: 커서 변경 영역이 6px에 불과**

`cursor-col-resize` 클래스가 `w-1.5`(6px)인 바깥 div에만 적용됨 (layout.tsx:415). 내부 확장 영역(`-left-1 w-3`, 12px)에는 `cursor-col-resize` 없음 (layout.tsx:417).

**원인 3: `border-r`과 ResizeHandle이 서로 다른 DOM 위치**

`<aside>`의 `border-r`은 aside 우측 테두리이고, `ResizeHandle`은 aside 내부 하단 자식이다. 사용자가 마우스를 올리는 "경계선"은 `border-r`이지만, ResizeHandle은 그곳에 없다.

### 7.3 실패 이력 분석

| 시도 | 변경 내용 | 왜 실패했는가 |
|------|-----------|---------------|
| 1 | `w-64` → `style={{ width }}` + ResizeHandle 추가 | ResizeHandle을 aside flex 자식으로 넣음 → 하단 배치. 위치 오류 미인지 |
| 2 | `h-full` → `flex-1 min-h-0` | ResizeHandle이 보이게 됨 → 하단에 6px 가로 막대. 위치 문제 해결 안 됨 |
| 3 | `w-1` → `w-1.5` + 호버 영역 확장 | 하단 막대의 호버 피드백 개선. 위치 문제 해결 안 됨 |
| 4 | 계획 수립만 수행 안 함 | - |

**공통 실패 원인**: CSS flex column에서 자식이 수직 스택된다는 기본 원리를 반복적으로 간과. "클래스를 바꾸면 해결된다"는 접근으로 근본 위치 문제를 인식하지 못함.

---

## 8. 수정 계획 — ResizeHandle 위치 교정

### 8.1 수정 방향

`ResizeHandle`을 aside의 **flex 자식이 아닌**, aside 내부 **우측 경계에 절대 배치**한다.

### 8.2 변경 1: `aside`에 `relative` 추가

**파일:** `src/app/(markdown)/layout.tsx` (MarkdownLayoutInner 내부 aside)

```diff
  <aside
    style={{ width }}
-   className="hidden shrink-0 border-r bg-sidebar print:hidden md:flex md:flex-col"
+   className="relative hidden shrink-0 border-r bg-sidebar print:hidden md:flex md:flex-col"
  >
```

### 8.3 변경 2: `ResizeHandle`을 absolute로 우측 경계에 배치

**파일:** `src/app/(markdown)/layout.tsx` (ResizeHandle 컴포넌트 반환부)

```diff
  return (
    <div
      onPointerDown={onPointerDown}
-     className="group relative w-1.5 shrink-0 cursor-col-resize"
+     className="absolute right-0 top-0 bottom-0 w-1.5 z-10 cursor-col-resize"
    >
-     <div className="absolute inset-y-0 -left-1 w-3 group-hover:bg-primary/30 group-active:bg-primary/50 transition-colors" />
+     <div className="absolute inset-y-0 -left-1 w-3 hover:bg-primary/30 active:bg-primary/50 transition-colors" />
    </div>
  )
```

- `absolute right-0 top-0 bottom-0`: aside 우측 경계에 세로 막대로 절대 배치, 전체 높이
- `z-10`: `border-r` 위에 표시
- `group` 제거, 내부 div에 직접 `hover:`/`active:` 적용

### 8.4 변경 3: `ResizeHandle`을 aside 내부 맨 앞으로 이동

**파일:** `src/app/(markdown)/layout.tsx` (MarkdownLayoutInner 내부 aside)

```diff
  <aside style={{ width }} className="relative ...">
+   <ResizeHandle />
    <SidebarInner />
-   <ResizeHandle />
  </aside>
```

`ResizeHandle`이 flex 자식이 아니므로 위치에는 영향 없음. 단, z-index 순서를 위해 맨 앞 배치.

### 8.5 수정 후 DOM 구조

```
<div class="flex h-screen overflow-hidden">           ← L1: 루트
  <aside class="relative flex flex-col" style="width:256px">  ← L2: relative 추가
    <ResizeHandle class="absolute right-0 top-0 bottom-0 w-1.5 z-10" />  ← L3: 우측 경계 세로 막대
    <SidebarInner class="flex-1 min-h-0" />                        ← L4: 기존 콘텐츠
  </aside>
  <main class="flex-1">...</main>
</div>
```

### 8.6 기대 동작

1. ResizeHandle이 aside **우측 경계에 전체 높이의 세로 핸들**로 표시
2. `border-r` 근처에 마우스를 올리면 `col-resize` 커서 표시
3. 좌우 드래그로 150px~500px 범위 내 너비 조절
4. 드래그 중 배경색 피드백 (`hover:bg-primary/30`)
5. 드래그 종료 시 너비 유지 + localStorage 저장

### 8.7 검증 항목

| # | 검증 내용 | 방법 |
|---|-----------|------|
| 1 | aside 우측 경계에 ResizeHandle이 표시되는지 | 브라우저 DevTools로 요소 확인 |
| 2 | 우측 경계 호버 시 `col-resize` 커서 변경 | 직접 마우스 올려서 확인 |
| 3 | 드래그로 너비 실시간 변경 | 마우스 다운 + 이동 + 업 |
| 4 | 150px/500px 범위 제한 | 극한값까지 드래그 |
| 5 | `tsc --noEmit` 에러 0건 | 빌드 검증 |
| 6 | `eslint` 에러 0건 | 린트 검증 |

## 9. 실행 로그(수행일·작업자)

> 2026-07-27 / opencode (big-pickle)

### 1차 구현

- **수행 명령어**: `npx tsc --noEmit`, `npx eslint src/lib/sidebar-context.tsx src/app/(markdown)/layout.tsx`
- **입력 파일**: `src/lib/sidebar-context.tsx`, `src/app/(markdown)/layout.tsx`
- **변경 내용**:
  - `sidebar-context.tsx`: Context 타입에 `width`/`setWidth` 추가, `readWidth()` 함수로 localStorage 초기화, `setWidth`에서 min/max 클램핑 + localStorage 저장
  - `layout.tsx`: `SidebarInner` 루트 div `h-full` → `flex-1 min-h-0` 변경, `ResizeHandle` 컴포넌트 신규 생성, `MarkdownLayoutInner`에서 `width` 추출, 데스크톱 `<aside>`에 `style={{ width }}` + `<ResizeHandle />` 추가, 모바일 Sheet 컴포넌트 제거
- **검증 결과**: TypeScript 타입 체크 통과 (에러 0건), lint 에러 0건

### 2차 수정 (위치 교정)

- **수행 명령어**: `npx tsc --noEmit`, `npx eslint src/app/(markdown)/layout.tsx`
- **입력 파일**: `src/app/(markdown)/layout.tsx`
- **변경 내용**:
  - `layout.tsx:415`: `ResizeHandle` className `group relative w-1.5 shrink-0 cursor-col-resize` → `absolute right-0 top-0 bottom-0 w-1.5 z-10 cursor-col-resize`
  - `layout.tsx:417`: 내부 div `group-hover:bg-primary/30 group-active:bg-primary/50` → `hover:bg-primary/30 active:bg-primary/50` (group 제거)
  - `layout.tsx:432`: `<aside>` className에 `relative` 추가
  - `layout.tsx:434`: `<ResizeHandle />`을 `<SidebarInner />` 앞으로 이동
- **검증 결과**: TypeScript 타입 체크 통과 (에러 0건), lint 에러 0건
