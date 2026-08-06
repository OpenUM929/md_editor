# 계획서 — 파일 우클릭 복제본 + 빈 곳 우클릭 새 항목

> 상태: Done | 작성일: 2026-07-27 | 완료일: 2026-07-27
> 작업 유형: B (기능 개선/신규 기능)

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-27 | 최초 작성 | 파일 우클릭 복제본 만들기 + 빈 곳 우클릭 새 폴더/파일 |

---

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | 좌측 파일 트리에서 **파일**을 우클릭하면 "복제본 만들기" 메뉴가 표시되는가? | Y | |
| 1.2 | "복제본 만들기" 선택 시 같은 폴더에 "원본 (복사본).md" 파일이 생성되는가? | Y | |
| 1.3 | "원본 (복사본).md"가 이미 존재하면 "원본 (복사본 2).md" 등 번호가 증가하는가? | Y | |
| 1.4 | 파일 "..." 버튼(`FileNodeActions`) 메뉴에도 "복제본 만들기"가 표시되는가? | Y | |
| 2.1 | 좌측 파일 트리의 빈 곳(노드 외 영역)을 우클릭하면 컨텍스트 메뉴가 표시되는가? | Y | |
| 2.2 | 빈 곳 우클릭 메뉴에 "새 폴더"와 "새 파일" 두 옵션이 있는가? | Y | |
| 2.3 | "새 폴더" 선택 시 루트에 새 디렉토리가 생성되는가? | Y | |
| 2.4 | "새 파일" 선택 시 루트에 새 .md 파일이 생성되는가? | Y | |

---

## 1. 배경 및 목적

좌측 파일 트리의 컨텍스트 메뉴 기능이 제한적이다.

**파일 우클릭:**
- 현재: 이름 변경, 삭제만 가능
- 필요: 복제본(복사) 기능 — 같은 폴더에 내용을 복사한 새 파일 생성

**빈 곳 우클릭:**
- 현재: 빈 곳 우클릭 시 아무 동작 없음 (노드에만 컨텍스트 메뉴 존재)
- 필요: 루트 레벨에서 새 폴더/파일을 빠르게 생성할 수 있는 진입점

---

## 2. 현재 시스템 분석

### 2.1 파일 우클릭 컨텍스트 메뉴

- **위치**: `src/components/file-tree/file-tree-node.tsx:313-386`
- **현재 항목** (파일):
  - 파일 위치 열기 (path 모드일 때만)
  - 이름 변경
  - 삭제
  - 선택된 항목 삭제
- **"..." 버튼**: `src/components/file-tree/file-tree-actions.tsx:87-195` (`FileNodeActions`)
  - 이름 변경, 삭제, 선택된 항목 삭제

### 2.2 빈 곳 우클릭

- **위치**: `src/components/file-tree/file-tree.tsx:128-151`
- 루트 `<div>`에 `onContextMenu` 핸들러 없음
- 노드들의 `handleDragStart`/`handleDrop`만 존재
- 빈 곳 우클릭 시 브라우저 기본 컨텍스트 메뉴가 표시됨

### 2.3 기존 파일 시스템 함수

| 함수 | 위치 | 용도 |
|------|------|------|
| `createFile(root, filePath)` | `fs-access.ts:493` | 빈 .md 파일 생성 |
| `createDirectory(root, dirPath)` | `fs-access.ts:508` | 디렉토리 생성 |
| `renameFile(root, oldPath, newPath)` | `fs-access.ts:542` | 파일 이름 변경 |
| `readFile(root, filePath)` | `fs-access.ts` | 파일 내용 읽기 |
| `writeFile(root, filePath, content)` | `fs-access.ts` | 파일 쓰기 |
| `createFile(root, filePath)` | `fs/server.ts:119` | 서버 측 빈 파일 생성 |
| `createDirectory(root, dirPath)` | `fs/server.ts:126` | 서버 측 디렉토리 생성 |

**복제본 기능에 필요한 것:**
- 파일 내용 읽기 → 새 경로에 쓰기 (readFile + writeFile 조합)
- 또는 `fs/server.ts`에 `copyFile` 함수 추가

---

## 3. 구현 상세

### 3.1 파일 우클릭 → 복제본 만들기

**변경 파일:**

| 파일 | 변경 내용 |
|------|-----------|
| `src/lib/fs-access.ts` | `duplicateFile` 함수 추가 |
| `src/lib/fs/server.ts` | `copyFile` 함수 추가 |
| `src/app/api/fs/route.ts` | `copyFile` action 추가 |
| `src/components/file-tree/file-tree-node.tsx` | 파일 컨텍스트 메뉴에 "복제본 만들기" 추가 |
| `src/components/file-tree/file-tree-actions.tsx` | `FileNodeActions`에 "복제본 만들기" 추가 |

#### 3.1.1 `fs/server.ts` — `copyFile` 함수 추가

```typescript
export async function copyFile(root: string, filePath: string, destPath: string): Promise<void> {
  const r = await safeRoot(root)
  const srcP = safePath(r, filePath)
  const destP = safePath(r, destPath)
  await fs.mkdir(path.dirname(destP), { recursive: true })
  await fs.copyFile(srcP, destP)
}
```

#### 3.1.2 `fs-access.ts` — `duplicateFile` 함수 추가

```typescript
export async function duplicateFile(_root: string, filePath: string): Promise<string> {
  if (!filePath.endsWith(FILE_EXTENSION)) {
    throw new Error(".md 파일만 복제할 수 있습니다")
  }

  // "원본 (복사본).md" → "원본 (복사본 2).md" → "원본 (복사본 3).md" ...
  const parts = filePath.replace(/\\/g, "/").split("/")
  const fileName = parts.pop()!
  const baseName = fileName.replace(/\.md$/, "")
  const parent = parts.join("/")

  let candidate = parent ? `${parent}/${baseName} (복사본).md` : `${baseName} (복사본).md`
  let counter = 2
  while (await fileExists(candidate)) {
    candidate = parent
      ? `${parent}/${baseName} (복사본 ${counter}).md`
      : `${baseName} (복사본 ${counter}).md`
    counter++
  }

  if (isPathMode()) {
    await api("copyFile", { filePath, destPath: candidate })
  } else {
    const handle = ensureRoot()
    const srcHandle = await getFile(handle, filePath)
    if (!srcHandle) throw new Error("원본 파일을 찾을 수 없습니다")
    const content = await (await srcHandle.getFile()).text()

    const destFileHandle = await getOrCreateFile(handle, candidate)
    const writable = await destFileHandle.createWritable()
    await writable.write(content)
    await writable.close()
  }
  return candidate
}
```

**보조 함수** — `fileExists` 추가 필요:
```typescript
async function fileExists(filePath: string): Promise<boolean> {
  if (isPathMode()) {
    try { await api("readFile", { filePath }); return true } catch { return false }
  }
  const handle = ensureRoot()
  try {
    const parts = filePath.replace(/\\/g, "/").split("/")
    const fileName = parts.pop()!
    const dir = await getSubDir(handle, parts, false)
    if (!dir) return false
    await dir.getFileHandle(fileName)
    return true
  } catch { return false }
}
```

#### 3.1.3 `route.ts` — `copyFile` action 추가

- `Action` 유니온에 `"copyFile"` 추가
- switch case:
  ```typescript
  case "copyFile":
    await server.copyFile(root, body.filePath, body.destPath)
    return ok(true)
  ```

#### 3.1.4 `file-tree-node.tsx` — 파일 컨텍스트 메뉴에 추가

파일 노드 컨텍스트 메뉴의 이름 변경 위에 "복제본 만들기" 버튼 추가:

```tsx
<button
  onClick={ctxDuplicate}
  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors"
>
  <Copy className="size-4" />
  <span>복제본 만들기</span>
</button>
```

`ctxDuplicate` 핸들러:
```typescript
const ctxDuplicate = useCallback(async () => {
  if (!contextMenu || contextMenu.nodeType !== "file") return
  try {
    const newPath = await duplicateFile("", contextMenu.nodePath)
    toast.success(`복제본 생성: ${newPath.split("/").pop()}`)
    setContextMenu(null)
    reload()
  } catch (e) {
    toast.error("복제본 생성 실패", { description: String(e) })
  }
}, [contextMenu, reload])
```

#### 3.1.5 `file-tree-actions.tsx` — `FileNodeActions`에 추가

기존 `handleRename`, `handleDelete`와 동일 패턴으로 `handleDuplicate` 핸들러 + 메뉴 항목 추가:

```typescript
const handleDuplicate = useCallback(async () => {
  try {
    const newPath = await duplicateFile("", nodePath)
    toast.success(`복제본 생성: ${newPath.split("/").pop()}`)
    reload()
  } catch (e) {
    toast.error("복제본 생성 실패", { description: String(e) })
  }
  setShowMenu(false)
}, [nodePath, reload])
```

메뉴에 "복제본 만들기" 버튼 (이름 변경 위에) + `Copy` 아이콘

### 3.2 빈 곳 우클릭 → 새 폴더 / 새 파일

**변경 파일:**

| 파일 | 변경 내용 |
|------|-----------|
| `src/components/file-tree/file-tree.tsx` | 루트 div에 `onContextMenu` + 컨텍스트 메뉴 렌더링 |

#### 3.2.1 상태 관리

```typescript
const [bgContextMenu, setBgContextMenu] = useState<{ x: number; y: number } | null>(null)
```

#### 3.2.2 `onContextMenu` 핸들러

루트 `<div>`에 추가:
```tsx
onContextMenu={(e) => {
  // 노드 위가 아닌 빈 곳에서만 동작
  if ((e.target as HTMLElement).closest("[data-file-tree-node]")) return
  e.preventDefault()
  setBgContextMenu({ x: e.clientX, y: e.clientY })
}}
```

**주의사항**: `FileTreeNode`에서 `onContextMenu`가 `e.stopPropagation()`을 호출하므로, 노드 우클릭 시 루트 핸들러가 발동하지 않는다. 하지만 만약을 위해 `data-file-tree-node` 속성으로 노드 여부를 추가 검증한다.

#### 3.2.3 빈 곳 컨텍스트 메뉴 JSX

```tsx
{bgContextMenu && (
  <>
    <div className="fixed inset-0 z-40" onClick={() => setBgContextMenu(null)} />
    <div
      className="fixed z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-lg"
      style={{ left: bgContextMenu.x, top: bgContextMenu.y }}
    >
      <button onClick={handleBgNewFolder} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors">
        <FolderPlus className="size-4" />
        <span>새 폴더</span>
      </button>
      <button onClick={handleBgNewFile} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted transition-colors">
        <FileText className="size-4" />
        <span>새 파일</span>
      </button>
    </div>
  </>
)}
```

#### 3.2.4 핸들러

```typescript
const handleBgNewFolder = useCallback(async () => {
  const name = window.prompt("새 폴더 이름:")
  if (!name) return
  try {
    await createDirectory("", name)
    toast.success("폴더 생성 완료")
    setBgContextMenu(null)
    reload()
  } catch (e) {
    toast.error("폴더 생성 실패", { description: String(e) })
  }
}, [reload])

const handleBgNewFile = useCallback(async () => {
  const name = window.prompt("새 파일 이름:", "새 파일.md")
  if (!name) return
  if (!name.endsWith(FILE_EXTENSION)) {
    toast.error("파일 이름은 .md로 끝나야 합니다")
    return
  }
  try {
    await createFile("", name)
    toast.success("파일 생성 완료")
    setBgContextMenu(null)
    reload()
  } catch (e) {
    toast.error("파일 생성 실패", { description: String(e) })
  }
}, [reload])
```

#### 3.2.5 ESC 키로 닫기

기존 `useEffect` 키보드 핸들러에 ESC 처리 추가:
```typescript
if (e.key === "Escape") {
  setBgContextMenu(null)
}
```

---

## 4. 구현 순서

| 순서 | 작업 내용 | 의존 |
|------|-----------|------|
| 1 | `fs/server.ts`에 `copyFile` 함수 추가 | - |
| 2 | `route.ts`에 `copyFile` action 추가 | 1 |
| 3 | `fs-access.ts`에 `fileExists` + `duplicateFile` 함수 추가 | 2 |
| 4 | `file-tree-node.tsx`에 파일 컨텍스트 메뉴 "복제본 만들기" 추가 | 3 |
| 5 | `file-tree-actions.tsx` `FileNodeActions`에 "복제본 만들기" 추가 | 3 |
| 6 | `file-tree.tsx`에 빈 곳 우클릭 핸들러 + 컨텍스트 메뉴 추가 | - |
| 7 | 타입 체크 (`tsc --noEmit`) | 1-6 |

---

## 5. 영향도 분석

### 변경 파일 목록

| 파일 경로 | 변경 유형 | 설명 |
|-----------|-----------|------|
| `src/lib/fs/server.ts` | 수정 | `copyFile` 함수 추가 |
| `src/app/api/fs/route.ts` | 수정 | `copyFile` action 타입 + switch case |
| `src/lib/fs-access.ts` | 수정 | `fileExists` + `duplicateFile` 함수 추가 |
| `src/components/file-tree/file-tree-node.tsx` | 수정 | 파일 컨텍스트 메뉴에 "복제본 만들기" + `ctxDuplicate` 핸들러 |
| `src/components/file-tree/file-tree-actions.tsx` | 수정 | `FileNodeActions`에 "복제본 만들기" + `handleDuplicate` |
| `src/components/file-tree/file-tree.tsx` | 수정 | 빈 곳 우클릭 핸들러 + 컨텍스트 메뉴 렌더링 |

### 검증 대상 (변경 불필요)

| 파일 경로 | 검증 내용 |
|-----------|-----------|
| `src/lib/fs-access.ts` | `createFile`, `createDirectory` 기존 동작 확인 |
| `src/components/file-tree/file-tree-context.tsx` | `reload` 콜백 동작 확인 |

---

## 6. 테스트/검증 계획

| # | 시나리오 | 검증 방법 |
|---|----------|-----------|
| T1 | 파일 우클릭 → "복제본 만들기" → 새 파일 생성 | "원본 (복사본).md" 파일이 같은 폴더에 생성됨 |
| T2 | "원본 (복사본).md" 존재 상태에서 다시 복제 → 번호 증가 | "원본 (복사본 2).md" 생성됨 |
| T3 | 파일 "..." 버튼 → "복제본 만들기" → 새 파일 생성 | 드롭다운 메뉴에서 동작 확인 |
| T4 | 복제된 파일 내용이 원본과 동일한지 확인 | 두 파일 내용 비교 |
| T5 | 빈 곳 우클릭 → "새 폴더" → 폴더 생성 | 루트에 새 폴더 생성됨 |
| T6 | 빈 곳 우클릭 → "새 파일" → 파일 생성 | 루트에 새 .md 파일 생성됨 |
| T7 | 노드 위 우클릭 시 빈 곳 메뉴 미표시 | 컨텍스트 메뉴가 겹치지 않음 |
| T8 | ESC 키로 빈 곳 컨텍스트 메뉴 닫힘 | 메뉴 사라짐 |

---

## 7. 리스크 및 제약

| 리스크 | 영향 | 대응 |
|--------|------|------|
| `fileExists`가 Path 모드에서 `readFile` 호출로 존재 여부 확인 — 성능 오버헤드 | 낮음 | 파일 하나만 확인하므로 무시할 수준 |
| `copyFile` API가 fs 모듈의 `copyFile` 사용 — 심볼릭 링크 등 특수 케이스 | 낮음 | MD 파일만 대상으로 제한 |
| 빈 곳 우클릭 시 `data-file-tree-node` 속성 미존재하면 메뉴 겹침 | 중간 | 노드 div에 해당 속성 추가 확인 필요 |
| `FileTreeNode`의 `stopPropagation`이 빈 곳 핸들러와 충돌 | 낮음 | 의도대로 동작 — 노드에서 멈추고, 빈 곳에서만 루트 핸들러 발동 |

---

## 실행 로그(수행일·작업자)

| 단계 | 작업 내용 | 완료일 | 결과 |
|------|-----------|--------|------|
| 1 | `fs/server.ts`에 `copyFile` 함수 추가 | 2026-07-27 | ✅ |
| 2 | `route.ts`에 `copyFile` action 추가 | 2026-07-27 | ✅ |
| 3 | `fs-access.ts`에 `fileExists` + `duplicateFile` 함수 추가 | 2026-07-27 | ✅ |
| 4 | `file-tree-node.tsx` 파일 컨텍스트 메뉴 "복제본 만들기" 추가 | 2026-07-27 | ✅ |
| 5 | `file-tree-actions.tsx` `FileNodeActions`에 "복제본 만들기" 추가 | 2026-07-27 | ✅ |
| 6 | `file-tree.tsx` 빈 곳 우클릭 핸들러 + 컨텍스트 메뉴 추가 | 2026-07-27 | ✅ |
| 7 | `tsc --noEmit` 타입 체크 | 2026-07-27 | ✅ (에러 0) |
