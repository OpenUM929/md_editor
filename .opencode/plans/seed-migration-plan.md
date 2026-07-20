# 빌드 시 자동 마이그레이션 (Seed) 계획

> 날짜: 2026-07-13
> 목표: 기존 `content/` 디렉토리의 .md 파일을 빌드 시 정적 에셋으로 만들고, 최초 방문 시 클라이언트가 IndexedDB에 자동 시드. 런타임 서버 불필요.

## 변경 내용

### 1. 시드 생성 스크립트 `scripts/build-seed.mjs` (신설)
- `content/` 를 재귀 순회
- `.temp` 디렉토리 및 하위 전체 스킵
- 확장자가 `.md` 인 파일만 포함
- 상대 경로 보존 (예: `index.md`, `subdir/note.md`)
- 출력: `public/seed-documents.json`
  ```json
  { "documents": [ { "path": "index.md", "content": "..." }, ... ] }
  ```

### 2. `package.json` build 스크립트 수정
- 기존: `node scripts/build-templates.mjs && next build --webpack`
- 변경: `node scripts/build-templates.mjs && node scripts/build-seed.mjs && next build --webpack`
- (templates 생성 패턴과 동일하게 prebuild 단계에서 실행)

### 3. `src/lib/db.ts` — 신규 함수 불필요
- 이미 존재하는 `importDocuments(files: {path, content}[])` 재사용
- `isDbEmpty()` 재사용

### 4. 시드 클라이언트 컴포넌트 `src/components/migration/seed-documents.tsx` (신설)
- `"use client"`
- 마운트 시 1회 실행:
  1. `localStorage.getItem("md_editor_seeded")` 체크 → 있으면 아무것도 안 함
  2. `isDbEmpty()` → 비어있지 않으면 플래그만 세우고 종료
  3. 비어있으면 `fetch("/seed-documents.json")` → `importDocuments(json.documents)`
  4. `localStorage.setItem("md_editor_seeded", "1")`
  5. 성공 시 `toast.success("기존 문서를 불러왔습니다")`
- 렌더링: `null` (사이드 이펙트 전용)
- 의존성: `isDbEmpty`, `importDocuments` (db.ts), `toast` (sonner)

### 5. 레이아웃에 마운트
- `src/app/(markdown)/layout.tsx`의 `MarkdownLayoutInner` 내부 (TabProvider 안, SidebarInner와 함께) `<SeedDocuments />` 추가
- 또는 `src/app/layout.tsx` 루트에 마운트. (markdown 레이아웃이 앱 진입점이므로 거기에 배치)

### 6. `RootFolderSelector` 동작 정리
- 첫 방문 자동 Import 다이얼로그는 시드가 담당하므로 제거(또는 시드 실패 시 fallback)
- "가져오기" 버튼은 유지 → 사용자가 추가 파일을 나중에 넣을 수 있게 (수동 Import UI)

### 7. 파일 트리 갱신 회귀 수정 (마이그레이션 중 발생한 버그)
- 증상: `file-tree-actions.tsx`가 `router.refresh()` 사용 → 서버 컴포넌트 시대의 갱신 방식. 현재 트리는 클라이언트 `useEffect([root])`로 로드되므로, 파일/폴더 생성·삭제·이름변경 후 **트리가 자동 갱신되지 않음**.
- 해결: `FileTreeContext`(또는 커스텀 이벤트)로 `reload()` 제공.
  - `src/components/file-tree/file-tree-context.tsx` (신설): `{ reload: () => void }` 컨텍스트 + Provider가 트리 로드 상태/reload 보유
  - `file-tree.tsx`: 트리 로드 로직을 이 컨텍스트 안으로 이동, `reload()` 노출
  - `file-tree-actions.tsx` (`FileTreeActions`, `FileNodeActions`): `router.refresh()` → `useFileTree().reload()` 로 교체, `useRouter`/`useSearchParams` 불필요 부분 정리
- 결과: "새 폴더"/"새 파일" 생성 시 트리에 즉시 반영됨 (PWA에서 폴더 생성 기능 정상 동작 확인)

### 8. 검증
- `npm run build` → `public/seed-documents.json` 생성 확인, SW 번들링 통과
- `npm run dev` → 최초 방문 시 `content/` 파일들이 파일 트리에 표시되는지 확인
- localStorage `md_editor_seeded` 플래그로 재시드 방지 확인 (모든 문서 삭제 후 재방문해도 시드 안 됨)
- 빈 DB 상태에서 수동 Import 버튼 동작 확인
- **파일 트리 갱신**: "새 폴더" 클릭 → 트리에 즉시 폴더 노드 표시, "새 파일"/삭제/이름변경 후 트리 갱신 확인

## 예상 영향
- 신설: `scripts/build-seed.mjs`, `src/components/migration/seed-documents.tsx`, `src/components/file-tree/file-tree-context.tsx`, `public/seed-documents.json`(생성됨)
- 수정: `package.json`(build), `src/app/(markdown)/layout.tsx`(시드 마운트), `src/components/file-tree/root-folder-selector.tsx`(자동 다이얼로그 제거), `src/components/file-tree/file-tree.tsx`(컨텍스트 적용), `src/components/file-tree/file-tree-actions.tsx`(reload 교체)
- 재사용: `db.ts`의 `importDocuments`, `isDbEmpty`, `createDirectory`(폴더 생성 이미 동작)

