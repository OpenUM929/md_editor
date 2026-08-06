# MD Editor — 개발 가이드 (AI 에이전트 전용)

> 이 문서는 AI 코딩 에이전트가 `md_editor` 프로젝트에서 작업할 때 반드시 준수해야 하는 **MD Editor 전용 규칙**만 담는다. 범용 개발 지식은 포함하지 않는다.
> 시작 전 반드시 `AGENTS.md` → `clinerules/core/00-core.md` 분류표를 확인하고 작업 유형 문서로 이동한다.

---

## 1. 프로젝트 개요 (디렉토리 기준)

- 대상: `D:\dev\md_editor\md_editor` (Next.js 16 앱 라우터 + React 19 + Tiptap 3 + Tailwind 4 + Shadcn)
- 에디터 페이지: `src/app/(markdown)/[[...path]]/page.tsx`, `editor-page.tsx`
- 전역 레이아웃: `src/app/(markdown)/layout.tsx`, `src/app/layout.tsx`
- 서버 API(Route Handler): `src/app/api/**/route.ts` (`asset`, `fs`, `export/docx`, `export/hwpx`)
- 서비스 로직: `src/lib/**` — 순수 로직(브라우저/서버 의존 없이 가능한 것 위주)
- 컴포넌트: `src/components/{editor,file-tree,tab,workspace,template,migration,ui}/**`
- 훅: `src/hooks/{use-auto-save,use-page-flow}.ts`
- 설정/빌드: `next.config.ts`, `tsconfig.json`, `scripts/build-templates.mjs`, `playwright.config.ts`

### 디렉토리 규칙

| 경로 | 허용 | 금지 |
|------|------|------|
| `src/app/**` | 페이지/Route Handler, 폴더 기반 라우팅 | 비즈니스 로직 몰아넣기 |
| `src/lib/**` | 순수 로직, 파일 시스템 추상화, 직렬화 | UI(JSX) 코드 |
| `src/components/**` | 프레젠테이션/프레젠테이션 로직 | 파일 경로 하드코딩 |
| `src/hooks/**` | 리액트 훅 | — |
| `templates/**` | 문서 템플릿(`.md`, 프론트매터 포함) | 템플릿 외 파일 |
| `public/**` | 정적 자산(`templates.json`, `sw.js`는 빌드 산출물) | 수작업으로 직접 편집 금지 |

---

## 2. 핵심 파일 상호작용 (다중 파일 연동 필수)

```
templates/*.md ──build-templates.mjs──▶ public/templates.json
              ◀─src/lib/templates-client.ts── reads
```

1. **템플릿 추가/수정/삭제** 시 `templates/<topic>/*.md`만 바꾸고 `public/templates.json`을 직접 편집하지 **않는다.** `npm run dev`/`npm run build`가 `scripts/build-templates.mjs`를 먼저 실행해 재생성한다. 서버 재시작 후 `public/templates.json`이 갱신됐는지 확인한다.

2. **마크다운 ↔ HTML 왕복** 변경 시 반드시 아래 4파일을 함께 보아야 한다 (한쪽만 고치면 회귀):
   - `src/lib/markdown.ts` — `htmlToMd`(turndown 규칙) / `mdToHtml`(marked + 확장) / 프론트매터 왕복 / heading directive / GFM 테이블 / 페이지분할 / 이미지 canonical
   - `src/lib/import-image-relocation.ts` — 이미지 상대경로 정리
   - `src/lib/page-mode.ts`, `src/lib/document-attributes.ts`(있으면) — 페이지 모드 관련

3. **에디터 HTML은 Tiptap이 `template` 노드를 스키마 구성 요소로 인식 못 해 버린다.** 저장/자동저장 직전 반드시 `injectFrontmatter()`를 호출해 프론트매터를 `data-frontmatter` template 노드로 심고, `htmlToMd()`가 이를 복원한다. 이 왕복(저장→프론트매터 복원)을 깨뜨리지 않도록 `markdown.ts`의 `FRONTMATTER_TEMPLATE_RE`/`injectFrontmatter`/`frontmatterFromMarkdown`을 함께 검토한다.

4. **파일 저장 계층** 변경 시 3곳을 함께 갱신한다:
   - `src/lib/fs/server.ts` — 서버 경로 모드 실제 IO
   - `src/app/api/fs/route.ts` — action 디스패치(문자열 action 목록)
   - `src/lib/fs-access.ts` — 클라이언트 브라우저(FSA) + 경로 모드 래퍼 `api<T>()`
   - `src/lib/constants.ts` — 파일 확장자/임시 디렉토리/제한 상수

5. **두 저장 모드**
   - **FSA(폴더 선택)**: `showDirectoryPicker()`로 얻은 `FileSystemDirectoryHandle` 사용. `api()` fetch는 쓰지 않음. 브라우저 샌드박스라 절대경로 없음.
   - **경로 모드(path mode)**: 모듈레벨 `rootPath`가 켜져 있고 `isPathMode()`가 true. 모든 IO는 `fetch("/api/fs")`의 `api<T>(action, extra)`로 처리.
   - 기능 추가 시 반드시 **두 모드 모두** 동작하도록 분기 코드(`isPathMode() ? api(...) : FSA 코드`)를 넣는다. 한쪽만 고치면 안 된다.

6. **이미지 에셋 서빙**: 화면 표시 `src`는 `/api/asset?root=<root>&path=<workspace상대경로>` (`src/app/api/asset/route.ts`). 이 경로는 **세션/표시 전용**이며, `.md` 파일에는 `data-canonical-src`의 원본 상대경로를 저장한다. `markdown.ts`의 `imageCanonical` 규칙이 저장 시 되돌린다. 저장/표시 경로 불일치가 생기면 `doc-image.ts`(`resolveImageSrcs`) 및 import-relocation까지 함께 확인한다.

---

## 3. 기능 구현 표준 (에디터 중심)

### 저장/자동저장 단계 (순서 고정)
자동저장 기능 수정 시 다음 순서를 지킨다:
1. `use-auto-save.ts` → `autoSaveTemp()` (임시 `.md.tmp` 저장, debounce 2s / throttle 10s)
2. 명시 저장 → `saveMdFile()` (htmlToMd 후 `.md` 기록)
3. 성공 시 `discardTempFile()` 로 임시파일 정리
4. 복구: `getRecoveryInfo()` — 원본과 다른 만큼만 복구 대상으로 판정(정규화 후 텍스트 비교). 동일한 stale 임시파일은 정리하고 null 반환.

### Tiptap 확장 (src/components/editor/extensions/)
- 사용자 지정 노드(페이지분할, 헤딩 스타일, 테이블 너비 등)는 `extensions/`에 모아 둔다.
- **직렬화 불변식 유지**: 노드를 추가할 때 반드시 `markdown.ts`에 왕복 규칙(turndown + marked)을 함께 둔다. 저장 후 로드했을 때 원복이 깨지는 회귀 테스트를 Playwright로 둔다.
- 자동/수동 페이지 나눔: **자동(auto)은 소스에 저장하지 않는다.** `data-auto="true"`면 저장 시 빈 문자열로 직렬화(`pageBreak` 규칙).

### 4단계 헤딩 스타일
- 개별 헤딩 스타일(강조 바 색/두께, 크기, 굵기)은 `// <!- heading: k=v k=v →` 디렉티브 주석으로 저장 후 `applyHeadingDirectives()`가 복원한다. 스타일 없는 헤딩은 해당 규칙이 걸리지 않으므로 회귀 없음. 헤딩 직렬화 변경 시 이 왕복 양쪽을 함께 고친다.

---

## 4. 코드 표준

- **주석 금지**: 상용 코드에 설명 주석을 새로 달지 않는다. 단, 기존 특수 직렬화 규칙(turndown/marked)처럼 "어려운 왕복 로직"에는 왜 그렇게 했는지 한 줄 이유 주석을 유지한다(삭제 금지).
- **경로**: 항상 `@/` alias로 import(`@/lib/...`, `@/components/...`). 상대 `../../` 나열은 최소화한다.
- **상수**: 마법값(제한, 확장자, 디렉토리명, prefix, debounce/throttle ms)은 `src/lib/constants.ts`에 모은다. 코드 내 하드코딩 금지. 새 상수는 반드시 `constants.ts`로.
- **백엔드 경로 보안**: path mode의 `safeRoot`/`safePath`를 반드시 통과시켜 루트 이탈/트래버설을 차단한다. 새로운 fs action을 추가하면 `server.ts`에 같은 경로 검증을 넣고, 없는 파일은 오류(`string`)를 던져 `api()`가 `throw`하도록 한다.

---

## 5. 빌드 / 테스트 / 린트

| 작업 | 명령 | 주의 |
|------|------|------|
| 개발 서버 | `npm run dev` | `scripts/build-templates.mjs` 자동 실행 후 `next dev` |
| 빌드 | `npm run build` | `scripts/build-templates.mjs` + `next build --webpack` + Serwist(`next.config.ts`의 production 분기) |
| 린트 | `npm run lint` (= `eslint`) | 수정 후 반드시 실행 |
| 타입체크 | `npx tsc --noEmit` | 코드 수정 후 반드시 실행 |
| E2E | `npx playwright test` | `e2e/`, `playwright.config.ts` 사용. 에디터 왕복/저장 회귀 검증에 활용 |

- `dev`는 production 설정이 아니므로 `allowedDevOrigins`(`10.10.102.223`) 항목을 건드리지 않는다. 없으면 유지, 있으면 수정하지 않는다.
- `npm run dev` 도중 `public/templates.json`이 옛 값이면 `scripts/build-templates.mjs` 실행 후 서버 재시작으로 확인한다.

---

## 6. AI 결정 표준

우선순위(상위가 항상 이김):
1. **공통/금지 규칙** — `AGENTS.md`, `clinerules/core/00-core.md`
2. **회귀 방지** — 기존 왕복(저장↔로드, 표시↔소스) 불변식을 깨는 변경은 최우선 재검토
3. **이중 모드 완결성** — FSA + path mode 모두 동작
4. **구조 준수** — `src/app|lib|components|hooks` 경계 유지
5. **린트/타입 통과** — `npm run lint` + `tsc --noEmit`

모호하면(예: "수정하라"만 주어짐) 질문 전에 먼저 관련 파일을 재귀 분석해 유추 지점을 나열하고 제안한다.

---

## 7. 금지 사항

- `public/templates.json` **수작업 편집 금지** — 반드시 `build-templates.mjs` 경유.
- `next.config.ts`의 `allowedDevOrigins` 임의 수정 금지.
- `src/lib/fs/server.ts`의 경로 검증(`safeRoot`/`safePath`) 우회 금지.
- 상용 코드에 주석 신규 삽입 금지(특수 직렬화 이유 주석은 예외 허용, 삭제 금지).
- 마법값을 코드에 직접 하드코딩 금지 — `constants.ts` 사용.
- **경로 모드만 또는 FSA만 고치는 편향 코드 금지** — 기능은 두 모드에서 모두 동작해야 한다.
- 에디터 직렬화 왕복(html↔md, 프론트매터, heading directive, 이미지 canonical, GFM 테이블, 페이지분할)을 한쪽 파일만 고쳐 깨뜨리지 않는다.
- `node_modules/`, 빌드 산출물(`.next/`, `public/sw.js`)을 직접 편집 금지.
- 다른 프로젝트(`project.json`상 wordcloud 등)의 소스/규칙 폴더를 수정하지 않는다.