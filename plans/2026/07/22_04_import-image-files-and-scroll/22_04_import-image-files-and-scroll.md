# 계획서 — 가져오기 이미지 파일 지원 + 스크롤 개선

> 상태: Todo | 작성일: 2026-07-22
> 작업 유형: B (기능 개선)
> 선행: 22_03_folder-context-menu-import

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-22 | 최초 작성 | 이미지 파일 가져오기 + 미리보기 스크롤 개선 |

---

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | 폴더 가져오기 시 .md 파일과 함께 지원 이미지 파일(.png, .jpg 등)도 가져오는가? | Y | |
| 1.2 | 가져온 이미지 파일은 .md 파일과 동일한 상대 경로 구조로 저장되는가? | Y | |
| 1.3 | 미리보기 목록에 .md 파일과 이미지 파일이 모두 표시되는가? | Y | |
| 1.4 | 파일이 20개 이상일 때 미리보기 영역에 스크롤이 적용되는가? | Y | |
| 1.5 | 기존 상단 "가져오기" 버튼의 동작이 변경되지 않는가? | Y | |

---

## 1. 배경 및 목적

22_03 계획으로 폴더 우클릭 가져오기 기능이 추가되었으나, 현재 `.md` 파일만 가져온다. 실제 md 문서에서는 `![alt](./images/photo.png)` 같이 상대 경로로 이미지를 참조하므로, 이미지 파일이 워크스페이스에 없으면 에디터에서 이미지가 표시되지 않는다. 가져오기 시 .md 파일에 첨부된 이미지 파일도 함께 가져와야 한다.

또한 대량 파일(20개 이상) 가져오기 시 미리보기 영역의 스크롤이 원활하지 않다.

## 2. 현재 시스템 분석

- **이미지 참조 방식**: `src/lib/doc-image.ts:20-38` — `resolveImageSrcs()`가 md 파싱 후 `<img>` 태그의 상대 경로를 `/api/asset` API URL로 리라이팅. 원본 경로는 `data-canonical-src`에 보존
- **이미지 서빙**: `src/app/api/asset/route.ts:5-9` — 지원 확장자: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.bmp`, `.ico`, `.avif`
- **가져오기 필터**: `src/components/migration/import-content.tsx:34` — `name.endsWith(".md")`로 .md 파일만 수집
- **가져오기 쓰기**: `src/lib/fs-access.ts:663-683` — `importDocuments(files, basePath)` — md 파일만 텍스트로 쓰기
- **미리보기 스크롤**: `import-content.tsx:200` — `min-h-0 flex-1 overflow-y-auto` 클래스 존재. 그러나 `DialogContent`(line 149)의 `max-h-[80vh]`와의 호환성 불확실
- **Path 모드 바이너리 쓰기**: 현재 `/api/fs` 라우트에 바이너리 쓰기 액션 없음 (`src/app/api/fs/route.ts`의 Action 유형 목록에 writeBinary 없음)

**현재 한계**:
1. `readLocalDir`에서 `.md` 파일만 필터링 → 이미지 수집 안 됨
2. `importDocuments`가 `string` content만 처리 → 바이너리 파일 쓰기 불가
3. 미리보기 영역에 명시적 높이 제한 없음 → 20개 이상 파일에서 스크롤 불안정

## 3. 구현 상세

### 3.1 fs-access.ts — importBinaryFiles 함수 신규

**함수 시그니처**:

```typescript
export async function importBinaryFiles(
  files: { path: string; data: ArrayBuffer }[],
  basePath: string = ""
): Promise<void>
```

**동작**:
- `resolvePath`: `basePath` 적용 (기존 `importDocuments`와 동일 패턴)
- Path 모드: 지원 안 함 (API 라우트에 writeBinary 액션 없음. 조용히 건너뜀)
- FSA 모드: `ensureRoot()` → 각 파일에 대해 `getOrCreateFile(handle, resolvedPath)` → `createWritable()` → `write(data)` → `close()`
- 기존 `saveBinaryFile` 함수(`fs-access.ts:681-690`)의 패턴 참고. 단, `saveBinaryFile`은 단일 파일 + 루트 기준이므로, `importBinaryFiles`는 복수 파일 + basePath 지원

### 3.2 import-content.tsx — 파일 타입 분리 수집

**`readLocalDir` 수정** (lines 25-39):

- 필터 조건 확장: `.md` + 지원 이미지 확장자 (asset/route.ts:5-9 기준)
- 지원 확장자 목록 상수화: `IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif"]`
- .md 파일: `content: string`으로 수집 (기존)
- 이미지 파일: `data: ArrayBuffer`로 수집 (신규)

**타입 변경**:

```typescript
type ImportFile =
  | { kind: "md"; path: string; content: string }
  | { kind: "image"; path: string; data: ArrayBuffer }
```

**컴포넌트 상태 변경**:

```typescript
// 기존
const [files, setFiles] = useState<{ path: string; content: string }[]>([])
// 변경
const [files, setFiles] = useState<ImportFile[]>([])
```

**`handleFolderSelect` 수정** (lines 77-100):
- `readLocalDir` 호출 결과가 `ImportFile[]` 반환
- .md 파일 0개 + 이미지 파일 N개인 경우:toast 경고 후 진행 (이미지만 가져오기)
- .md 파일 0개 + 이미지 파일 0개인 경우: 기존대로 에러 toast

**`handleFileSelect` 수정** (lines 49-75):
- 기존 `<input type="file" accept=".md">`는 .md 파일만 선택
- webkitdirectory fallback 시에도 이미지 파일 포함 수집

### 3.3 import-content.tsx — handleImport 수정

**가져오기 순서**:

```
1. importDocuments(mdFiles, targetFolder)  — .md 파일 저장
2. importBinaryFiles(imageFiles, targetFolder)  — 이미지 파일 저장
3. reload()  — 파일 트리 리로드
4. openDoc()  — 첫 번째 .md 파일 에디터에서 열기
5. toast.success()  — 완료 알림
```

**md 파일 필터링**: `files.filter(f => f.kind === "md")` → `importDocuments`
**이미지 파일 필터링**: `files.filter(f => f.kind === "image")` → `importBinaryFiles`

### 3.4 import-content.tsx — 미리보기 스크롤 개선

**변경 전** (line 200):
```html
<div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
```

**변경 후**:
```html
<div className="min-h-0 max-h-[50vh] overflow-y-auto rounded-md border">
```

- `flex-1` 제거 → `max-h-[50vh]`로 명시적 높이 제한
- `DialogContent`의 `max-h-[80vh]`와 독립적으로 동작
- 미리보기 영역이 50vh를 초과하면 스크롤 활성화

**파일별 크기 표시 변경**:
- .md: `f.content.length` bytes (기존)
- 이미지: `f.data.byteLength` bytes (신규)

**파일 타입 표시**: 이미지 파일 옆에 이미지 아이콘 표시 (선택 사항 — `Image` lucide 아이콘)

## 4. 구현 순서

| 순서 | 작업 내용 | 의존 |
|------|-----------|------|
| 1 | `fs-access.ts`: `importBinaryFiles` 함수 추가 | - |
| 2 | `import-content.tsx`: `IMAGE_EXTENSIONS` 상수 + `ImportFile` 타입 정의 | - |
| 3 | `import-content.tsx`: `readLocalDir`에서 .md + 이미지 파일 수집 | 2 |
| 4 | `import-content.tsx`: 컴포넌트 상태를 `ImportFile[]`로 변경 | 2 |
| 5 | `import-content.tsx`: `handleFolderSelect`에서 `ImportFile[]` 반환 처리 | 3, 4 |
| 6 | `import-content.tsx`: `handleFileSelect`에서 이미지 파일 처리 | 4 |
| 7 | `import-content.tsx`: `handleImport`에서 md → 이미지 순서 저장 | 1, 4 |
| 8 | `import-content.tsx`: 미리보기 스크롤 개선 (`max-h-[50vh]`) | - |
| 9 | 수동 테스트 | 7, 8 |

## 5. 영향도 분석

| 파일 | 변경 범위 | 영향 |
|------|-----------|------|
| `src/lib/fs-access.ts` | `importBinaryFiles` 함수 추가 | 파일 시스템 레이어 |
| `src/components/migration/import-content.tsx` | 타입 변경, readLocalDir 확장, handleImport 수정, 스크롤 개선 | 가져오기 다이얼로그 |

- 기존 `importDocuments` 함수 변경 없음 (호출부 영향 없음)
- 기존 상단 "가져오기" 버튼(`RootFolderSelector`) 동작 변경 없음
- 파일 트리(`file-tree.tsx`)는 `.md` 파일만 표시하는 기존 정책 유지 — 이미지 파일은 워크스페이스에 저장되지만 트리에 미표시
- Path 모드에서는 이미지 가져오기 불가 (API 확장 없음)

## 6. 테스트/검증 계획

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| 1 | .md 파일 3개 + 이미지 2개가 있는 로컬 폴더를 "폴더 선택"로 가져오기 | 5개 파일이 대상 폴더에 저장, .md 파일은 에디터에서 이미지 표시 |
| 2 | .md 파일만 있는 로컬 폴더 가져오기 | 기존과 동일하게 동작 |
| 3 | 이미지 파일만 있는 로컬 폴더 가져오기 | 이미지 파일만 저장, 에디터에서 열기 없음 |
| 4 | 파일 25개가 있는 폴더 미리보기 | 스크롤로 모든 파일 확인 가능 |
| 5 | 상단 "가져오기" 버튼 동작 | 루트에 가져오기 기존과 동일 |
| 6 | webkitdirectory fallback (Chromium 외 브라우저 시뮬) | .md + 이미지 파일 수집 |

## 7. 리스크 및 제약

- **Path 모드 제한**: 서버 API에 바이너리 쓰기 액션이 없어 Path 모드에서는 .md 파일만 가져오기. 이미지는 FSA 모드(Chromium)에서만 지원
- **대용량 이미지**: 수십 MB 이미지 파일 가져오기 시 FSA 쓰기 지연 가능
- **webkitdirectory fallback**: 일부 브라우저에서 이미지 파일 필터링 동작 차이 가능
- **이미지 파일 미표시**: 파일 트리에 .md 파일만 표시하는 기존 정책 유지 — 이미지 파일은 에디터에서만 참조 가능

## 실행 로그(수행일·작업자)

> 아직 미수행
