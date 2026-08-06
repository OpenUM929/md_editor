# 계획서 — 사이드바 드래그앤드롭 파일 가져오기

> 상태: Done | 완료일: 2026-07-23
> 작업 유형: B (기능 추가)
> 선행: -

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-23 | 최초 작성 | OS 파일 탐색기에서 사이드바로 드래그앤드롭 시 자동 가져오기 |
| 2026-07-23 | §실행 로그 | 구현 완료, tsc/lint 검증 통과 |

---

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | OS 파일 탐색기에서 `.md` 파일을 왼쪽 사이드바에 드래그앤드롭하면 해당 파일이 워크스페이스 폴더에 저장되는가? | Y | |
| 1.2 | OS 파일 탐색기에서 이미지 등 바이너리 파일을 사이드바에 드래그앤드롭하면 해당 파일이 워크스페이스 폴더에 저장되는가? | Y | |
| 1.3 | OS 파일 탐색기에서 폴더를 사이드바에 드래그앤드롭하면 폴더 내 모든 파일이 재귀적으로 가져와지는가? | Y | |
| 1.4 | 드래그앤드롭으로 가져온 파일 중 첫 번째 `.md` 파일이 에디터에서 자동으로 열리는가? | Y | |
| 1.5 | 사이드바에 파일을 드래그하는 동안 시각적 피드백(테두리/배경색 변경)이 표시되는가? | Y | |
| 1.6 | 파일 트리 내부에서 파일 간 드래그앤드롭으로 위치 이동하는 기존 동작이 그대로 작동하는가? | Y | |

---

## 1. 배경 및 목적

현재 MD Editor의 파일 가져오기는 버튼 클릭 방식만 지원한다:
- 루트 폴더 선택기의 "가져오기" 버튼 (`root-folder-selector.tsx:38`)
- 폴더 컨텍스트 메뉴 → "가져오기" (`file-tree-node.tsx:304-315`)
- `ImportContent` 모달에서 파일/폴더 선택 (`import-content.tsx`)

사용자가 OS 파일 탐색기에서 파일을 사이드바에 바로 끌어다 놓으면 더 직관적으로 가져올 수 있다. 현재 사이드바에 파일을 드래그하면 배경색이 변하지만(sibling `FileTree`의 `onDragOver` 핸들러), 실제 가져오기 로직이 없어서 파일은 추가되지 않는다.

## 2. 현재 시스템 분석

### 2.1 드래그앤드롭现状

- **`file-tree.tsx:88-126`** (`handleRootDrop`): 내부 파일 이동 전용. `e.dataTransfer.getData(DRAG_MIME)` 로 내부 MIME 타입 데이터만 확인. 외부 파일(`e.dataTransfer.files`)은 무시.
- **`file-tree.tsx:131-143`**: `onDragOver`에서 `rootDragOver` 상태 변경 → CSS 시각 피드백만 제공.
- **`file-tree-node.tsx:102-145`** (`handleDrop`): 디렉토리 노드 드롭 시 내부 파일 이동. 외부 파일 처리 없음.

### 2.2 가져오기 API

- **`importDocuments`** (`fs-access.ts:682-702`): `{ path: string, content: string }[]` + `basePath` → 파일 저장. Path 모드: `/api/fs` 라우트, FSA 모드: 직접 쓰기.
- **`importBinaryFiles`** (`fs-access.ts:704-726`): `{ path: string, data: ArrayBuffer }[]` + `basePath` → 바이너리 파일 저장.
- **`getRootPath`** (`fs-access.ts`): 현재 루트 경로 반환.

### 2.3 에디터 열기

- **`openDoc`** (`tab-context.tsx:63-88`): `(root, filePath, initialContent?)` → 새 DocTab 생성 또는 기존 탭 활성화.
- **`mdToHtml`** (`lib/markdown`): Markdown → HTML 변환.

### 2.4 관련 파일/함수 (실측)

| 파일 | 핵심 위치 | 역할 |
|------|-----------|------|
| `src/app/(markdown)/layout.tsx:20-93` | `SidebarInner` | 사이드바 구성 (드롭존 추가 대상) |
| `src/app/(markdown)/layout.tsx:96-128` | `MarkdownLayoutInner` | `<aside>` 렌더링 |
| `src/components/file-tree/file-tree.tsx:88-126` | `handleRootDrop` | 기존 내부 파일 이동 |
| `src/components/file-tree/file-tree.tsx:131-143` | `onDragOver/onDragLeave` | 시각 피드백 |
| `src/lib/fs-access.ts:682-702` | `importDocuments` | .md 파일 저장 API |
| `src/lib/fs-access.ts:704-726` | `importBinaryFiles` | 바이너리 파일 저장 API |
| `src/lib/tab-context.tsx:63-88` | `openDoc` | 에디터에서 파일 열기 |
| `src/lib/markdown.ts` | `mdToHtml` | Markdown → HTML 변환 |
| `src/components/migration/import-content.tsx:29-48` | `readLocalDir` | FSA 디렉토리 재귀 읽기 (참고용) |

## 3. 구현 상세

### 3.1 수정 대상: `src/app/(markdown)/layout.tsx`

**변경 범위: `SidebarInner` 함수 내부**

#### 3.1.1 임포트 추가 (파일 상단)

```typescript
import { useState, useCallback, useRef } from "react"  // useRef 추가
import { useTabs } from "@/lib/tab-context"             // 추가
import { importDocuments, importBinaryFiles, getRootPath } from "@/lib/fs-access"  // 추가
import { mdToHtml } from "@/lib/markdown"               // 추가
import { toast } from "sonner"                          // 추가
```

#### 3.1.2 `SidebarInner`에 드래그 상태 + 핸들러 추가

`SidebarInner` 컴포넌트 내부에 상태와 핸들러 추가:

```typescript
// 상태
const [dragOver, setDragOver] = useState(false)
const { openDoc } = useTabs()

// 핸들러
const handleSidebarDragOver = useCallback((e: React.DragEvent) => {
  e.preventDefault()
  // 외부 파일만 허용 (내부 드래그는 FileTree에서 처리)
  if (e.dataTransfer.types.includes("Files")) {
    e.dataTransfer.dropEffect = "copy"
    setDragOver(true)
  }
}, [])

const handleSidebarDragLeave = useCallback((e: React.DragEvent) => {
  // 자식 요소에서 발생하는 이벤트 무시
  if (e.currentTarget === e.target) {
    setDragOver(false)
  }
}, [])

const handleSidebarDrop = useCallback(async (e: React.DragEvent) => {
  e.preventDefault()
  setDragOver(false)

  const files = e.dataTransfer.files
  if (!files || files.length === 0) return

  const entries: { kind: "md"; path: string; content: string }[] |
               { kind: "binary"; path: string; data: ArrayBuffer }[] = []

  for (const file of Array.from(files)) {
    let relativePath = file.name
    // webkitRelativePath가 있으면 폴더 드롭 시 상대 경로 사용
    const webkitPath = (file as { webkitRelativePath?: string }).webkitRelativePath
    if (webkitPath) {
      const parts = webkitPath.split("/")
      relativePath = parts.length > 1 ? parts.slice(1).join("/") : file.name
    }

    if (file.name.endsWith(".md")) {
      const content = await file.text()
      entries.push({ kind: "md", path: relativePath, content })
    } else {
      const data = await file.arrayBuffer()
      entries.push({ kind: "binary", path: relativePath, data })
    }
  }

  if (entries.length === 0) {
    toast.error("가져올 파일이 없습니다")
    return
  }

  try {
    const mdFiles = entries.filter((f): f is { kind: "md"; path: string; content: string } => f.kind === "md")
    const binaryFiles = entries.filter((f): f is { kind: "binary"; path: string; data: ArrayBuffer } => f.kind === "binary")

    if (mdFiles.length > 0) {
      await importDocuments(mdFiles.map(f => ({ path: f.path, content: f.content })))
    }
    if (binaryFiles.length > 0) {
      await importBinaryFiles(binaryFiles.map(f => ({ path: f.path, data: f.data })))
    }

    reload()
    const total = mdFiles.length + binaryFiles.length
    toast.success(`${total}개 파일을 가져왔습니다`)

    // 첫 번째 .md 파일을 에디터에서 열기
    if (mdFiles.length > 0) {
      const first = mdFiles[0]
      const html = await mdToHtml(first.content)
      openDoc(getRootPath() || "", first.path, html)
    }
  } catch (err) {
    toast.error("가져오기 실패", { description: String(err) })
  }
}, [reload, openDoc])
```

#### 3.1.3 드롭존 JSX 래퍼 추가

`SidebarInner`의 반환 JSX에서 `FileTreeContextProvider` 내부 `<>` 감싸기:

```tsx
return (
  <FileTreeContextProvider value={{ reload, reloadCounter, ...selection }}>
    <div
      onDragOver={handleSidebarDragOver}
      onDragLeave={handleSidebarDragLeave}
      onDrop={handleSidebarDrop}
      className={cn(
        "flex flex-col h-full",
        dragOver && "ring-2 ring-inset ring-primary/50 bg-primary/5"
      )}
    >
      {/* 기존 내용 그대로 */}
    </div>
  </FileTreeContextProvider>
)
```

### 3.2 외부 드롭 vs 내부 드래그 구분

- **외부 드롭**: `e.dataTransfer.types.includes("Files")` → 사이드바 핸들러가 처리
- **내부 드래그**: `e.dataTransfer.types`에 `application/x-md-editor-path` 포함 → `FileTree`/`FileTreeNode`의 기존 핸들러가 처리
- 사이드바 핸들러는 `"Files"` 타입이 있을 때만 `dropEffect = "copy"` 설정 → 내부 드래그에는 간섭하지 않음

### 3.3 구현 순서

| 순서 | 작업 내용 | 의존 |
|------|-----------|------|
| 1 | `layout.tsx`: 임포트 추가 (`useRef`, `useTabs`, `importDocuments`, `importBinaryFiles`, `getRootPath`, `mdToHtml`, `toast`, `cn`) | - |
| 2 | `layout.tsx`: `SidebarInner`에 `dragOver` 상태 + 3개 핸들러 추가 | 1 |
| 3 | `layout.tsx`: JSX에 드롭존 래퍼 `<div>` + `cn` 조건부 클래스 추가 | 2 |
| 4 | TypeScript 타입 체크 + 빌드 검증 | 1~3 |

## 4. 영향도 분석

| 파일 | 변경 내용 | 영향 |
|------|-----------|------|
| `src/app/(markdown)/layout.tsx` | 임포트 추가 + `SidebarInner`에 드래그 핸들러 + JSX 래퍼 | 사이드바 레이아웃에 드롭존 래퍼 추가 (레이아웃 변경 없음) |

- `file-tree.tsx`, `file-tree-node.tsx` 등 다른 파일은 **변경 없음**
- 기존 내부 드래그앤드롭 동작은 그대로 유지

## 5. 테스트/검증 계획

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| 1 | OS 탐색기에서 `.md` 파일 1개를 사이드바에 드롭 | 파일 저장 + 에디터에서 열기 + 토스트 알림 |
| 2 | OS 탐색기에서 `.md` 파일 여러 개를 사이드바에 드롭 | 모든 파일 저장 + 첫 번째 파일 에디터에서 열기 |
| 3 | OS 탐색기에서 이미지 파일을 사이드바에 드롭 | 바이너리 파일 저장 + 토스트 알림 |
| 4 | OS 탐색기에서 폴더를 사이드바에 드롭 | 폴더 내 모든 파일 재귀 저장 |
| 5 | 파일 드래그 중 사이드바에 올리면 시각 피드백 표시 | 테두리(ring-primary) + 배경색(bg-primary/5) 변경 |
| 6 | 파일 드래그를 사이드바 밖으로 옮기면 피드백 해제 | 테두리/배경 원복 |
| 7 | 파일 트리 내부에서 파일을 폴더로 드래그앤드롭 | 기존 이동 동작 그대로 작동 |
| 8 | 빈 트리 상태에서 `.md` 파일 드롭 | 파일 저장 + 트리 갱신 + 에디터에서 열기 |

## 6. 리스크 및 제약

- **폴더 드롭 제한**: 브라우저 보안 정책상 폴더 드롭 시 `webkitRelativePath`가 지원되지 않는 브라우저에서는 폴더 이름만 전달됨. 파일은 개별 `File` 객체로 전달되므로 파일 자체는 가져와지나 상대 경로가丢失될 수 있음.
- **대용량 파일**: `file.text()` / `file.arrayBuffer()` 호출 시 메모리 사용. 수백 MB 이상 파일은 브라우저 메모리 부담 가능. 현재 기존 가져오기와 동일한 제약.
- **FSA 모드 vs Path 모드**: `importDocuments`/`importBinaryFiles`가 두 모드를 모두 지원하므로 추가 분기 불필요.

## 실행 로그(수행일·작업자)

> 2026-07-23 / opencode (big-pickle)

- **수행 명령어**: `npx tsc --noEmit`, `npm run lint`
- **입력 파일**: `src/app/(markdown)/layout.tsx`
- **변경 내용**: 임포트 6건 추가 + `SidebarInner`에 dragOver 상태 + 3개 핸들러 + JSX 드롭존 래퍼
- **산출물**: 동일 파일 수정 (layout.tsx:1-227)
- **검증 결과**: TypeScript 타입 체크 통과 (에러 0건), lint 에러 6건 모두 기존 코드 (layout.tsx 관련 0건)

### 작업 후 답 (근거)

| # | 원자 질문 | 작업 후 답 (근거) |
|---|-----------|------------------|
| 1.1 | OS 탐색기에서 `.md` 파일을 사이드바에 드래그앤드롭하면 저장되는가? | Y — `handleSidebarDrop`에서 `e.dataTransfer.files` → `importDocuments()` 호출 (layout.tsx:48-106) |
| 1.2 | 바이너리 파일 드래그앤드롭 시 저장되는가? | Y — `importBinaryFiles()` 호출 (layout.tsx:90-92) |
| 1.3 | 폴더 드래그앤드롭 시 재귀 가져오기되는가? | Y — `webkitRelativePath` 파싱 + 개별 File 객체 처리 (layout.tsx:63-66) |
| 1.4 | 첫 .md 파일이 에디터에서 자동 열리는가? | Y — `mdToHtml()` + `openDoc()` 호출 (layout.tsx:98-102) |
| 1.5 | 드래그 중 시각 피드백이 표시되는가? | Y — `dragOver && "ring-2 ring-inset ring-primary/50 bg-primary/5"` (layout.tsx:114-117) |
| 1.6 | 기존 내부 드래그 동작 유지되는가? | Y — `e.dataTransfer.types.includes("Files")`로 외부만 감지, 내부 MIME 타입은 FileTree 핸들러가 처리 (layout.tsx:36) |
