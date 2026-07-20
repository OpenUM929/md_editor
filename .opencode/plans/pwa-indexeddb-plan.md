# PWA 전환 계획: IndexedDB 기반 클라이언트 저장소

> 상태: 계획 단계 (plan mode)
> 날짜: 2026-07-13
> 목표: 별도 백엔드 데이터 서버 없이 동작하는 PWA. 앱 셸·코드·템플릿은 기존 Next.js 배포로 제공/업데이트되고, 문서 데이터는 클라이언트 IndexedDB에 저장.

## 1. 결정 사항 (확정)
- **데이터 저장소**: 클라이언트 IndexedDB (`idb`)
- **기존 `content/` 데이터**: 최초 실행 시 IndexedDB로 가져오는 **Import UI** 제공
- **앱 호스팅**: 기존 Next.js 배포 유지 (Vercel/정적 호스팅). Service Worker가 배포 감지→앱 셸/템플릿 갱신
- **PWA 툴링**: Serwist (`@serwist/next`) — App Router + Turbopack 지원

## 2. 현재 아키텍처 문제점
데이터 레이어 전체가 서버 사이드 Node.js `fs`에 종속:
- `src/lib/fs-server.ts:1-3` — `"use server"` + `node:fs/promises`로 서버 `content/` 직접 R/W
- `src/app/api/files/route.ts` — Route Handler도 서버 `fs`
- `src/lib/folder-picker.ts:1-3` — 서버에서 PowerShell `FolderBrowserDialog` (Windows 전용)
- `src/lib/template-server.ts:1-3` — 서버에서 `templates/` 디렉토리 읽기
- `src/app/(markdown)/[...path]/page.tsx:11` — Server Component가 서버 `fs`로 초기 내용 로드
- `use-auto-save.ts:4,43` — 서버 `autoSaveTemp` 호출

→ 이 4개 서버 모듈 + API route + Server Component를 클라이언트 등가물로 교체해야 함.

## 3. 목표 아키텍처
```
브라우저
├─ 앱 셸/JS/CSS  ← Next.js 배포 (URL, SW 캐시, 배포 시 갱신)
├─ /templates.json ← 빌드 시 생성된 정적 에셋 (배포 시 갱신)
└─ IndexedDB
   ├─ documents  (path → {content, updatedAt})   ← 실제 마크다운 저장
   └─ drafts     (path → {content, meta})         ← 자동저장 임시본/복구
```
- 문서는 "가상 경로"(`a/b/c.md`)로 관리. 폴더는 `/` 구분에서 암묵적 파생.
- 외부 백엔드 서버/DB 불필요. 오프라인에서도 전부 동작.

## 4. 작업 단계

### Phase 1 — 공용 타입/상수 정리
- `FileTreeNode` 타입을 `src/lib/fs-server.ts`에서 `src/lib/types.ts`로 이동 (UI 임포트가 서버 모듈에 의존하지 않도록)
- `src/lib/constants.ts` 수정:
  - `DEFAULT_ROOT` 제거 또는 가상 루트(`"workspace"`)로 변경
  - IndexedDB 관련 상수 추가 (`DB_NAME`, `STORE_DOCUMENTS`, `STORE_DRAFTS`)

### Phase 2 — IndexedDB 데이터 레이어 (`src/lib/db.ts`) 신설
- `idb` 의존성 추가 (`npm i idb`)
- 스토어: `documents`, `drafts`
- 기존 서버 API 시그니처와 호환되는 비동기 함수 제공:
  - `getFileTree()` → 가상 경로에서 트리 구성
  - `readMdFile(path)`, `saveMdFile(path, html)` (html→md 변환은 `markdown.ts` 재사용)
  - `autoSaveTemp(path, html)`, `getRecoveryInfo(path)`, `applyTempToOriginal(path)`, `discardTempFile(path)`
  - `createFile(path)`, `createDirectory(path)`, `deleteFile(path)`, `renameFile(old, new)`
- 텍스트 인코딩/사이즈 검증은 기존 상수(`MAX_FILE_SIZE_BYTES` 등) 재사용
- `htmlToMd`가 브라우저 호환인지 확인 (turndown/marked 기반). 불가 시 `src/lib/markdown.ts`를 클라이언트용으로 분리

### Phase 3 — 템플릿 정적화
- `scripts/build-templates.mjs` (Node, `gray-matter`) 신설:
  - `templates/**/*.md` 읽기 → frontmatter 파싱 → `public/templates.json` 생성
  - `package.json`에 `"prebuild": "node scripts/build-templates.mjs"` 추가
- `src/lib/templates-client.ts` 신설:
  - `getTemplates()` → `/templates.json` fetch 후 그룹화 (기존 `TOPIC_DISPLAY`/`topicOrder` 로직 이식)
  - `getTemplateContent(slug)`, `createFileFromTemplate(slug, fileName)` → IndexedDB에 작성
- `src/lib/template-server.ts` 삭제

### Phase 4 — Import UI (기존 content/ 마이그레이션)
- `src/components/migration/import-content.tsx` 신설:
  - 최초 실행 감지(IndexedDB `documents` 비어 있음 + localStorage 플래그) 시 모달 노출
  - 사용자가 `.md` 파일들을 선택(`<input type="file" multiple accept=".md">`) → IndexedDB `documents`에 일괄 작성 (경로는 파일명 기준)
  - "나중에 하기" 선택 가능
- (선택) 과거 `content/` Export 번들을 업로드하는 방식 병행

### Phase 5 — 루트/폴더 선택기 교체
- `src/lib/folder-picker.ts` 삭제
- `src/components/file-tree/root-folder-selector.tsx`:
  - PowerShell 브라우즈 제거
  - IndexedDB 기반 워크스페이스 스위처(또는 단일 기본 워크스페이스)로 단순화
  - 기존 "최근 경로" 히스토리(localStorage)는 워크스페이스명으로 대체하거나 제거

### Phase 6 — 소비자 컴포넌트 클라이언트화
- `src/app/(markdown)/[...path]/page.tsx`: Server Component → Client Component 전환
  - 초기 내용/복구를 `db.ts`에서 로드. `?path=` 딥링크 라우팅 유지
  - `readMdFile`/`getRecoveryInfo` 서버 호출 제거
- `src/components/file-tree/file-tree.tsx`: `getFileTree` → 클라이언트 API, `router.refresh()` 대신 로컬 상태 갱신
- `src/components/file-tree/file-tree-actions.tsx`: `createFile/createDirectory/deleteFile/renameFile` → 클라이언트 API
- `src/components/file-tree/file-tree-node.tsx`: 타입 import만 `types.ts`로
- `src/components/tab/doc-tab-content.tsx`, `src/components/(markdown)/[...path]/editor-page.tsx`: `saveMdFile/applyTempToOriginal/discardTempFile` → 클라이언트 API
- `src/hooks/use-auto-save.ts`: 서버 `autoSaveTemp` 호출 제거, IndexedDB `drafts` 저장 (localStorage 중복 저장은 유지/간소화)
- 템플릿 컴포넌트 4종 (`template-tab`, `template-browser-modal`, `template-detail-modal`, `template-preview-tab`): `template-server` → `templates-client`
- `src/lib/tab-context.tsx`: `TemplateMeta` 타입 import만 새 모듈로

### Phase 7 — 서버 전용 모듈 제거
- 삭제: `src/lib/fs-server.ts`, `src/lib/template-server.ts`, `src/lib/folder-picker.ts`, `src/app/api/files/route.ts`
- 관련 `"use server"` 지시문 모두 제거

### Phase 8 — PWA 스캐폴딩
- `public/manifest.webmanifest` 신설:
  ```json
  {
    "name": "MD Editor",
    "short_name": "MD Editor",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#ffffff",
    "icons": [
      { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
      { "src": "/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
    ]
  }
  ```
- `src/app/layout.tsx`: `<link rel="manifest" href="/manifest.webmanifest">`, theme-color meta, apple-touch-icon 추가
- Serwist 적용:
  - `npm i @serwist/next`
  - `src/app/sw.ts` (또는 `app/sw.ts`): 앱 셸 precache + 네비게이션 오프라인 폴백 + `/templates.json`·에셋 런타임 캐시
  - `next.config.ts`를 `withSerwist`로 래핑 (출력 SW 경로 설정)
  - 브라우저에서 자동 SW 등록(Serwist가 생성한 registration script 주입)

### Phase 9 — 검증
- `npm run build` 성공, `npm run lint` 통과
- 기능 점검:
  - URL 접근 → 앱 로드, 설치 프롬프트 노출
  - 오프라인(DevTools Offline)에서 새로고침 → 앱 셸 정상 동작
  - 파일 생성/편집/자동저장/복구 다이얼로그/삭제/이름변경
  - 템플릿 목록·생성
  - Import UI로 기존 `.md` 가져오기
- 배포 프리뷰: 새 템플릿 추가 후 재배포 → SW 갱신으로 클라이언트에 자동 반영 확인
- Playwright e2e: 오프라인 시나리오 추가

## 5. 위험/주의
- `gray-matter`는 빌드(Node)에서만 사용, 클라이언트 번들에 포함되지 않도록 주의
- `markdown.ts`의 `htmlToMd`가 브라우저 호환인지 확인 (turndown 브라우저 지원, marked 지원) — 불가 시 분리
- IndexedDB 용량/quota: 마크다운 기준 충분. 백업용 "Export JSON" 기능 권장(별도 이슈)
- Import UI는 파일 선택 기반(서버 경로 개념 소멸). 과거 `content/` 디렉토리 접근 불가하므로 업로드 방식 채택

## 6. 예상 변경 파일
- 신설: `src/lib/types.ts`, `src/lib/db.ts`, `src/lib/templates-client.ts`, `src/app/sw.ts`, `scripts/build-templates.mjs`, `public/templates.json`(생성), `public/manifest.webmanifest`, 아이콘 PNG, `src/components/migration/import-content.tsx`
- 수정: `next.config.ts`, `package.json`(prebuild, deps), `src/lib/constants.ts`, `src/lib/markdown.ts`(필요시), `src/app/layout.tsx`, `page.tsx`, `file-tree*.tsx`(3개), `doc-tab-content.tsx`, `editor-page.tsx`, `use-auto-save.ts`, 템플릿 컴포넌트 4종, `tab-context.tsx`
- 삭제: `src/lib/fs-server.ts`, `src/lib/template-server.ts`, `src/lib/folder-picker.ts`, `src/app/api/files/route.ts`
