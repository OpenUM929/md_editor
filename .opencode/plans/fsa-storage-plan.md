# File System Access API 기반 실제 디스크 저장 + 기본 폴더 선택 흐름

> 날짜: 2026-07-13
> 상태: 계획 (plan mode)
> 저장 방식 결정: **File System Access API (실제 디스크 폴더)** — 이전 "빌드 시 자동 마이그레이션(IndexedDB 시드)" 선택을 대체.
> 브라우저: Chrome/Edge(Chromium) 전용. Firefox/Safari는 미지원 → 안내 메시지.

## 1. 저장 모듈 전환: `db.ts`(IndexedDB) → `fs-access.ts`(FSA)
- 삭제 대상: `src/lib/db.ts` (문서/디렉토리 스토어 불필요)
- 신설: `src/lib/fs-access.ts` — **기존 `db.ts`와 동일한 함수 시그니처**로 export (컴포넌트 import 교체만으로 동작)

### export 목록 (시그니처 유지)
```
getFileTree(_root?) -> { tree, error? }
readMdFile(_root, filePath) -> string
saveMdFile(_root, filePath, html) -> void
autoSaveTemp(_root, filePath, html) -> void
getRecoveryInfo(_root, filePath) -> { tempContent, originalContent } | null
applyTempToOriginal(_root, filePath) -> { success, error? }
discardTempFile(_root, filePath) -> void
createFile(_root, filePath) -> void
createDirectory(_root, dirPath) -> void
deleteFile(_root, filePath) -> void
renameFile(_root, oldPath, newPath) -> void
addDocumentFromTemplate(filePath, content) -> void
importDocuments(files: {path, content}[]) -> void
```

### FSA 내부 구현
- 모듈 레벨 `rootHandle: FileSystemDirectoryHandle | null`
- `getStoredHandle()`: IndexedDB(`md_editor_meta`, key `rootHandle`)에서 복원. 핸들은 structured-clone 가능 → IndexedDB 저장 권장.
- `requestRootFolder()`: `window.showDirectoryPicker()` 호출 (사용자 제스처 필요)
- `verifyPermission(handle, 'readwrite')`: `handle.queryPermission/requestPermission` 으로 쓰기 권한 확보
- 경로 탐색: `getSubHandle(handle, segments[])` 로 하위 dir/file 접근
- **문서 트리**: `rootHandle` 재귀 순회, `.md` 만 수집 → `buildFileTree()` 로 `FileTreeNode[]` 생성 (기존 로직 재사용)
- **읽기**: `getFile().text()` → 마크다운
- **쓰기**: `htmlToMd(html)` → `createWritable()` 로 디스크 기록
- **자동저장 임시본**: 디스크의 `.temp/<filename>.md.tmp` + `.meta` (원본 `fs-server` 동작과 동일). 복구/적용/삭제는 이 파일 기준.
- **핸들 영속화**: 별도 초소형 IndexedDB(`md_editor_meta`)에 `rootHandle` 저장. 복원 후 `verifyPermission('readwrite')`; 거부되면 설정 모달 재노출.

## 2. 첫 방문 기본 폴더 선택 팝업
- 신설: `src/components/workspace/folder-setup.tsx`
  - 마운트 시 `getStoredHandle()` 확인 → 유효(권한 OK)하면 진행
  - 없으면 모달 노출:
    - 텍스트: "기본 폴더를 `C:\dev\md_editor\md files`(으)로 사용할까요?"
    - 버튼: **[기본 폴더 사용]** / **[직접 선택]**
    - 둘 다 내부적으로 `window.showDirectoryPicker()` 호출 (보안상 경로 사전지정 불가 → 안내 문구로 제안 경로 표시, 사용자가 직접 그 폴더 선택)
    - 선택 직후 `verifyPermission('readwrite')` → **테스트 쓰기**(임시 `.md` 생성 후 즉시 삭제)로 실제 쓰기 가능 확인
    - 실패/권한 거부/쓰기 불가 → "폴더를 직접 선택해 주세요" 메시지 + 재시도 유도 (**요구사항 2**: C폴더 등 접근 불가 시 사용자 선택 강제)
  - FSA 미지원(`'showDirectoryPicker' in window` 거짓): "이 브라우저는 폴더 접근을 지원하지 않습니다 (Chrome/Edge 권장)" 표시. (선택적 IndexedDB 폴백은 별도 논의)
- `WorkspaceProvider` (context) 로 `rootHandle` + `ready` 상태 제공. 레이아웃에 마운트.
- `ready` 가 아니면 앱 대신 폴더 설정 모달만 표시.

## 3. 컴포넌트 import 전환 (`@/lib/db` → `@/lib/fs-access`)
- 대상: `src/app/(markdown)/[[...path]]/page.tsx`, `src/components/file-tree/file-tree.tsx`, `src/components/file-tree/file-tree-actions.tsx`(FileTreeActions/FileNodeActions), `src/components/tab/doc-tab-content.tsx`, `src/app/(markdown)/[[...path]]/editor-page.tsx`, `src/hooks/use-auto-save.ts`, `src/components/file-tree/root-folder-selector.tsx`, `src/components/migration/import-content.tsx`, `src/lib/templates-client.ts`(addDocumentFromTemplate)
- `root` 파라미터는 계속 무시(저장은 `rootHandle` 사용) — 시그니처 그대로라 수정 최소화

## 4. 파일 트리 갱신 회귀 수정 (마이그레이션 중 발생)
- `file-tree-actions.tsx` 가 `router.refresh()` 사용 → 클라이언트 트리 갱신 안 됨.
- 신설: `src/components/file-tree/file-tree-context.tsx` — `{ reload: () => void }` 제공.
- `file-tree.tsx`: 트리 로드를 컨텍스트로 이동, `reload()` 노출.
- `file-tree-actions.tsx`: `router.refresh()` → `useFileTree().reload()`. `useRouter`/`useSearchParams` 불필요 부분 정리.
- 결과: "새 폴더"/"새 파일"/삭제/이름변경 후 트리 즉시 갱신.

## 5. Import 다이얼로그 처리
- **요구사항 3 확인**: 1·2항(기본 폴더 선택 팝업)을 첫 실행 흐름으로 구성하면 별도의 "파일 가져오기" 자동 팝업은 **뜨지 않음**.
- 사이드바 "가져오기" 버튼은 유지 → 다중 파일/폴더 선택 시 `fs-access.importDocuments()` 로 현재 폴더에 복사.
- `import-content.tsx` 는 폴더 선택 로직만 남기고(자동 팝업 트리거 제거), 수동 버튼용으로 유지.

## 6. 빌드/정리
- `scripts/build-templates.mjs` 유지 (템플릿 정적화는 앱 에셋)
- `scripts/build-seed.mjs` 및 시드 컴포넌트 **제거** (FSA가 폴더에서 직접 읽으므로 불필요). `package.json` build 스크립트에서 seed 단계 제거 → `node scripts/build-templates.mjs && next build --webpack`
- 삭제: `src/lib/db.ts`, `scripts/build-seed.mjs`(존재 시), 시드 컴포넌트(존재 시)

## 7. 검증
- **Chrome/Edge**:
  - 첫 방문 → 기본 폴더 팝업 → 폴더 선택 → 해당 폴더의 `.md` 가 트리에 표시
  - 파일/폴더 생성·삭제·이름변경 → 디스크에 실제 반영 + 트리 갱신
  - 편집 → 자동저장 → `.temp/*.md.tmp` 생성, 새로고침 후 복구 다이얼로그 동작
  - 새로고침 → 핸들 유지(재선택 불필요, 권한만 재확인)
  - FSA 미지원 브라우저 → 안내 메시지 확인
- `npm run build` → `public/templates.json` 생성 + SW 번들링 통과
- lint 통과

## 예상 영향 파일
- 신설: `src/lib/fs-access.ts`, `src/components/workspace/folder-setup.tsx`, `src/components/workspace/workspace-provider.tsx`(context), `src/components/file-tree/file-tree-context.tsx`
- 수정: 위 import 전환 컴포넌트 다수, `src/app/(markdown)/layout.tsx`(provider + 모달 마운트), `package.json`(build 스크립트 seed 제거)
- 삭제: `src/lib/db.ts`, `scripts/build-seed.mjs`(존재 시), 시드 컴포넌트(존재 시)
