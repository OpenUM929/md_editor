# 계획서 — 좌측 메뉴 + 퀵 메뉴 기능 개선

> 상태: Pre-Done | 작성일: 2026-07-27 | 완료일: 2026-07-27
> 작업 유형: B (기능 개선/신규 기능)

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-27 | 최초 작성 | 좌측 메뉴 우클릭 폴더 생성 + 폴더 이동, 이미지 삽입 다방식 지원, 키보드 단축키 추가 |
| 2026-07-27 | §3.2, §7 | 폴더 간 드래그앤드롭 이동 불가 버그 발견 및 fix — `moveFile`이 `.md` 검증이 있는 `renameFile`에 모든 항목을 넘겨 폴더 이동 실패 |

---

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | 좌측 파일 트리에서 폴더를 우클릭하면 "새 폴더" 메뉴가 표시되는가? | Y | |
| 1.2 | "새 폴더" 선택 시 해당 폴더 하위에 새 디렉토리가 생성되는가? | Y | |
| 1.3 | 파일/폴더를 다른 폴더 위로 드래그앤드롭하면 이동되는가? | Y | |
| 1.4 | 폴더를 다른 폴더 안으로 드래그앤드롭하면 그 폴더 하위로 이동되는가? | Y | |
| 2.1 | 에디터에서 이미지 삽입 시 URL 입력 외에 로컬 파일 선택이 가능한가? | Y | |
| 2.2 | 에디터 영역에 이미지를 드래그앤드롭하면 삽입되는가? | Y | |
| 2.3 | 슬래시 커맨드 팝업에서 이미지 선택 시 파일 선택 다이얼로그가 열리는가? | Y | |
| 2.4 | 퀵 메뉴에 키보드 단축키가 존재하는가? | Y | |
| 2.5 | 툴바의 이미지 버튼 클릭 시 파일 선택 다이얼로그가 열리는가? | Y | |

---

## 1. 배경 및 목적

MD Editor의 좌측 파일 트리와 에디터 퀵 메뉴(슬래시 커맨드)의 사용성 개선이 필요하다.

**좌측 메뉴 문제:**
- 폴더 우클릭 시 "새 폴더" 생성 옵션이 없음 → 상위 폴더에서만 폴더 생성 가능
- 파일/폴더 간 드래그앤드롭 이동이 폴더→폴더 간에 정상 동작하지 않음

**퀵 메뉴 문제:**
- 이미지 삽입이 HTTP URL 입력(`window.prompt`)에만 의존 → 로컬 파일 선택 불가
- 에디터에 이미지 드래그앤드롭 시 삽입되지 않음
- 퀵 메뉴에 키보드 단축키 없음

---

## 2. 현재 시스템 분석

### 2.1 좌측 파일 트리

- **파일 트리 루트**: `D:\dev\md_editor\md_editor\src\components\file-tree\file-tree.tsx` — `FileTree` 컴포넌트
- **트리 노드**: `D:\dev\md_editor\md_editor\src\components\file-tree\file-tree-node.tsx` — `FileTreeNode` 컴포넌트
- **트리 작업 메뉴**: `D:\dev\md_editor\md_editor\src\components\file-tree\file-tree-actions.tsx`
  - `FileTreeActions`: 상단 "새로 만들기" 드롭다운 (새 파일/새 폴더) — 루트 레벨만
  - `FolderNodeActions`: 폴더 "..." 메뉴 — 새 파일, 이름 변경, 삭제
  - `FileNodeActions`: 파일 "..." 메뉴 — 이름 변경, 삭제
- **파일 시스템**: `D:\dev\md_editor\md_editor\src\lib\fs-access.ts`
  - `createDirectory(basePath: string, dirPath: string): Promise<string>` (line 508)
  - `moveFile(from: string, to: string): Promise<void>` (line 639)
  - `renameFile(from: string, to: string): Promise<void>`
  - `renameDirectory(from: string, to: string): Promise<void>`
- **드래그앤드롭**: `file-tree-node.tsx`의 `handleDrop`에서 `moveFile()` 호출
  - `moveFile()`은 내부적으로 `renameFile()`을 사용하여 파일/폴더 이동
  - 드래그 MIME: `application/x-md-editor-path`, `application/x-md-editor-paths`
- **우클릭 컨텍스트 메뉴**: `file-tree-node.tsx:79-87` — 커스텀 구현 (shadcn/ui 미사용)
  - 디렉토리: 가져오기, 폴더 위치 열기, 이름 변경, 삭제
  - 파일: 파일 위치 열기, 이름 변경, 삭제

**현재 폴더 컨텍스트 메뉴 항목 (`file-tree-node.tsx:304-326`):**
```
디렉토리 우클릭 시:
- 가져오기 (ImportContent 다이얼로그)
- 폴더 위치 열기 (path 모드일 때만)
- 이름 변경
- 삭제
→ "새 폴더" 옵션 없음
```

### 2.2 에디터 이미지 삽입

- **툴바 이미지 버튼**: `D:\dev\md_editor\md_editor\src\components\editor\editor-toolbar.tsx:155-162`
  ```typescript
  const insertImage = useCallback(() => {
    const url = window.prompt("이미지 URL을 입력하세요:", "https://")
    if (url) ed.chain().focus().setImage({ src: url }).run()
  }, [])
  ```
  → URL prompt만 지원, 파일 선택 없음

- **슬래시 커맨드 이미지**: `D:\dev\md_editor\md_editor\src\components\editor\slash-command-popup.tsx:26-29`
  ```typescript
  { title: "Image", description: "이미지 삽입", icon: "🖼",
    command: (e) => {
      const url = window.prompt("이미지 URL:")
      if (url) e.chain().focus().setImage({ src: url }).run()
    }}
  ```
  → 동일하게 URL prompt만 지원

- **이미지 확장**: `D:\dev\md_editor\md_editor\src\components\editor\extensions\resolved-image.ts` — 커스텀 Image 확장 (`data-canonical-src`)
- **이미지 해상도**: `D:\dev\md_editor\md_editor\src\lib\doc-image.ts` — 상대 경로를 `/api/asset` URL로 변환
- **에셋 서빙**: `D:\dev\md_editor\md_editor\src\app\api\asset\route.ts` — 워크스페이스 바이너리 파일 서빙

### 2.3 키보드 단축키

- **현재 단축키**: `D:\dev\md_editor\md_editor\src\components\editor\tiptap-editor.tsx:181-198`
  - `Ctrl+S`: 저장
  - `/`: 빈 단락 시작에서 슬래시 커맨드 팝업 열기
- **글로벌 단축키**: `tiptap-editor.tsx:325-330` — `Ctrl+P`: 인쇄/PDF
- **이미지/링크 관련 단축키 없음**

---

## 3. 구현 상세

### 3.1 좌측 메뉴 — 우클릭 폴더 생성

**변경 파일**: `D:\dev\md_editor\md_editor\src\components\file-tree\file-tree-actions.tsx`, `D:\dev\md_editor\md_editor\src\components\file-tree\file-tree-node.tsx`

**변경 내용:**
1. `FolderNodeActions`(`file-tree-actions.tsx:197`)에 "새 폴더" 핸들러 + 메뉴 항목 추가
2. 우클릭 컨텍스트 메뉴(`file-tree-node.tsx:304`)에도 "새 폴더" 옵션 추가

**FolderNodeActions 변경 (`file-tree-actions.tsx`):**
- `handleNewSubFolder` 핸들러 추가
  - `window.prompt("새 폴더 이름:")`으로 이름 입력
  - `createDirectory("", ${nodePath}/${name})` 호출 (`fs-access.ts:508`)
  - 성공 시 `toast.success("폴더 생성 완료")` + `reload()`
- 기존 `handleNewSubFile`과 동일 패턴의 새 메뉴 항목 + `FolderPlus` 아이콘

**컨텍스트 메뉴 변경 (`file-tree-node.tsx:304-326`):**
- 디렉토리 우클릭 메뉴에 "새 폴더" 버튼 추가 (가져오기 위에)
- 같은 `createDirectory` 로직 적용

### 3.2 좌측 메뉴 — 폴더 간 드래그앤드롭 이동

**변경 파일**: `D:\dev\md_editor\md_editor\src\components\file-tree\file-tree-node.tsx`

**현재 구현 분석:**
- `handleDragStart`(`line 89-100`): `effectAllowed: "move"` — 정상
- `handleDrop`(`line 102-145`): `moveFile()` 호출 — 정상
- `moveFile`(`fs-access.ts:639`): `renameFile()` 기반 이동 — 정상
- 자기 자신/하위 폴더 드롭 방지 검증 — 정상 (`node.path.startsWith(${sp}/`)
- 드롭 후 자동 expand — 정상 (`setExpanded(true)`)

**추가 검증 및 개선:**
1. 실제 드래그앤드롭 동작 재현 테스트 → 원인 확인 완료 (아래 §7 리스크 참조)
2. 드롭 실패 시 사용자 피드백 향상 (현재 `toast.error` — 충분)
3. 다중 파일 선택 후 드래그 시 시각적 피드백 개선 (opacity)
4. Path 모드와 FSA 모드 양쪽에서 동작 확인

**[버그 발견 — 폴더 드래그앤드롭 이동 실패 원인]**
- `moveFile`(`fs-access.ts:639`)이 파일/폴더 구분 없이 항상 `renameFile`을 호출
- `renameFile`(`fs-access.ts:547`)에 `newPath.endsWith(FILE_EXTENSION)` 검증이 있어 폴더 경로(`manual/iso/images`) 통과 불가 → Error throw
- `handleDrop`의 catch 블록에서 에러를 조용히 `failed++`만 하고 토스트도 미출력
- **픽스**: `moveFile`에서 `normalized.endsWith(FILE_EXTENSION)` 여부로 분기 — 파일이면 `renameFile`, 폴더면 `renameDirectory` 호출

### 3.3 이미지 삽입 — 로컬 파일 선택 지원

**변경 파일:**
- `D:\dev\md_editor\md_editor\src\components\editor\editor-toolbar.tsx` — 툴바 이미지 버튼
- `D:\dev\md_editor\md_editor\src\components\editor\slash-command-popup.tsx` — 슬래시 커맨드 이미지

**구현 방식 — 통합 파일 선택 + URL 입력:**

#### 3.3.1 툴바 이미지 삽입 개선

기존 `insertImage`(`line 155`)을 확장:
1. 숨겨진 `<input type="file" accept="image/*">` 요소를 컴포넌트 내에 생성
2. 이미지 버튼 클릭 시:
   - **드롭다운 방식**: "파일 선택" / "URL 입력" 두 옵션 제공
   - 파일 선택 → `<input>.click()` 트리거
   - URL 입력 → 기존 `window.prompt` 유지
3. 파일 선택 후 처리:
   - **Path 모드**: `POST /api/fs` (`action: "writeBinary"`)로 현재 문서의 `img.` 디렉토리에 저장
   - **FSA 모드**: `FileSystemFileHandle`로 `img.${문서명}/` 폴더에 저장
   - 저장 후 상대 경로로 `editor.chain().focus().setImage({ src: relativePath }).run()`
4. `data-canonical-src` 속성 설정 (기존 `resolved-image.ts` 호환)

#### 3.3.2 슬래시 커맨드 이미지 개선

`ITEMS` 배열의 Image 항목(`line 26`) 커맨드를 확장:
1. `window.prompt` 대신 파일 선택 + URL 선택 분리
2. 방법 A: 팝업 내에서 "파일" / "URL" 선택 후 분기
3. 방법 B: Image 항목 선택 시 파일 다이얼로그 기본, Shift+Enter로 URL 모드
4. 파일 선택 시 동일한 저장 로직 적용 (3.3.1과 공유)

### 3.4 에디터 드래그앤드롭 이미지 삽입

**변경 파일**: `D:\dev\md_editor\md_editor\src\components\editor\tiptap-editor.tsx`

ProseMirror 드롭 핸들러 추가:
1. `editorProps.handleDrop` 핸들러 구현
2. 드롭된 `DataTransfer`에서 이미지 파일 추출
3. 이미지 MIME 타입 검증 (PNG, JPG, GIF, WebP, SVG, BMP, AVIF)
4. 처리 흐름:
   - 현재 문서 경로 확인
   - `img.${문서명}/` 디렉토리에 이미지 저장
   - 충돌 방지: 파일명 + 타임스탬프 조합
   - 저장 후 `editor.chain().focus().setImage({ src: relativePath }).run()`

### 3.5 퀵 메뉴 단축키

**변경 파일**: `D:\dev\md_editor\md_editor\src\components\editor\tiptap-editor.tsx`

**추가 단축키:**

| 단축키 | 기능 | 구현 위치 |
|--------|------|-----------|
| `Ctrl+Shift+I` | 이미지 삽입 다이얼로그 | `handleKeyDown` |
| `Ctrl+K` | 링크 삽입 다이얼로그 | `handleKeyDown` |
| `Ctrl+/` | 슬래시 커맨드 팝업 열기 | `handleKeyDown` |

**단축키 충돌 방지:**
- `Ctrl+I`: Tiptap에서 italic 사용 → `Ctrl+Shift+I`로 회피
- `Ctrl+K`: Tiptap 기본 매핑 없음 → 사용 가능
- `Ctrl+/`: 브라우저 기본 동작 없음 → 사용 가능

**이미지 삽입 단축키 구현:**
- `handleKeyDown`에서 `Ctrl+Shift+I` 감지
- 에디터 컴포넌트 내 숨겨진 `<input type="file">`을 `.click()`으로 트리거
- 파일 선택 후 저장 + 삽입 로직은 3.3과 동일

---

## 4. 구현 순서

| 순서 | 작업 내용 | 의존 |
|------|-----------|------|
| 1 | FolderNodeActions에 "새 폴더" 메뉴 추가 (`file-tree-actions.tsx`) | - |
| 2 | 컨텍스트 메뉴에 "새 폴더" 옵션 추가 (`file-tree-node.tsx`) | 1 |
| 3 | 폴더 간 드래그앤드롭 이동 동작 검증 + 필요시 수정 | - |
| 4 | 숨겨진 file input 컴포넌트 공통 유틸 생성 | - |
| 5 | 툴바 이미지 삽입 — 파일 선택 다이얼로그 추가 (`editor-toolbar.tsx`) | 4 |
| 6 | 슬래시 커맨드 이미지 — 파일 선택 모드 추가 (`slash-command-popup.tsx`) | 4 |
| 7 | 에디터 드래그앤드롭 이미지 삽입 구현 (`tiptap-editor.tsx`) | 4 |
| 8 | 키보드 단축키 추가 — 이미지/링크/슬래시 (`tiptap-editor.tsx`) | 5, 6 |
| 9 | 전체 통합 테스트 | 1-8 |

---

## 5. 영향도 분석

### 변경 파일 목록

| 파일 경로 | 변경 유형 | 설명 |
|-----------|-----------|------|
| `src/components/file-tree/file-tree-actions.tsx` | 수정 | FolderNodeActions에 "새 폴더" 핸들러 + 메뉴 항목 |
| `src/components/file-tree/file-tree-node.tsx` | 수정 | 컨텍스트 메뉴에 "새 폴더" 추가, 드래그 개선 |
| `src/components/editor/editor-toolbar.tsx` | 수정 | 이미지 삽입을 URL prompt → 파일 선택 다이얼로그로 확장 |
| `src/components/editor/slash-command-popup.tsx` | 수정 | 이미지 커맨드에 파일 선택 모드 추가 |
| `src/components/editor/tiptap-editor.tsx` | 수정 | 글로벌 단축키 추가, 드래그앤드롭 이미지 핸들러 추가 |

### 검증 대상 (변경 불필요 가능성 높음)

| 파일 경로 | 검증 내용 |
|-----------|-----------|
| `src/lib/fs-access.ts` | `createDirectory`, `moveFile` 동작 확인 |
| `src/app/api/fs/route.ts` | `writeBinary` 액션 존재/동작 확인 |
| `src/components/editor/extensions/resolved-image.ts` | `data-canonical-src` 호환 확인 |
| `src/lib/doc-image.ts` | 이미지 경로 해상도 호환 확인 |

---

## 6. 테스트/검증 계획

| # | 시나리오 | 검증 방법 |
|---|----------|-----------|
| T1 | 폴더 우클릭 → "새 폴더" → 이름 입력 → 폴더 생성 | 파일 트리에서 새 폴더 확인, 새로고침 시 유지 |
| T2 | 파일을 폴더 위로 드래그 → 이동 | 파일이 대상 폴더 하위로 이동, 원위치에서 제거 |
| T3 | 폴더를 다른 폴더 위로 드래그 → 이동 | 폴더 전체가 대상 폴더 하위로 이동 |
| T4 | 자기 자신/하위 폴더로 드래그 → 이동 방지 | 에러 토스트 표시 |
| T5 | 툴바 이미지 → 파일 선택 → 이미지 삽입 | 에디터에 이미지 표시, 마크다운 저장 시 경로 확인 |
| T6 | 슬래시 `/` → Image → 파일 선택 → 삽입 | 팝업에서 이미지 선택 시 파일 다이얼로그 |
| T7 | 이미지 파일 에디터에 드래그 → 삽입 | 드롭 시 이미지가 에디터에 삽입 |
| T8 | `Ctrl+K` → 링크 삽입 다이얼로그 | URL 입력 후 링크 삽입 |
| T9 | `Ctrl+/` → 슬래시 팝업 열기 | 빈 단락에서 팝업 표시 |
| T10 | `Ctrl+Shift+I` → 이미지 파일 선택 | 파일 다이얼로그 열림 → 선택 시 삽입 |
| T11 | 기존 이미지 경로 해상도 — 재로드 후 이미지 표시 | `data-canonical-src` 정상 동작 확인 |

---

## 7. 리스크 및 제약

| 리스크 | 영향 | 대응 |
|--------|------|------|
| `Ctrl+I` 충돌 — Tiptap italic 단축키와 충돌 | 높음 | `Ctrl+Shift+I`로 회피 |
| 대용량 이미지 드래그 시 성능 저하 | 중간 | 파일 크기 제한(10MB), API 저장 방식 채택 |
| FSA 모드에서 이미지 저장 시 권한 요청 | 중간 | 기존 `getOrCreateFile` 패턴 재사용 |
| Path 모드에서 `writeBinary` API 미존재 시 | 낮음 | 구현 전 `src/app/api/fs/route.ts` 확인 필수 |
| 드래그앤드롭 이동의 근본 원인 미확인 | 높음 | [해결] `moveFile`이 폴더를 `renameFile`에 전달 → `.md` 검증 실패. `renameDirectory`로 분기 처리 완료 |

---

## 실행 로그(수행일·작업자)

> 구현 완료 후 기록
