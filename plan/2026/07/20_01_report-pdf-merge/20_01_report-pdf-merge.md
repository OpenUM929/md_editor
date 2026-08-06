# rp_gen 보고서 양식·PDF 출력을 md_editor로 통합

> 상태: Todo | 작성일: 2026-07-20
> 작업 유형: B (기능 개선/신규 기능)
> 선행: plan/2026/07/14_01_print-feature (Done), plan/2026/07/15_01_a4-mode-restore (Done)

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-20 | 최초 작성 | rp_gen의 보고서 양식 + Chrome print-to-pdf를 md_editor에 이식, rp_gen 편집 기능은 제외 |
| 2026-07-21 | §2 원자질문 4.4~4.6, §3.6 추가 | md_editor 템플릿 전체를 rp_gen처럼 CSS 양식으로 렌더하되 편집은 Tiptap WYSIWYG 유지(사용자 요청) |

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | 문서 편집 방식은 md_editor의 Tiptap WYSIWYG를 그대로 쓰는가? | Y | 미검증 |
| 1.2 | rp_gen의 블록 클릭 인라인 편집(`app.js`)을 이식하는가? | N | 미검증 |
| 1.3 | rp_gen의 `md_blocks.serialize`/`replace_block`/`delete_block`(편집용 재조립)을 이식하는가? | N | 미검증 |
| 1.4 | rp_gen의 `md_blocks.parse`(마크다운→양식 HTML 렌더러)는 이식 대상인가? | Y | 미검증 |
| 2.1 | 문서 목록·파일 트리·탭·자동저장·복구는 md_editor 것을 유지하는가? | Y | 미검증 |
| 2.2 | rp_gen의 `DOC_GLOB` 고정 4개 문서 목록 방식을 쓰는가? | N | 미검증 |
| 3.1 | PDF는 헤드리스 Chrome `--print-to-pdf`(벡터)로 생성되는가? | Y | 미검증 |
| 3.2 | 기존 html2canvas+jsPDF 래스터 경로(`pdf-export-preview.tsx`)는 폐기하는가? | Y | 미검증 |
| 3.3 | PDF 쪽수와 화면 미리보기 쪽수가 일치하는가? | Y | 미검증 |
| 4.1 | 보고서 양식이 편집 화면(Tiptap)에도 보이는가(WYSIWYG)? | Y | 미검증 |
| 4.2 | 양식을 문서마다 다르게 고를 수 있는가? | Y | 미검증 |
| 4.3 | 양식 선택값은 저장 후 재열기에도 보존되는가? | Y | 미검증 |
| 4.4 | 기존 md_editor 템플릿 5종 전체가 rp_gen처럼 CSS 양식으로 렌더되는가? | Y | 미검증 |
| 4.5 | 양식이 입혀진 상태에서 글자·표를 Tiptap으로 그 자리에서 수정할 수 있는가? | Y | 미검증 |
| 4.6 | 양식 CSS는 편집 화면(`.a4-canvas .ProseMirror`)·인쇄(`.print-pages`)·PDF(`.pdf-preview-sheet`) 세 곳에 동일 적용되는가? | Y | 미검증 |
| 5.1 | 편집 없이 열었다 저장하면 원본 마크다운과 동일한가(왕복 무결성)? | Y | 미검증 |
| 5.2 | 페이지 분할이 표 중간을 자를 때 헤더를 반복하는가? | Y | 미검증 |

> §14 절차에 따라 위 표의 "기대"는 작성자 선이해이며, 사용자 확인 후 구현에 들어간다.
> "작업 후 답"은 구현·검증 완료 시 근거(파일:라인, 테스트명)와 함께 채운다. 미검증 상태로 Done 불가.

---

## 1. 배경 및 목적

두 도구가 서로의 약점을 정확히 보완한다.

| 영역 | md_editor | rp_gen | 채택 |
|------|-----------|--------|------|
| 편집 | Tiptap WYSIWYG, 탭·파일트리·자동저장·복구 | 블록 클릭 인라인 편집 | **md_editor** |
| 문서 관리 | File System Access + `/api/fs` 서버 폴백, 템플릿 5종 | `DOC_GLOB` 하드코딩 4개 | **md_editor** |
| 보고서 양식 | 일반 마크다운 prose | `report.css` 표준양식(1.pdf 실측) | **rp_gen** |
| 페이지 분할 | 좌표 추정 후 pageBreak 노드 삽입 | 실측(`getBoundingClientRect`) 후 분할 | **rp_gen** |
| PDF 출력 | html2canvas → jsPDF 래스터 | Chrome `--print-to-pdf` 벡터 | **rp_gen** |

**목적**: md_editor의 편집·문서관리를 정본으로 두고, rp_gen의 양식·분할·PDF 출력만 이식해 단일 Next.js 앱으로 완성한다. rp_gen의 편집 계층은 이식하지 않는다.

### 1.1 현재 PDF 경로의 결함 (코드 검증 완료)

`src/components/editor/pdf-export-preview.tsx:34` — `new jsPDF({ format: [widthMm, heightMm] })`.
`heightMm`이 **문서 전체 높이**이므로 결과물은 A4가 아니라 *문서 길이만큼 긴 1페이지*다. 내용은 `html2canvas`가 만든 JPEG(`toDataURL("image/jpeg", 0.92)`, `pdf-export-preview.tsx:43`)이라 텍스트 선택·검색·인쇄 품질이 모두 없다. 사용자가 "rp_gen의 PDF 출력이 원하는 것에 가깝다"고 한 것은 이 결함의 반영으로 본다.

### 1.2 이식 대상 원본 (코드 검증 완료)

| rp_gen 파일 | 검증된 내용 | 처리 |
|-------------|-------------|------|
| `static/report.css` (136줄) | `.r-title`(22pt 제목박스) `.r-headline` `.r-kpi` `.r-badge`(`#1B1760`) `.r-sec`/`.r-sub`/`.r-sub4` `.r-b1`/`.r-b2`(개조식) `.r-tbl` `.r-code` `.r-img`, `@page{size:A4;margin:0}` | **이식** (편집·인쇄 공용 CSS) |
| `static/paginate.js` (170줄) | `Paginator.paginate()` — 눈금자 DOM 실측, `splitTable()` 행 단위 분할 + 헤더 반복, 제목 고아 방지, 대형 이미지 축소 | **이식** (TS 포팅) |
| `export_pdf.py` (81줄) | `find_browser()` `html_to_pdf()` `page_count()` | **이식** (Node 포팅) |
| `templates/print.html` (41줄) | 이미지 로드 대기 후 분할, `data-ready="1"` / `data-pages` 신호 | **이식** (인쇄 라우트) |
| `md_blocks.py` `parse()` (55행~) | 마크다운 → 양식 HTML 렌더러 | **부분 이식** (§3.3) |
| `md_blocks.py` `serialize()`(295) `replace_block()`(358) `delete_block()`(363) | 블록 편집용 마크다운 재조립 | **제외** (사용자 요구) |
| `static/app.js` (432줄) | 블록 인라인 편집·동기화 | **제외** (사용자 요구) |
| `app.py` `DOC_GLOB`(38) 및 문서 API | 고정 4개 문서 목록 | **제외** (md_editor 파일트리가 대체) |

---

## 2. 현재 시스템 분석 (코드 검증 완료)

### 2.1 md_editor 스택

- Next.js 16.2.10 / React 19.2.4 / Tiptap 3.27.3 / Tailwind 4. `package.json` 확인.
- **서버 런타임 존재**: `src/app/api/fs/route.ts` — `Action` 유니온 12종(`readFile` `writeFile` `writeMd` `getFileTree` `validateRoot` `ensureRoot` `createFile` `createDirectory` `deleteFile` `renameFile` `writeTemp` `readTemp` `discardTemp`), 구현은 `src/lib/fs/server.ts`. **정적 export가 아니므로 서버 측 Chrome 구동이 가능하다** — §3.4의 전제.
- `next.config.ts` — production에서만 `withSerwist` 적용, `allowedDevOrigins: ["10.10.102.223"]`.

### 2.2 A4·페이지 관련 기존 자산

| 파일 | 검증된 심볼 |
|------|-------------|
| `src/lib/page-mode.ts` | `PageMode = "wide" \| "ilche" \| "bunri"`, `pageModeFromMarkdown()`, `pageModeFromHtml()` — **프론트매터에서 모드를 읽는 패턴이 이미 존재** (§3.5가 이 패턴을 확장) |
| `src/lib/a4-margins.ts` | `A4_MARGIN_PRESETS`(very-narrow/narrow/medium), `MarginPresetId`, `mmToPx()`, `getPrintableHeight()`, `A4_DIMENSIONS` |
| `src/lib/markdown.ts` | `htmlToMd()` `mdToHtml()`, `PAGE_BREAK_TOKEN = "---pb---"`, turndown 규칙 `pageBreak`, marked 확장 `pagebreak` — 페이지 분할 왕복 직렬화 완비 |
| `src/hooks/use-auto-page-break.ts` | `useAutoPageBreak(editor, pageMode, marginValues)` — `pageMode !== "bunri"`면 무동작 |
| `src/components/editor/tiptap-editor.tsx` | `.print-pages`(285), `window.print()`(239), `PdfExportPreview` 마운트(291) |
| `src/components/editor/editor-toolbar.tsx` | 여백 프리셋 셀렉트(282), Print 버튼 `window.print()`(304) |
| `src/app/globals.css` | `.a4-canvas`(170) `.a4-sheets`(177) `.a4-canvas--ilche`(200), `@media print`(325) `@page{size:A4;margin:0}`(326) |

### 2.3 기존 자동 분할의 한계 (코드 검증 완료)

`use-auto-page-break.ts:36` — `expectedBreaks = ceil(contentHeight / PAGE_HEIGHT_PX) - 1`.
**전체 높이를 페이지 높이로 나눈 몫**으로 쪽수를 추정한 뒤, 좌표(`coordsAtPos`)로 삽입 위치를 찾는다. 블록이 경계에 걸치면 실제 쪽수와 어긋나고, 표는 분할 대상이 아니라 통째로 밀린다. rp_gen `paginate.js`는 반대로 **블록을 실제로 그려 높이를 재고**(`measure()`) 누적이 넘칠 때 끊으므로 추정 오차가 없다. 이 교체가 §3.2의 핵심이다.

또한 현재 방식은 **자동 분할 결과를 Tiptap 문서에 `pageBreak` 노드로 써넣는다**(`use-auto-page-break.ts:86` `tr.insert(pos, pageBreakType.create({ auto: true }))`). 자동 분할이 문서 본문을 오염시키므로, 여백·양식을 바꾸면 노드가 재계산되며 왕복 무결성(원자질문 5.1)의 위험원이 된다. §3.2에서 **자동 분할은 표시 계층으로 옮기고, 문서에는 사용자가 명시 삽입한 `pageBreak`만 남긴다**.

---

## 3. 구현 상세

### 3.1 보고서 양식 CSS 이식 — `src/app/report-theme.css` (신규)

- `rp_gen/static/report.css`의 **양식 규칙만** 옮긴다. 이식 제외 대상:
  - `.blk` `.ed` `.colgrip` `.blk-tools` `.bt-del` (101~125행) — rp_gen 인라인 편집 UI. 요구사항 1.2에 따라 제외.
  - `.page` `.pno` (11~28행) — md_editor의 `.a4-canvas`/`.a4-sheets`가 이미 담당. 치수(`--page-w:210mm` `--content-h:255mm`)와 본문 타이포(15pt/27pt)만 CSS 변수로 흡수.
- 셀렉터는 `.report-theme` 스코프 아래로 넣어 일반 문서에 영향이 없게 한다.
- `globals.css`의 `@media print`(325~)와 충돌 검토 필수: 양쪽 다 `@page{size:A4;margin:0}`을 선언하므로 **한쪽으로 단일화**한다.

### 3.2 실측 페이지 분할 — `src/lib/paginate.ts` (신규)

`paginate.js`를 TS로 포팅한다. 이식할 검증된 로직:

| 원본 함수 | 동작 | 포팅 방침 |
|-----------|------|-----------|
| `mm(v)` | 100mm div를 그려 px 환산율 측정 | `a4-margins.ts`의 `mmToPx()`와 **중복** → `mmToPx()`로 통일 (§영향도) |
| `makeRuler()` | 화면 밖 168mm 측정용 컨테이너 | 그대로. 폭은 여백 프리셋에서 계산 |
| `measure(node)` | `getBoundingClientRect().height` 실측 | 그대로 |
| `splitTable(el, ruler, remaining)` | 표를 행 단위로 쪼개고 `thead` 복제로 헤더 반복 | 그대로 (원자질문 5.2 근거) |
| `paginate(blocks, host)` | 누적 높이 초과 시 개페이지, 제목 고아 방지(`+mm(22)`), 대형 이미지 축소 | 그대로 |

- **입력 형식 변경**: 원본은 `md_blocks.parse()`가 만든 `{id, kind, html}` 배열을 받는다. md_editor는 Tiptap HTML을 쓰므로, HTML을 최상위 요소 단위로 훑어 동등한 블록 배열을 만드는 어댑터가 필요하다. `kind`는 `pagebreak`/`heading`/`badge`/`image`/`table`/기타로 판정(원본이 이 5종만 특별 취급).
- **자동 분할은 표시 전용**: 결과 페이지는 미리보기·인쇄 DOM에만 반영하고 Tiptap 문서에는 쓰지 않는다. `use-auto-page-break.ts`는 이 엔진 호출로 대체하며, `pageBreak` **노드 삽입 로직(52~89행)은 제거**한다. 사용자가 툴바로 삽입한 `pageBreak`는 문서에 남고 `PAGE_BREAK_TOKEN`으로 계속 왕복한다(`markdown.ts` 기존 동작 유지).

### 3.3 양식 렌더러 — `src/lib/report-blocks.ts` (신규, 부분 이식)

`md_blocks.parse()`가 마크다운을 양식 클래스로 바꾸는 규칙 중, **마크다운만으로 표현 가능한 것**을 md_editor의 marked 파이프라인(`markdown.ts`)에 확장으로 옮긴다.

| 양식 요소 | rp_gen 근거 | md_editor 이식 방식 |
|-----------|-------------|---------------------|
| `.r-title` 제목박스 | `md_blocks.py:83` (`# ` → `.r-title`) | CSS만으로 가능 — `.report-theme h1`에 스타일 부여 |
| `.r-sec`/`.r-sub`/`.r-sub4` | `md_blocks.py:180` (`##`/`###`/`####`) | CSS만으로 가능 — `.report-theme h2/h3/h4` |
| `.r-tbl` 표 | 표 렌더 | CSS만으로 가능 — `.report-theme table` |
| `.r-headline` 원페이퍼 결론 | `md_blocks.py:110` | **Tiptap 커스텀 노드 필요** |
| `.r-badge` 붙임 배지 | `md_blocks.py:142` | **Tiptap 커스텀 노드 필요** |
| `.r-kpi` 지표 카드 | `md_blocks.py:124` | **Tiptap 커스텀 노드 필요** |
| `.r-b1`/`.r-b2` 개조식 □/○ | 개조식 마커 | 목록 스타일로 근사 or 커스텀 노드 |

> **결정 필요 사항**: 헤드라인·배지·KPI 3종은 표준 마크다운 문법이 없다. 요구사항 4.1(편집기 WYSIWYG)을 만족하려면 Tiptap 커스텀 노드 + 슬래시 커맨드 + 마크다운 왕복 직렬화가 각각 필요하며, 이는 §4 순서 5의 별도 작업량이다. **1차 범위에서는 CSS만으로 되는 4종(제목/섹션/표/본문)을 먼저 완성하고, 3종 커스텀 노드는 2차로 분리**할 것을 제안한다. 사용자 확인 대상.

### 3.4 PDF 출력 — Chrome 이식

#### 3.4.1 인쇄 전용 라우트 `src/app/print/page.tsx` (신규)

`rp_gen/templates/print.html`의 역할. 검증된 신호 규약을 그대로 쓴다:
- 이미지 로드를 모두 기다린 뒤 분할 (`print.html` — "이미지가 다 실린 뒤에 분할해야 높이가 정확하다")
- 완료 시 `document.documentElement`에 `data-ready="1"`, `data-pages=N` 설정
- 8초 타임아웃 폴백

#### 3.4.2 `src/lib/pdf/export.ts` (신규) — `export_pdf.py` 포팅

- `find_browser()` — `CANDIDATES` 7경로(Chrome/Edge, Win/Linux) + glob 폴백을 그대로 옮긴다.
- `html_to_pdf()` — 인자 이식: `--headless=new` `--disable-gpu` `--no-sandbox` `--no-first-run` `--disable-extensions` `--user-data-dir` `--run-all-compositor-stages-before-draw` `--no-pdf-header-footer` `--print-to-pdf-no-header` `--print-to-pdf=`.
- **개선점**: 원본은 `--virtual-time-budget=12000`으로 렌더 완료를 *추측*한다. md_editor에는 Playwright(`@playwright/test` ^1.61.1, devDependency)가 이미 있으므로, `page.waitForSelector('html[data-ready="1"]')` 후 `page.pdf()`로 **확정 대기**가 가능하다. 단 Playwright는 현재 devDependency이므로 프로덕션 의존성 승격 여부 결정 필요 — 승격을 원치 않으면 `child_process.spawn`으로 원본 방식을 그대로 쓴다. **사용자 확인 대상.**
- `page_count()` — `/Type /Page` 카운트에서 `/Type /Pages`를 빼는 의존성 없는 방식. 그대로 이식(원자질문 3.3 검증에 사용).

#### 3.4.3 `src/app/api/pdf/route.ts` (신규)

- `POST { filePath, root, html, marginPresetId, theme }` → 임시 HTML 저장 → 헤드리스 Chrome이 `/print`를 인쇄 → PDF 바이트 반환.
- `api/fs/route.ts`의 기존 패턴(`{ action, root }` + `ok()` 헬퍼)과 응답 형식을 맞춘다.
- **보안**: `app.py:43` `safe_path()`가 `ROOT` 밖 접근을 `abort(403)`으로 막는 규약을 이식한다. `lib/fs/server.ts`에 동등한 경로 검증이 있는지 먼저 확인하고, 있으면 재사용한다.

#### 3.4.4 기존 래스터 경로 폐기

- `src/components/editor/pdf-export-preview.tsx` — `handleSave()`의 html2canvas+jsPDF 본체를 `/api/pdf` 호출로 교체. 미리보기 UI 셸(`.pdf-preview-overlay` 등)은 유지.
- 의존성 제거 대상: `jspdf` `html2canvas` `html2canvas-pro`. **`html2canvas`와 `html2canvas-pro`가 둘 다 설치되어 있으나 실제 import는 `html2canvas-pro` 하나뿐**(`pdf-export-preview.tsx:5`) — 정리 기회.

### 3.5 양식 선택 (문서별) — 프론트매터 확장

`page-mode.ts`의 검증된 패턴을 그대로 확장한다. 현재 `pageModeFromMarkdown()`은 `gray-matter`로 파싱해 `data.pageMode === "single"`을 보고, `pageModeFromHtml()`은 `<template data-frontmatter="...">`(markdown.ts가 심는 노드)에서 같은 값을 읽는다.

- 프론트매터 키 `reportTheme` 추가 (`report` | `plain`, 기본 `plain`).
- `src/lib/report-theme.ts` (신규) — `reportThemeFromMarkdown()` / `reportThemeFromHtml()`. `page-mode.ts`와 시그니처를 대칭으로 둔다.
- **왕복 보존은 기존 메커니즘이 이미 보장**: `markdown.ts:76` `mdToHtml()`이 프론트매터를 `<template data-frontmatter>`로 심고, `htmlToMd()`(62~66행)가 본문 앞에 재부착한다 → 원자질문 4.3 충족.
- `templates/` 5종(report/meeting/proposal/technical/one-paper) 중 **report·one-paper의 5개 .md 파일 프론트매터에 `reportTheme: report`를 넣는다**. `scripts/build-templates.mjs`가 `gray-matter`로 프론트매터를 읽어 `public/templates.json`을 만들므로 별도 변경 없이 통과할 가능성이 높으나, `TOPIC_DISPLAY`/`TOPIC_ORDER` 외 키 취급을 확인해야 한다.

---

## 4. 구현 순서

| 순서 | 작업 내용 | 의존 | 완료 기준 |
|:--:|-----------|------|-----------|
| 1 | `report-theme.css` 이식 + `.report-theme` 스코프, `@page` 중복 단일화 | — | 1.pdf와 나란히 두고 제목·표 스타일 일치 |
| 2 | `report-theme.ts` + 프론트매터 `reportTheme` + 툴바 토글 | 1 | 저장→재열기 후 양식 유지 (4.3) |
| 3 | `paginate.ts` 포팅 + HTML→블록 어댑터 | — | 표가 쪽 경계에서 헤더 반복하며 쪼개짐 (5.2) |
| 4 | `use-auto-page-break.ts` 교체 (노드 삽입 제거 → 표시 계층) | 3 | 왕복 무결성 유지 (5.1) |
| 5 | `/print` 라우트 + `data-ready` 신호 | 3 | 브라우저로 직접 열어 쪽수 확인 |
| 6 | `pdf/export.ts` + `/api/pdf` + 래스터 경로 폐기 | 5 | 벡터 PDF 생성, 텍스트 선택 가능 (3.1, 3.2) |
| 7 | 쪽수 일치 검증 + 의존성 정리(jspdf/html2canvas 제거) | 6 | 미리보기 쪽수 == PDF 쪽수 (3.3) |
| 8 | (2차) `.r-headline`/`.r-badge`/`.r-kpi` Tiptap 커스텀 노드 | 2 | §3.3 결정 후 착수 |

---

## 5. 영향도 분석

### 5.1 신규 파일

| 파일 | 역할 |
|------|------|
| `src/app/report-theme.css` | rp_gen 표준양식 (편집·인쇄 공용) |
| `src/lib/report-theme.ts` | 프론트매터 양식 선택 |
| `src/lib/paginate.ts` | 실측 A4 분할 엔진 |
| `src/lib/report-blocks.ts` | HTML→블록 어댑터 |
| `src/lib/pdf/export.ts` | 헤드리스 Chrome 호출 |
| `src/app/api/pdf/route.ts` | PDF 생성 API |
| `src/app/print/page.tsx` | 인쇄 전용 렌더 |

### 5.2 수정 파일

| 파일 | 변경 | 위험 |
|------|------|------|
| `src/hooks/use-auto-page-break.ts` | 분할 엔진 교체, 노드 삽입 제거 | **높음** — 15_01에서 복원한 bunri 동작의 핵심. 회귀 시 "페이지 구분 기능이 또 사라졌다"가 재발 |
| `src/components/editor/pdf-export-preview.tsx` | 저장 경로를 `/api/pdf`로 | 중 |
| `src/components/editor/editor-toolbar.tsx` | 양식 토글 추가 | 낮음 |
| `src/components/editor/tiptap-editor.tsx` | `.report-theme` 클래스 적용 | 중 |
| `src/app/globals.css` | `@page`/`@media print` 중복 해소 | **중** — 14_02 기록상 이 파일의 CSS 오류가 앱 전체 렌더를 죽인 전례 있음(`.print\:hidden`) |
| `src/lib/a4-margins.ts` | `mmToPx()`를 분할 엔진과 공유 | 낮음 |
| `templates/report/*.md`, `templates/one-paper/*.md` (5개) | 프론트매터에 `reportTheme` | 낮음 |
| `package.json` | jspdf·html2canvas·html2canvas-pro 제거, (선택) playwright 승격 | 중 |

### 5.3 rp_gen 처리

이식 완료 후 `D:\dev\md_editor\rp_gen`을 삭제할지 참조용 보존할지 **사용자 확인 필요**. 본 계획서는 삭제하지 않는 것을 기본으로 한다 (01.legacy-protection).

---

## 6. 테스트/검증 계획

rp_gen README §4가 정의한 검증 기준을 그대로 승계한다.

| # | 시나리오 | 방법 | 통과 기준 |
|---|----------|------|-----------|
| 1 | **쪽수 일치** | `/print`의 `data-pages` vs `page_count()` 결과 | 동일. 다르면 `@page` 여백 불일치 |
| 2 | **왕복 무결성** | 편집 없이 열기→저장 | 원본과 바이트 단위 동일 |
| 3 | 표 분할 | 긴 표 문서 PDF | 쪽 넘김 시 헤더 반복 |
| 4 | 양식 보존 | `reportTheme` 문서 저장→재열기 | 양식 유지 |
| 5 | 벡터 확인 | PDF에서 텍스트 드래그 선택 | 선택됨(래스터 아님) |
| 6 | 대용량 | `md_docs/종합보고서.md` 등 실제 문서 | 렌더 완료, 타임아웃 없음 |

- Playwright e2e로 작성한다. 기존 `e2e/pdf-save-flow.spec.ts`가 존재하므로 **래스터 전제 단언이 있으면 함께 갱신**해야 한다(파일 존재 확인 완료, 내용 미확인 — 구현 착수 시 확인).
- 05.testing.md 및 02.hallucination-prevention.md에 따라 **실행 결과로만** 판정한다. 예측 금지.

---

## 7. 리스크 및 제약

| # | 리스크 | 대응 |
|---|--------|------|
| 1 | **`next build` 기존 실패** — 15_01 기록: Next 16 / `@serwist` Turbopack↔webpack 충돌로 본 작업과 무관하게 실패 중 | `next dev` + `tsc --noEmit` 기준으로 검증. 빌드 복구는 별도 계획 |
| 2 | **서버에 Chrome 필요** — 헤드리스 Chrome이 없는 환경에서 PDF 불가 | `find_browser()`의 명확한 오류 메시지 이식(원본이 탐색 경로를 모두 나열함). 미설치 시 `window.print()` 폴백 안내 |
| 3 | **자동 분할 회귀** — 15_01에서 한 번 소실됐던 기능 | 순서 4 완료 직후 e2e 우선 작성. 5.2의 위험도 '높음' 항목 |
| 4 | 양식 3종(배지/KPI/헤드라인) 마크다운 문법 부재 | §3.3 — 2차 분리 제안, 사용자 확인 |
| 5 | Playwright 프로덕션 의존성 승격 여부 | §3.4.2 — 미승격 시 `spawn` 방식(원본과 동일) |
| 6 | 서버 PDF 생성이 File System Access 기반 클라이언트 모델과 어긋남 | HTML을 요청 본문으로 넘겨 서버가 원본 파일에 접근하지 않게 설계 |

---

## 8. 사용자 확인 대기 항목

1. §2 요구사항 원자화 표 14개 항목의 "기대"값이 맞는지
2. §3.3 — 배지/KPI/헤드라인 3종을 2차로 분리하는 안
3. §3.4.2 — Playwright 승격 vs `spawn` 직접 호출
4. §5.3 — rp_gen 폴더 삭제 여부
