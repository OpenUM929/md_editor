# 계획서 — 폴더 우클릭 컨텍스트 메뉴 가져오기 기능

> 상태: Done | 완료일: 2026-07-22 | 작성일: 2026-07-22
> 작업 유형: B (기능 개선)
> 선행: 없음

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-22 | 최초 작성 | 폴더 우클릭 → 로컬 폴더 가져오기 기능 추가 |
| 2026-07-22 | 구현 완료 | fs-access.ts basePath 추가, import-content.tsx targetFolder + readLocalDir, file-tree-node.tsx 우클릭 메뉴 |

---

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | 좌측 파일 트리에서 폴더를 우클릭하면 컨텍스트 메뉴에 "가져오기" 메뉴 항목이 표시되는가? | Y | Y — file-tree-node.tsx:294-307에서 `contextMenu.nodeType === "directory"`일 때 "가져오기" 버튼 렌더링 |
| 1.2 | 파일을 우클릭했을 때 "가져오기" 메뉴가 표시되지 않는가? (폴더에만 표시) | Y | Y — file-tree-node.tsx:294에서 `nodeType === "directory"` 조건부 렌더링 |
| 1.3 | "가져오기"를 클릭하면 브라우저의 폴더 선택 다이얼로그(`showDirectoryPicker`)가 열리는가? | Y | Y — import-content.tsx:78-91에서 `showDirectoryPicker()` 호출 |
| 1.4 | `showDirectoryPicker` 미지원 브라우저에서 `<input webkitdirectory>` 방식으로 fallback하는가? | Y | Y — import-content.tsx:93-99에서 fallback 로직 |
| 1.5 | 선택한 로컬 폴더의 모든 파일이 재귀적으로 수집되는가? | Y | Y — import-content.tsx:25-39 `readLocalDir` 재귀 함수 |
| 1.6 | 수집된 파일 목록이 다이얼로그에 미리보기로 표시되는가? (경로 + 크기) | Y | Y — import-content.tsx:200-213에서 파일 경로 + bytes 표시 |
| 1.7 | "가져오기" 확인 시 파일들이 우클릭한 대상 폴더 안에 저장되는가? | Y | Y — import-content.tsx:113 `importDocuments(files, targetFolder)` 호출, fs-access.ts:667-668에서 `basePath` 적용 |
| 1.8 | 파일 트리가 리로드되어 가져온 파일들이 대상 폴더 하위에 표시되는가? | Y | Y — import-content.tsx:114 `reload()` 호출 |
| 1.9 | 기존 상단 "가져오기" 버튼의 동작(루트에 가져오기)이 변경되지 않는가? | Y | Y — root-folder-selector.tsx 미수정, ImportContent의 targetFolder 미전달 시 기존 동작 유지 |

---

## 1. 배경 및 목적

현재 MD Editor의 가져오기 기능은 사이드바 상단의 "가져오기" 텍스트 버튼을 통해서만 접근 가능하며, 가져온 파일은 항상 워크스페이스 루트에 저장된다. 사용자가 특정 폴더 내에 파일을 가져오고 싶을 때는 가져오기 후 수동으로 파일을 이동해야 하는 불편함이 있다.

이 기능은 폴더를 우클릭한 컨텍스트 메뉴에서 "가져오기"를 선택하면, 로컬 파일 시스템의 폴더를 선택하여 해당 폴더의 모든 파일과 하위 폴더 구조를 그대로 대상 폴더에 복사할 수 있도록 한다.

## 2. 현재 시스템 분석

- **가져오기 다이얼로그**: `D:\dev\md_editor\md_editor\src\components\migration\import-content.tsx`
  - `ImportContent` 컴포넌트 — `open`, `onOpenChange` 두 개의 props만 가짐
  - `<input type="file" accept=".md" multiple>`과 `webkitdirectory` 속성으로 파일/폴더 선택
  - `webkitRelativePath`에서 최상위 폴더명을 strip한 후 경로 계산
  - `importDocuments(files)` 호출 → 루트에 파일 저장
  - `.md` 파일만 가져옴 (`accept=".md"` 필터)
- **가져오기 트리거**: `D:\dev\md_editor\md_editor\src\components\file-tree\root-folder-selector.tsx`
  - `RootFolderSelector` — 상단 "가져오기" 텍스트 버튼 + `ImportContent` 렌더링
- **파일 시스템**: `D:\dev\md_editor\md_editor\src\lib\fs-access.ts`
  - `importDocuments(files: { path: string; content: string }[])` — 파일 쓰기
  - FSA 모드: `getOrCreateFile(handle, file.path)` + writable 쓰기
  - Path 모드: `api("writeMd", { filePath, content })`
- **우클릭 컨텍스트 메뉴**: `D:\dev\md_editor\md_editor\src\components\file-tree\file-tree-node.tsx`
  - `ContextMenuState` 타입: `{ x, y, nodePath, nodeType }` (line 23)
  - 폴더/파일 구분 없이 "이름 변경", "삭제"만 표시 (lines 286-318)
  - `handleContextMenu()`에서 `clearSelection()` + `toggleSelect()` 후 메뉴 표시 (lines 77-85)

**현재 한계**: 가져오기는 루트에만 가능, 폴더별 지정 가져오기 없음

## 3. 구현 상세

### 3.1 import-content.tsx — targetFolder 지원

**Props 변경**:

```typescript
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetFolder?: string  // 신규: 가져올 대상 폴더 경로 (없으면 루트)
}
```

**다이얼로그 제목 변경**:
- `targetFolder` 없음: `"파일 가져오기"` (기존)
- `targetFolder` 있음: `"${targetFolder}에 가져오기"`

**폴더 선택 로직 변경** (`handleFolderSelect` 신규):

```
1. window.showDirectoryPicker() 호출
2. 성공 시 → readLocalDir(handle, "", []) 재귀 호출
3. 실패 시 → 기존 <input webkitdirectory> 방식 fallback
```

**`readLocalDir(dir, prefix, result)` 재귀 함수**:

```typescript
async function readLocalDir(
  dir: FileSystemDirectoryHandle,
  prefix: string,
  result: { path: string; content: string }[]
): Promise<void> {
  for await (const [name, handle] of dir.entries()) {
    const entryPath = prefix ? `${prefix}/${name}` : name
    if (handle.kind === "directory") {
      await readLocalDir(handle, entryPath, result)
    } else if (name.endsWith(".md")) {
      const file = await handle.getFile()
      result.push({ path: entryPath, content: await file.text() })
    }
  }
}
```

**`handleFileSelect` 수정** (webkitdirectory fallback 경로):

- `webkitRelativePath`에서 최상위 폴더명 제거 후 `targetFolder` prefix 추가
- 예: `targetFolder="A"`, `webkitRelativePath="B/a.md"` → `path="A/a.md"`

**`handleImport` 수정**:

- `importDocuments` 호출 시 파일 path에 `targetFolder/` prefix 추가
- 단, `targetFolder`가 빈 문자열이면 기존 동작 유지 (prefix 없음)

### 3.2 file-tree-node.tsx — 우클릭 메뉴 "가져오기" 항목

**상태 추가**:

```typescript
const [importTargetFolder, setImportTargetFolder] = useState<string | null>(null)
```

**컨텍스트 메뉴 렌더링 변경** (lines 286-318):

- `node.type === "directory"`일 때만 "가져오기" 메뉴 항목 추가
- `FileUp` 아이콘 사용
- 클릭 시 `setContextMenu(null)` → `setImportTargetFolder(contextMenu.nodePath)`

**ImportContent 렌더링** (파일 트리 하단):

```tsx
<ImportContent
  open={!!importTargetFolder}
  onOpenChange={(open) => { if (!open) setImportTargetFolder(null) }}
  targetFolder={importTargetFolder || undefined}
/>
```

### 3.3 fs-access.ts — importDocuments basePath 지원

**함수 시그니처 변경**:

```typescript
export async function importDocuments(
  files: { path: string; content: string }[],
  basePath: string = ""  // 신규 파라미터
): Promise<void>
```

**내부 로직 변경**:

- 각 파일의 실제 경로를 `basePath ? `${basePath}/${file.path}` : file.path`로 계산
- FSA 모드: `getOrCreateFile(handle, resolvedPath)`
- Path 모드: `api("writeMd", { filePath: resolvedPath, content })`

**기존 호출부 영향**: 없음 (basePath 기본값 `""`)

## 4. 구현 순서

| 순서 | 작업 내용 | 의존 |
|------|-----------|------|
| 1 | `fs-access.ts`: `importDocuments`에 `basePath` 파라미터 추가 | - |
| 2 | `import-content.tsx`: `targetFolder` props 추가 + `readLocalDir` 재귀 함수 + 다이얼로그 제목 변경 | 1 |
| 3 | `import-content.tsx`: `handleFolderSelect` 함수 (showDirectoryPicker + fallback) | 2 |
| 4 | `import-content.tsx`: `handleFileSelect`에서 targetFolder prefix 적용 | 2 |
| 5 | `import-content.tsx`: `handleImport`에서 basePath 적용 | 1, 2 |
| 6 | `file-tree-node.tsx`: `importTargetFolder` 상태 + 우클릭 메뉴 "가져오기" 항목 추가 | - |
| 7 | `file-tree-node.tsx`: `ImportContent` 컴포넌트 렌더링 | 2, 6 |
| 8 | 수동 테스트: 폴더 우클릭 → 가져오기 → 파일 선택 → 대상 폴더에 저장 확인 | 7 |

## 5. 영향도 분석

| 파일 | 변경 범위 | 영향 |
|------|-----------|------|
| `src/lib/fs-access.ts` | `importDocuments` 시그니처 확장 (기존 호출부 영향 없음) | 파일 시스템 레이어 |
| `src/components/migration/import-content.tsx` | Props 확장, 재귀 함수 추가, UI 변경 | 가져오기 다이얼로그 |
| `src/components/file-tree/file-tree-node.tsx` | 우클릭 메뉴 항목 추가, 상태 추가 | 각 트리 노드 |

- 기존 상단 "가져오기" 버튼 동작 변경 없음 (`RootFolderSelector` 미수정)
- `ImportContent`의 `targetFolder` 미전달 시 기존 동작 유지 (backward compatible)
- 우클릭 메뉴는 폴더에만 "가져오기" 표시, 파일에는 기존 메뉴 유지

## 6. 테스트/검증 계획

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| 1 | 폴더 우클릭 → 컨텍스트 메뉴 | "이름 변경", "삭제", "가져오기" 3개 메뉴 표시 |
| 2 | 파일 우클릭 → 컨텍스트 메뉴 | "이름 변경", "삭제"만 표시 ("가져오기" 없음) |
| 3 | 폴더 우클릭 → "가져오기" → "폴더 선택" | `showDirectoryPicker`로 로컬 폴더 선택 다이얼로그 열림 |
| 4 | 로컬 폴더 선택 → 미리보기 | 선택된 파일들이 경로 + 크기와 함께 표시 |
| 5 | "가져오기" 확인 → 파일 저장 | 로컬 파일들이 우클릭한 폴더 안에 저장 |
| 6 | 파일 트리 리로드 | 가져온 파일들이 대상 폴더 하위에 표시 |
| 7 | 상단 "가져오기" 버튼 | 루트에 가져오기 기존과 동작 동일 |
| 8 | `showDirectoryPicker` 미지원 브라우저 | `<input webkitdirectory>` fallback 동작 |

## 7. 리스크 및 제약

- **브라우저 호환성**: `showDirectoryPicker`는 Chromium 계열에서만 지원. Firefox/Safari에서는 `<input webkitdirectory>` fallback 사용
- **대량 파일 가져오기**: 수백 개 파일 가져오기 시 순차 API 호출로 인한 지연 가능. toast로 진행 상황 표시 권장
- **파일 유형**: `.md` 파일만 가져옴 (파일 트리 표시 정책 유지). non-.md 파일도 워크스페이스에 저장되지만 트리에 미표시
- **덮어쓰기**: 동일 이름 파일이 대상 폴더에 있으면 덮어씀 (기존 정책 유지)

## 실행 로그(수행일·작업자)

> 아직 미수행

## 요구사항 원자화 — 작업 후 답

> 구현 후 작성
