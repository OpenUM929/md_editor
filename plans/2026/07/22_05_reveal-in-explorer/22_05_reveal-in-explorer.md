# 계획서 — 우클릭 메뉴 "위치 열기" 기능

> 상태: Done | 완료일: 2026-07-22 | 작성일: 2026-07-22
> 작업 유형: B (기능 개선)
> 선행: 없음

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-22 | 최초 작성 | 파일/폴더 우클릭 → OS 탐색기에서 위치 열기 |

---

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | 파일을 우클릭하면 컨텍스트 메뉴에 "파일 위치 열기" 메뉴가 표시되는가? | Y | |
| 1.2 | 폴더를 우클릭하면 컨텍스트 메뉴에 "폴더 위치 열기" 메뉴가 표시되는가? | Y | |
| 1.3 | Path 모드에서만 해당 메뉴가 표시되는가? (FSA 모드에서는 숨김) | Y | |
| 1.4 | 클릭 시 OS 파일 탐색기에서 해당 파일/폴더가 선택되어 열리는가? | Y | |

---

## 1. 배경 및 목적

파일 트리에서 파일/폴더를 우클릭했을 때 OS 파일 탐색기에서 해당 위치를 바로 열 수 있는 기능이 필요하다. 기존 서버 사이드 API(`revealInFolder`, `openRootFolder`)는 이미 구현되어 있으나, 클라이언트에서 호출할 수 있는 래퍼 함수가 없어 컨텍스트 메뉴에서 사용할 수 없다.

## 2. 현재 시스템 분석

- **서버 API**: `src/lib/fs/server.ts` — `revealInFolder(root, filePath)` (파일 선택), `openRootFolder(root)` (폴더 열기)
- **API 라우트**: `src/app/api/fs/route.ts:74-78` — `revealInFolder`, `openRootFolder` action 처리
- **클라이언트 API 래퍼**: `src/lib/fs-access.ts:33-42` — `api<T>(action, extra)` 함수 존재. 현재 `revealInFolder`, `openRootFolder`를 호출하는 클라이언트 함수 없음
- **컨텍스트 메뉴**: `src/components/file-tree/file-tree-node.tsx:288-335` — "가져오기"(폴더만), "이름 변경", "삭제" 메뉴 존재. Path 모드 체크 없음

**현재 한계**:
1. `revealInFolder`/`openRootFolder`를 호출하는 클라이언트 함수 없음
2. 우클릭 메뉴에 "위치 열기" 항목 없음

## 3. 구현 상세

### 3.1 fs-access.ts — 클라이언트 함수 2개 추가

```typescript
export async function revealInFileExplorer(filePath: string): Promise<void> {
  if (!isPathMode()) return
  await api("revealInFolder", { filePath })
}

export async function openRootInFileExplorer(): Promise<void> {
  if (!isPathMode()) return
  await api("openRootFolder", {})
}
```

위치: `saveDocuments` 함수 바로 위 (기존 `saveHwpxBlob` 뒤)

### 3.2 file-tree-node.tsx — 우클릭 메뉴 항목 추가

**import 추가**: `FolderOpen` 아이콘 (lucide-react에서 이미 import됨)

**파일 우클릭 메뉴**: "이름 변경" 위에 "파일 위치 열기" 추가
- 아이콘: `FolderOpen`
- 텍스트: "파일 위치 열기"
- `isPathMode()` 체크로 FSA 모드에서 숨김

**폴더 우클릭 메뉴**: "가져오기" 바로 아래에 "폴더 위치 열기" 추가
- 아이콘: `FolderOpen`
- 텍스트: "폴더 위치 열기"
- `isPathMode()` 체크로 FSA 모드에서 숨김

**`isPathMode` import**: `@/lib/fs-access`에서 import

## 4. 구현 순서

| 순서 | 작업 내용 | 의존 |
|------|-----------|------|
| 1 | `fs-access.ts`: `revealInFileExplorer`, `openRootInFileExplorer` 함수 추가 | - |
| 2 | `file-tree-node.tsx`: `isPathMode` import + `FolderOpen` 아이콘 import | - |
| 3 | `file-tree-node.tsx`: 파일 우클릭 메뉴에 "파일 위치 열기" 추가 | 1, 2 |
| 4 | `file-tree-node.tsx`: 폴더 우클릭 메뉴에 "폴더 위치 열기" 추가 | 1, 2 |
| 5 | TypeScript 타입 검증 | 3, 4 |

## 5. 영향도 분석

| 파일 | 변경 범위 | 영향 |
|------|-----------|------|
| `src/lib/fs-access.ts` | 클라이언트 함수 2개 추가 | 기존 코드 변경 없음 |
| `src/components/file-tree/file-tree-node.tsx` | 우클릭 메뉴 항목 2개 추가 | 컨텍스트 메뉴 영역만 |

- 기존 컨텍스트 메뉴 동작 변경 없음
- 서버 사이드 API 변경 없음
- FSA 모드에서는 메뉴 자체가 표시되지 않음

## 6. 테스트/검증 계획

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| 1 | Path 모드에서 파일 우클릭 → "파일 위치 열기" | OS 탐색기에서 파일이 선택되어 열림 |
| 2 | Path 모드에서 폴더 우클릭 → "폴더 위치 열기" | OS 탐색기에서 폴더가 열림 |
| 3 | FSA 모드에서 우클릭 | "위치 열기" 메뉴 표시 안 됨 |

## 7. 리스크 및 제약

- **Path 모드 전용**: FSA 모드에서는 브라우저에서 OS 파일 경로에 접근할 수 없어 지원 불가
- **OS 의존**: `explorer /select` (Windows), `open -R` (macOS), `xdg-open` (Linux) 사용

## 실행 로그(수행일·작업자)

> 아직 미수행
