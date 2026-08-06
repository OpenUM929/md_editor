# 계획서 — 파일 트리 다중 선택 및 일괄 이동/삭제

> 상태: Done | 작성일: 2026-07-22
> 작업 유형: B (기능 개선)
> 선행: 없음

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-22 | 최초 작성 | 파일 트리 다중 선택 + 드래그 일괄 이동 + 컨텍스트 메뉴 일괄 삭제 |

---

## 1. 요구사항

1. 왼쪽 메뉴 파일 트리에서 파일/폴더를 **여러 개 선택**할 수 있어야 한다
2. 선택 방식: **Ctrl+Click** (개별 토글), **Shift+Click** (범위 선택)
3. 선택된 파일/폴더를 **드래그 앤 드롭**으로 다른 폴더로 일괄 이동할 수 있어야 한다
4. 선택된 항목을 **우클릭 컨텍스트 메뉴**로 일괄 삭제할 수 있어야 한다
5. 키보드 단축키: **Escape** (선택 해제), **Ctrl+A** (전체 선택)

## 2. 현재 시스템 분석

- **파일 트리 루트**: `D:\dev\md_editor\md_editor\src\components\file-tree\file-tree.tsx`
  - `FileTree` 컴포넌트 — `getFileTree()` 호출하여 트리 데이터를 `useState`에 저장
  - `FileTreeNode` 컴포넌트를 렌더링하며, 루트 영역에 드롭 시 `moveFile()` 호출
- **트리 노드**: `D:\dev\md_editor\md_editor\src\components\file-tree\file-tree-node.tsx`
  - `FileTreeNode` 컴포넌트 — `pathname === node.path`로 활성 파일 판단 (URL 기반 단일 선택)
  - `handleClick()`: 디렉토리는 토글, 파일은 `router.push()`로 이동
  - `handleDragStart()`: 단일 파일 드래그, `dataTransfer`에 경로 전달
  - `handleDrop()`: 폴더 드롭 시 `moveFile()` 호출
- **컨텍스트 메뉴**: `D:\dev\md_editor\md_editor\src\components\file-tree\file-tree-actions.tsx`
  - `FileNodeActions`: 이름 변경/삭제 (단일 파일)
  - `FolderNodeActions`: 새 파일/이름 변경/삭제 (단일 폴더)
  - 현재 다중 선택 상태 인지 없음
- **컨텍스트**: `D:\dev\md_editor\md_editor\src\components\file-tree\file-tree-context.tsx`
  - `reload()`, `reloadCounter`만 관리 — 선택 상태 없음
- **파일 시스템**: `D:\dev\md_editor\md_editor\src\lib\fs-access.ts`
  - `moveFile()`, `deleteFile()`, `deleteDirectory()` — 단일 파일/폴더 대상

**현재 한계**: 선택이 URL pathname 기반 단일 활성 파일이며, 드래그/삭제 모두 단일 대상만 지원

## 3. 구현 상세

### 3.1 file-tree-context.tsx — 선택 상태 관리

| 항목 | 변경 |
|------|------|
| 타입 확장 | `FileTreeContextType`에 `selectedPaths`, `lastSelectedPath`, `toggleSelect`, `rangeSelect`, `clearSelection`, `selectAll`, `isSelected` 추가 |
| 상태 추가 | `selectedPaths: Set<string>`, `lastSelectedPath: string | null` |
| `toggleSelect(path)` | 기존 선택 유지 + 해당 경로 토글. 토글 후 `lastSelectedPath` 갱신 |
| `rangeSelect(path)` | `lastSelectedPath`부터 현재까지 동일 부모 폴더 내 노드들을 범위 선택 |
| `clearSelection()` | `selectedPaths`를 `Set`으로 초기화 |
| `selectAll(paths)` | 전체 파일 경로 배열을 `Set`으로 세팅 |
| `isSelected(path)` | `selectedPaths.has(path)` 반환 |

### 3.2 file-tree-node.tsx — 선택 로직 + 시각 표시 + 다중 드래그

**클릭 핸들러 변경** (`handleClick`):

```
Ctrl/Meta+Click → toggleSelect(node.path) + router.push() 제거
Shift+Click    → rangeSelect(node.path) + router.push() 제거
일반 클릭       → clearSelection() + 기존 router.push() 동작 유지
```

**시각적 표시**:

| 상태 | 스타일 |
|------|--------|
| 선택됨 | `bg-primary/15 ring-1 ring-primary/50 text-foreground` |
| 활성(현재 열린 파일) | 기존 `bg-muted font-medium` 유지 |
| 선택 + 활성 | `bg-primary/20 ring-1 ring-primary/60 font-medium` |

**드래그 핸들러 변경** (`handleDragStart`):

```
드래그 시작 시:
  선택된 경로가 있으면 → dataTransfer에 JSON 배열 전달
  선택된 경로가 없으면(단일 드래그) → 기존대로 단일 경로 전달
```

**드롭 핸들러 변경** (`handleDrop`):

```
dataTransfer에서 JSON 배열 파싱 시도 →
  배열이면 → 순차 moveFile() 호출 + toast로 결과 표시
  실패하면(단일 경로) → 기존 단일 moveFile() 동작
```

**체크박스 표시**: 파일/폴더 이름 왼쪽에 선택 표시용 체크 아이콘 (선택 시에만 표시)

### 3.3 file-tree.tsx — 키보드 단축키 + 루트 드롭

**키보드 이벤트**: `useEffect`에서 `keydown` 리스너 등록

| 키 | 동작 |
|----|------|
| `Escape` | `clearSelection()` |
| `Ctrl+A` / `Cmd+A` | 전체 파일 경로 수집 → `selectAll()` + `preventDefault()` |

**루트 드롭 변경**: `handleRootDrop`에서 JSON 배열 파싱 → 순차 `moveFile()`

### 3.4 file-tree-actions.tsx — 컨텍스트 메뉴

**다중 선택 시 동작 변경**:

| 컴포넌트 | 변경 |
|----------|------|
| `FileNodeActions` | `selectedPaths`가 2개 이상이면 "선택된 항목 삭제" 메뉴 표시 |
| `FolderNodeActions` | `selectedPaths`가 2개 이상이면 "선택된 항목 삭제" 메뉴 표시 |
| 공통 | `window.confirm("N개의 항목을 삭제하시겠습니까?")` → 순차 삭제 |

**삭제 로직**: `selectedPaths`를 순회하며 각 경로에 대해:
- 경로가 `.md`로 끝나면 `deleteFile()`
- 아니면 `deleteDirectory()`
- 완료 후 `reload()` + `clearSelection()`

### 3.5 fs-access.ts — 일괄 삭제 함수

```
deleteFiles(paths: string[]): Promise<{ succeeded: string[]; failed: { path: string; error: string }[] }>
```

- 각 경로별 `deleteFile`/`deleteDirectory` 호출
- 개별 실패는 catch하여 `failed` 배열에 기록
- 반환값으로 성공/실패 내역 반환

## 4. 구현 순서

| 순서 | 작업 내용 | 의존 |
|------|-----------|------|
| 1 | `file-tree-context.tsx`: 선택 상태 타입 + 상태 관리 로직 추가 | - |
| 2 | `file-tree-node.tsx`: Ctrl+Click/Shift+Click 선택 로직 + 시각 스타일 | 1 |
| 3 | `file-tree-node.tsx`: 드래그에서 다중 경로 전달 + 드롭에서 순차 이동 | 1 |
| 4 | `file-tree.tsx`: 키보드 단축키 (Escape, Ctrl+A) + 루트 드롭 다중 지원 | 1 |
| 5 | `file-tree-actions.tsx`: 다중 선택 시 "선택된 항목 삭제" 컨텍스트 메뉴 | 1 |
| 6 | `fs-access.ts`: `deleteFiles()` 일괄 삭제 함수 | - |
| 7 | 수동 테스트: 단일 선택/다중 선택/드래그 이동/컨텍스트 메뉴 삭제 확인 | 2,3,4,5 |

## 5. 영향도 분석

| 파일 | 변경 범위 | 영향 |
|------|-----------|------|
| `src/components/file-tree/file-tree-context.tsx` | 타입 확장, 상태 추가 | 파일 트리 전체 |
| `src/components/file-tree/file-tree-node.tsx` | 클릭/드래그/드롭 핸들러, 스타일 | 각 트리 노드 |
| `src/components/file-tree/file-tree.tsx` | 키보드 이벤트, 루트 드롭 | 파일 트리 영역 |
| `src/components/file-tree/file-tree-actions.tsx` | 컨텍스트 메뉴 조건부 표시 | 파일/폴더 메뉴 |
| `src/lib/fs-access.ts` | `deleteFiles()` 추가 | 파일 시스템 레이어 |

- 기존 동작(단일 클릭으로 파일 열기, 단일 드래그 이동, 단일 컨텍스트 메뉴) 변경 없음
- URL 기반 활성 파일 표시 방식 유지
- 선택 상태는 컴포넌트 내 로컬 상태 — 전역 상태에 영향 없음

## 6. 테스트/검증 계획

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| 1 | 파일 클릭 | 기존과 동일하게 파일 열림 + 선택 해제 |
| 2 | Ctrl+Click 파일 | 해당 파일 선택 토글 (이동 없음) |
| 3 | Ctrl+Click 3개 파일 | 3개 파일이 선택 상태로 표시 |
| 4 | Shift+Click (동일 폴더 내) | 마지막 선택부터 현재까지 범위 선택 |
| 5 | Escape | 모든 선택 해제 |
| 6 | Ctrl+A | 모든 파일/폴더 선택 |
| 7 | 선택된 파일 드래그 → 폴더 드롭 | 모든 선택 파일이 대상 폴더로 이동 |
| 8 | 선택된 파일 우클릭 → "선택된 항목 삭제" | 확인 후 모든 선택 파일 삭제 |
| 9 | 폴더 선택 → 드래그 → 드롭 | 폴더 전체가 이동 |
| 10 | 폴더 선택 → 우클릭 → 삭제 | 폴더 + 하위 모든 파일 삭제 |

## 7. 리스크 및 제약

- **드래그 시 시각 피드백**: 현재 HTML5 드래그 API의 한계로 드래그 중인 여러 파일의 미리보기 표시가 어려움
- **대량 선택 시 성능**: 선택된 파일 수가 많을 때 드롭 시 순차 API 호출로 인한 지연 가능 (toast로 진행 상황 표시 권장)
- **Shift+Click 범위**: 파일 트리가 계층 구조이므로, "범위"는 동일 부모 폴더 내의 자식 노드들로 제한
- **우클릭 메뉴 위치**: 다중 선택 상태에서 우클릭 시 메뉴가 마지막 클릭 위치에 표시됨 — 변경 불필요
