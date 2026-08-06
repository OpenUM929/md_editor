# 계획서 — page-engine-redesign (A4 페이지 컨테인먼트 근본 재설계)

> 상태: P2 완료(편집 페이지 흐름 확정) | 작성일: 2026-07-22
> 작업 유형: C (설계/아키텍처)
> 선행: plan/2026/07/20_01_report-pdf-merge (rp_gen 양식·PDF 통합, Todo), plan/2026/07/15_01_a4-mode-restore (3모드 정립, Done)
> 저장 위치(승인 후 실행 1단계에서 생성): `D:\dev\md_editor\md_editor\plan\2026\07\22_01_page-engine-redesign\22_01_page-engine-redesign.md` + 동월 `_index.md` 갱신

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-22 | 최초 작성 | 자동 페이지 나눔 불안정성의 근본 원인 진단 + Paged.js 기반 재설계 + 헤더/푸터 + DOCX 내보내기 계획 |
| 2026-07-22 | **설계 수정 (P2 실행 중 확정)** | **원점 재검토 결과 도구 선택을 정정.** Paged.js 는 clone DOM 을 정적 `.pagedjs_page` 로 쪼개므로 살아있는 contenteditable(편집 화면)을 페이지로 나눌 수 없음 → 편집 화면의 페이지 흐름에는 부적합. **편집 화면은 "연속 ProseMirror 문서 + ProseMirror 위젯 데코레이션 스페이서"** 로 구현(`src/hooks/use-page-flow.ts`). 문서(doc)를 변경하지 않고 표시용 데코만 갱신(meta 트랜잭션, docChanged=false) → 순환 의존·자동저장 오염·연쇄 흔들림이 구조적으로 불가능. 직접 inline margin 은 ProseMirror MutationObserver 가 되돌리므로 **위젯 데코레이션이 유일한 정답**임을 실측으로 확인. **Paged.js 는 P4(PDF 벡터 출력)로 범위 축소** — 편집이 아닌 정적 출력에는 여전히 적합. use-auto-page-break.ts(노드 삽입) + useAlignManualBreaks(break 정렬) 삭제. |

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1 | md 파일을 불러오면 여백·머리글 등 A4 설정에 따라 내용이 자동으로 해당 페이지에 맞춰 배치되어야 하는가? | Y | (P2 완료 후 Playwright로 페이지별 컨테인먼트 실측) |
| 2 | 페이지 분할 엔진을 외부 라이브러리(Paged.js)로 교체하는가, 자체 구현(paginate.ts)을 계속하는가? | Paged.js 도입 | 사용자 확정(AskUserQuestion, 2026-07-22) — Paged.js |
| 3 | 반복 헤더/바닥글 + 페이지 번호 기능이 필요한가? | Y | 사용자 확정 — "반복 헤더/바닥글 + 페이지 번호" 선택 |
| 4 | 이번 계획에 DOCX 내보내기를 포함하는가? | Y | 사용자 확정 — "DOCX까지 포함" 선택 |
| 5 | 콘텐츠를 2페이지에서 1페이지로 옮겼을 때 다른 페이지 레이아웃이 흔들리지 않아야 하는가? | Y | (P1 완료 후 Playwright로 편집→재계산 안정성 실측) |
| 6 | 편집(Tiptap WYSIWYG)은 계속 하나의 연속 문서로 유지되는가, 아니면 실제로 페이지별 분리된 에디터가 되는가? | 연속 문서 유지(표시 계층만 페이지 분리) | §2 설계 원칙 1 — 실제 contenteditable 분열은 채택하지 않음(근거는 본문) |

## 1. 배경 및 목적

사용자가 MSYS_구축완료보고서.md에서 2페이지의 일부 콘텐츠를 1페이지로 옮기는 편집을 했을 때, 그 페이지만이 아니라 **다른 페이지들까지 레이아웃이 흔들리는 현상**이 재현되었다(사용자 첨부 스크린샷, 이 세션). 직전 대응으로 `src/hooks/use-auto-page-break.ts`의 `PAGE_HEIGHT_PX` 계산 단위를 CSS 격자(305mm)와 맞추는 국소 수정을 했으나, 사용자는 이것이 "케이스바이케이스" 대증 치료이며 **자동 페이지 나눔 엔진 자체의 구조적 결함**을 근본적으로 재설계해 달라고 명시적으로 요구했다. 나아가 목표를 다음과 같이 구체화했다: "md 파일을 불러오면 워드/한글처럼 여백·머리글 등 A4 설정에 맞춰 자동으로 페이지가 구성되고, 이후 한글(HWP)·Word·PDF로 호환되는 우리만의 표준을 만들고 싶다."

본 계획은 (1) 현재 페이지 나눔 엔진이 왜 편집 시 다른 페이지까지 흔드는지 코드 근거로 확정하고, (2) 표시 계층을 상태 비의존적(stateless) 재계산 구조로 교체해 그 근본 원인을 제거하며, (3) 반복 헤더/바닥글·페이지 번호를 문서 표준(프론트매터)으로 편입하고, (4) PDF 벡터화·DOCX 신규 내보내기를 같은 계산 엔진 위에서 구현하는 것을 목표로 한다.

## 2. 현황 실측 (코드 확인 완료)

### 2-1. 현재 아키텍처 — "흐르는 단일 문서 + 배경 격자 오버레이"
- 편집 표면은 **하나의 연속 ProseMirror 문서**다(`src/components/editor/tiptap-editor.tsx:198` `useEditor`). 페이지 경계는 실제 DOM 컨테이너 분리가 아니라, `.a4-sheets`/`.a4-page`가 `position:absolute`로 흰 종이 배경을 **콘텐츠 뒤에 겹쳐 그리는 것**뿐이다(`tiptap-editor.tsx:352-366`, `globals.css:170-197` — `.a4-sheets{position:absolute}`, `.a4-sheets .a4-page{position:absolute}`).
- 즉 "페이지 컨테인먼트"는 시각적 착시이며, 콘텐츠가 실제로 그 상자 안에 갇혀 있지 않다. 콘텐츠가 페이지 경계를 넘으면 뒤에 깔린 흰 종이 이미지와 어긋나 보일 뿐, 편집기 자체는 이를 모른다.

### 2-2. 자동 나눔이 "다른 페이지까지 흔드는" 근본 경로 (3중 상호작용)
1. **`use-auto-page-break.ts` `sync()`** (`:14-116`) — `dom.scrollHeight` 전체를 측정해 `expectedBreaks = ceil(contentHeight / PAGE_HEIGHT_PX) - 1`을 계산하고, 현재 `pageBreak` 노드 개수(`totalBreaks`)와 다르면 **문서에 실제로 노드를 삽입/삭제**한다(`tr.insert`/`tr.delete`, `:90-111`). 이는 **문서 전체 길이 하나만 보고 몇 개의 break가 필요한지 결정**하는 방식이라, 앞부분(1페이지)에서 콘텐츠가 줄면 전체 `contentHeight`가 바뀌어 `expectedBreaks`가 바뀌고, 그 결과 **뒷부분(2페이지 이후)의 break들도 삽입/삭제 대상이 된다** — 편집한 페이지가 아닌 다른 페이지의 break가 흔들리는 직접 원인.
2. **`useAlignManualBreaks`** (`tiptap-editor.tsx:120-174`) — 모든 `.page-break` 요소의 `marginTop`을 먼저 0으로 리셋한 뒤(`:140-143`), 실제 렌더 위치(`getBoundingClientRect().top`)를 다시 측정해 305mm 격자에 스냅되도록 `marginTop` 패딩을 주입한다(`:144-156`). 이 리셋→재측정 사이클이 **모든 break에 대해 매번 처음부터 다시** 실행되므로, 1페이지의 높이가 1px만 바뀌어도 2페이지 이후 모든 break의 패딩이 재계산된다 — 즉 **한 페이지의 변화가 그 뒤 모든 페이지의 여백에 연쇄 반영**되는 구조.
3. **디바운스 타이머 경합** — `sync()`(150ms 디바운스 + 300ms 최초 실행)와 `useAlignManualBreaks`의 `align()`(150ms 디바운스 + 300ms/800ms 실행)이 **서로 다른 훅에서 독립적으로 `editor.on("update")`를 구독**한다(`use-auto-page-break.ts:118-136`, `tiptap-editor.tsx:159-173`). `sync()`가 노드를 삽입하면 `update` 이벤트가 다시 발생해 `align()`이 재실행되고, `align()`이 `marginTop`을 바꾸면 레이아웃이 바뀌어 `sync()`의 `scrollHeight` 측정값도 바뀐다 — **두 훅이 서로의 결과를 입력으로 삼는 순환 의존**.

> `docs/a4-authoring-guide.md` §4-2(같은 프로젝트의 기존 정본 문서)가 이미 이 불안정성을 알고 있다: *"자동 나눔… 선 위치가 매 페이지 달라진다"* — 그리고 대응책으로 "작성자가 `---pb---`를 직접 넣어 자동 나눔이 안 생기게 하라"는 **회피(작성 규율)**를 제시한다. 이는 문제를 진단만 하고 엔진을 고치지 않은 상태의 공식 기록이다. 본 계획은 이 회피를 규율 준수에 의존하지 않고 **엔진 차원에서 해소**한다.

### 2-3. 헤더/바닥글 — 현재 존재하지 않음
- `src/lib/a4-margins.ts`의 `MarginValues`는 `top/bottom/left/right` 균일 여백만 정의(`:3-8`). 반복되는 페이지 상단/하단 텍스트(문서 제목, 페이지 번호 등) 개념이 **어디에도 없음**.
- `src/lib/a4-styles.ts`의 `buildHeaderXml()`(`:133-144`)은 이름은 "header"이지만 HWPX 문서의 **스타일 정의 헤더**(charPr/paraPr 목록)이며, 페이지마다 반복 표시되는 런닝 헤더와는 무관 — 이름 충돌에 유의.
- 프론트매터에도 `reportTheme`/`pageMode`/(margin은 UI state로만 존재)뿐, `header`/`footer` 필드 부재(`src/lib/report-theme.ts`, `src/lib/page-mode.ts` 확인 완료).

### 2-4. 내보내기 현황
| 형식 | 상태 | 파일 | 페이지 분할 책임 |
|------|------|------|------|
| PDF | **래스터**(문서 길이만큼 긴 캔버스를 이미지로 캡처 후 jsPDF 삽입) | `src/components/editor/pdf-export-preview.tsx:4-5,30,39` (`html2canvas-pro`+`jsPDF`) | 없음(A4 아님, 텍스트 선택 불가) |
| HWPX | **이미 구현됨** | `src/lib/hwpx-export.ts`(marked 토큰 워커 → HWPX XML), `src/app/api/export/hwpx/route.ts`, UI 연결은 `doc-tab-content.tsx:163-185` `handleSaveHwpx` → `EditorToolbar`의 `onSaveHwpx`(`:240`) | **한글(HWP) 프로그램 자체가 처리** — `---pb---` 토큰을 `pageBreak="1"` 속성으로 HWPX에 심기만 하면(`hwpx-export.ts:215-222`) 실제 페이지 흐름은 한글이 계산 → md_editor가 페이지 높이를 몰라도 정확함 |
| DOCX | **없음** | — | (신규 필요) |

- **결론**: HWPX는 이미 "엔진이 페이지를 몰라도 정확한" 이상적 사례다(대상 프로그램이 페이지네이션을 대신 함). PDF는 md_editor가 직접 페이지를 그려야 하므로 §2-2의 근본 결함이 그대로 노출된다. DOCX도 Word가 자체 페이지네이션을 하므로 HWPX와 같은 패턴을 재사용할 수 있다.

## 3. 설계 원칙

1. **편집 문서는 항상 하나의 연속 소스**로 유지한다. Tiptap 문서를 페이지별로 실제 분열시키는 방식(진짜 여러 개의 `contenteditable`)은 채택하지 않는다 — 이는 Word/한글의 내부 구현에 준하는 규모이며, 커서 이동·IME 조합·되돌리기(undo) 스택이 페이지 경계를 가로지를 때마다 별도의 병합 로직이 필요해 새로운 버그 표면을 만든다. `docs/a4-authoring-guide.md` §0이 이미 "표준 마크다운만 사용"을 원칙으로 못박았으므로 이와 정합.
2. **자동 페이지 배치는 상태 비의존(stateless) 재계산**이어야 한다 — 이전 break 위치를 입력으로 삼지 않고, 매번 콘텐츠 전체를 처음부터 다시 측정해 페이지를 나눈다. 이것이 §2-2의 순환 의존(연쇄 흔들림)을 구조적으로 차단하는 유일한 방법이다: 입력(콘텐츠)이 같으면 출력(페이지 배치)도 항상 같다 — 참조 투명성(referential transparency).
3. **자동 나눔 계산 결과는 Tiptap 문서를 변경하지 않는다.** 현재 `use-auto-page-break.ts`처럼 `pageBreak` 노드를 편집 대상 문서에 직접 `tr.insert`/`tr.delete`하는 방식을 폐기하고, **표시 전용 레이어**(미리보기/인쇄/PDF 렌더 시점에 계산되는 파생 값)로 옮긴다. 사용자가 명시 삽입한 `---pb---`(수동 break)만 실제 문서 노드로 남아 마크다운 왕복(`markdown.ts:31-35`)을 유지한다 — 기존 동작과 하위호환.
4. **페이지네이션 계산은 한 곳에서, 여러 출력(화면 분리뷰·인쇄·PDF·DOCX)이 그 결과를 공유**한다 — 화면과 PDF가 다르게 나뉘는 문제(모드 불일치)를 원천 차단.
5. **헤더/바닥글·페이지 번호는 표준 마크다운 확장이 아니라 프론트매터 필드**로 선언한다 — `docs/a4-authoring-guide.md` §2-3(상단 인라인 `<style>` 금지 → 프론트매터로 양식 지정)와 동일한 관례를 따른다.

## 4. 구조/스키마

### 4-1. 프론트매터 확장 (`src/lib/page-mode.ts` 및 신규 `src/lib/page-header-footer.ts`)
```yaml
---
title: "문서 제목"
reportTheme: report
header: "{title}"              # 선택. {title}/{page}/{pages} 토큰 치환
footer: "{page} / {pages}"     # 선택. 미지정 시 헤더/바닥글 없음(기존 문서 하위호환)
---
```
- `PageHeaderFooter` 타입: `{ header?: string; footer?: string }`.
- `pageHeaderFooterFromMarkdown(md)` / `pageHeaderFooterFromHtml(html)` — 기존 `reportThemeFromMarkdown/Html`(`src/lib/report-theme.ts`)과 동일한 gray-matter 패턴 재사용.
- 토큰 치환은 Paged.js가 러닝 헤더에 넣을 최종 HTML을 만들 때 `{title}`→프론트매터 title, `{page}`/`{pages}`→Paged.js가 렌더 후 주입하는 `.pagedjs_page_counter` 값으로 치환(Paged.js의 `Handler` API로 페이지별 콜백을 받아 텍스트 치환, §4-3 참조).

### 4-2. 자동 나눔 폐기 + Paged.js 도입 지점
- **삭제 대상**: `src/hooks/use-auto-page-break.ts`의 노드 삽입/삭제 로직(`:59-112`) 전체와, `tiptap-editor.tsx`의 `useAlignManualBreaks`가 `.page-break` 요소를 대상으로 하던 `marginTop` 스냅 로직(`:120-174`) — 두 로직 모두 "편집 중인 문서의 실제 DOM"을 계산 대상이자 계산 결과 반영 대상으로 동시에 삼던 것이 순환의 근원이었으므로, **이 결합을 끊는다**.
- **신규**: `src/lib/paged-preview.ts` — `editor.getHTML()`을 받아 **읽기 전용 clone 컨테이너**에 렌더링하고, Paged.js(`Previewer` API, `pagedjs` npm 패키지)를 그 clone에 대해서만 실행해 `.pagedjs_pages` 결과(각각 독립된 `<div class="pagedjs_page">`)를 얻는다. 편집 중인 살아있는 ProseMirror DOM은 건드리지 않는다.
- **분리(bunri) 모드 화면 표시**: 현재처럼 편집 DOM 뒤에 배경을 겹치는 방식을 버리고, **편집 시(타이핑 중)에는 연속 뷰(현재 ilche 방식과 동일한 시각)로 두고, 페이지 배치 미리보기는 디바운스 후 `paged-preview.ts`가 계산한 결과를 별도 오버레이/탭으로 보여준다.** (§5 결정 필요 사항 D-1에서 사용자 확인 필요 — 실시간 페이지 스냅 vs 디바운스 미리보기 트레이드오프.)
- **인쇄/PDF**: `src/app/print/page.tsx`(기존 20_01 계획에 있던 라우트, 아직 미생성)가 `paged-preview.ts`를 호출해 최종 페이지를 렌더하고, `document.documentElement`에 `data-ready="1"`을 세팅 → 헤드리스 Chrome이 이 페이지를 `--print-to-pdf`로 벡터 PDF화(기존 20_01 계획 §설계4 그대로 재사용, 여기서 폐기하지 않음).
- **CSS**: `report-theme.css`(기존, `src/app/report-theme.css`)에 Paged.js 규약(`@page { size: A4; margin: ... }`, `@page { @top-center { content: ... } }` 등 CSS Paged Media 문법으로 헤더/바닥글 선언)을 추가. Paged.js는 표준 CSS Paged Media 스펙의 폴리필이므로 별도 JS 헤더 렌더링 코드 없이 CSS 선언만으로 러닝 헤더/페이지 번호가 동작한다(`counter(page)`, `counter(pages)`).

### 4-3. Paged.js 헤더/바닥글 CSS 예시 (report-theme.css 추가분)
```css
@page {
  size: A4;
  margin: var(--a4-m-tb) var(--a4-m-lr);
  @top-center { content: var(--doc-header, ""); }
  @bottom-center { content: counter(page) " / " counter(pages); }
}
```
- `--doc-header` CSS 커스텀 프로퍼티는 `paged-preview.ts`가 렌더 직전 루트 엘리먼트에 `style.setProperty("--doc-header", frontmatterHeader)`로 주입 — 프론트매터 값을 CSS로 전달하는 기존 관례(`tiptap-editor.tsx:297-301` `cssVars`)와 동일 패턴.

### 4-4. DOCX 내보내기 — HWPX 패턴 재사용
- **신규 파일**: `src/lib/docx-export.ts` — `src/lib/hwpx-export.ts`와 **동일한 marked 토큰 순회 구조**(`renderToken`/`renderList`/`renderTable`/`extractFrontmatter`)를 그대로 재사용하되, XML 문자열 조립 대신 `docx` npm 패키지(신규 의존성, MIT license, 순수 JS OOXML 생성 — LibreOffice 등 외부 바이너리 불필요)의 `Paragraph`/`Table`/`HeadingLevel` API로 대체한다.
- **페이지 분할 위임**: HWPX와 동일한 원리 — `---pb---` 토큰을 `docx`의 `PageBreak` 클래스로 변환만 하면(1줄), 실제 페이지 흐름 계산은 **Word 프로그램 자체가 처리**한다. Paged.js 계산 결과와 무관 — DOCX/HWPX는 §2-4에서 확인했듯 이미 "엔진이 페이지를 몰라도 되는" 대상이므로 신규 파일 하나로 충분하고 Paged.js 도입과는 독립적으로 진행 가능.
- **헤더/바닥글**: `docx`의 `Header`/`Footer` 클래스에 프론트매터 `header`/`footer` 값 + `PageNumber.CURRENT`/`PageNumber.TOTAL_PAGES` 필드코드 삽입.
- **API 라우트**: `src/app/api/export/docx/route.ts` — `src/app/api/export/hwpx/route.ts`(`:1-59`)를 그대로 복제해 함수명만 교체(`resolveSavePath` 재사용 가능하도록 공용 유틸로 승격 고려).
- **UI 연결**: `doc-tab-content.tsx`의 `handleSaveHwpx`(`:163-185`)와 동일한 형태로 `handleSaveDocx` 추가, `EditorToolbar`의 `onSaveHwpx` prop 옆에 `onSaveDocx` 추가.

## 5. 단계별 로드맵

| 단계 | 내용 | 산출물 | 의존 | 담당 |
|------|------|--------|------|------|
| P0 | 본 설계 합의 + 저장소 계획서 등록 | `plan/2026/07/22_01_page-engine-redesign/` + `_index.md` | - | [고] |
| P1 | `pagedjs` 의존성 도입, `paged-preview.ts` 프로토타입 — clone DOM에만 적용, 편집 DOM 무변경 검증 | Paged.js가 A4 페이지·헤더·바닥글·페이지번호를 정확히 렌더함을 Playwright로 실측 확인 | P0 | [고] |
| P2 | `use-auto-page-break.ts` 노드 삽입 로직 제거 + `useAlignManualBreaks` 제거, bunri 화면을 `paged-preview.ts` 결과 소비로 교체 | 콘텐츠를 2페이지→1페이지로 옮겨도 다른 페이지 안 흔들림(Playwright 실측, 요구사항 원자화 #5 검증) | P1 | [고] |
| P3 | 프론트매터 `header`/`footer` 필드 + 툴바 UI(선택) 추가 | 반복 헤더/바닥글 + 페이지번호가 화면·인쇄 모두에 표시 | P2 | [저] |
| P4 | `/print` 라우트 + 헤드리스 Chrome PDF 벡터화(기존 20_01 계획과 통합, 중복 작업 제거) | 벡터 PDF(텍스트 드래그 가능), 래스터 경로(`html2canvas`/`jsPDF`) 폐기 | P2 | [고] |
| P5 | `docx-export.ts` + `/api/export/docx` + UI 연결 | .docx 다운로드/저장, Word에서 열어 페이지·헤더/바닥글 확인 | P0(독립 가능, P1~P4와 병행 가능) | [저] |
| P6 | 전 구간 회귀 검증 — 기존 `MSYS_구축완료보고서.md` 등 실제 문서로 §7 검증표 전항목 재확인 | Playwright e2e 리포트 | P1~P5 | [고] |

## 6. 영향도 분석

| 파일 | 변경 내용 | 위험도 |
|------|-----------|--------|
| `src/hooks/use-auto-page-break.ts` | 노드 삽입/삭제 로직 전체 제거, 훅 자체를 표시 레이어 트리거로 축소 또는 삭제 | **높음** — bunri 자동 분할의 핵심, 회귀 시 "페이지 구분 사라짐" 재발(15_01에서 이미 한 번 겪은 회귀 패턴) |
| `src/components/editor/tiptap-editor.tsx` | `useAlignManualBreaks` 제거, bunri 렌더 분기를 `paged-preview.ts` 결과 소비로 교체(`:339-394`) | **높음** — 3모드(wide/ilche/bunri) 렌더 분기 전체가 이 파일에 있음 |
| `src/lib/paged-preview.ts` (신규) | Paged.js 래퍼 | 중간 — 신규 의존성 학습 곡선 |
| `src/app/report-theme.css` | `@page` 규칙에 헤더/바닥글 CSS 추가 | 낮음 — 기존 `globals.css`의 `@media print`/`@page`(`:339-343`)와 중복/충돌 여부 확인 필요(20_01 계획에서도 지적된 사항) |
| `src/lib/page-mode.ts`, `src/lib/report-theme.ts` | 대칭 파일 `page-header-footer.ts` 신규 추가(기존 파일은 무변경, 패턴만 재사용) | 낮음 |
| `src/lib/docx-export.ts` (신규) | `hwpx-export.ts` 패턴 복제 | 낮음 — 기존 파일 무변경, 신규 독립 파일 |
| `src/app/api/export/docx/route.ts` (신규) | `hwpx/route.ts` 패턴 복제 | 낮음 |
| `src/components/tab/doc-tab-content.tsx`, `src/components/editor/editor-toolbar.tsx` | `handleSaveDocx`/`onSaveDocx` 추가(기존 `handleSaveHwpx` 옆) | 낮음 — 추가만, 기존 로직 무변경 |
| `package.json` | `pagedjs`(신규), `docx`(신규) 추가. `jspdf`/`html2canvas`/`html2canvas-pro` 제거(P4 완료 후) | 중간 |

## 7. 테스트/검증 계획 (실행 결과로만 판정)

| # | 시나리오 | 방법 | 통과 기준 |
|---|----------|------|-----------|
| 1 | 편집 안정성(핵심 회귀) | 2페이지 콘텐츠 일부를 1페이지로 이동 | 3페이지 이후 다른 페이지의 높이/break 위치 불변(Playwright로 이동 전후 각 페이지 높이 diff=0) |
| 2 | 페이지 컨테인먼트 | 임의 문서를 열어 각 페이지의 실제 렌더 높이 측정 | 인쇄 가능 높이(margin 프리셋별 257/237/217mm) 초과 없음 |
| 3 | 헤더/바닥글 | `header`/`footer` 프론트매터 지정 문서를 화면·PDF에서 확인 | 모든 페이지 상/하단에 반복 표시, 페이지 번호 순차 증가 |
| 4 | 모드 일관성 | 화면 분리뷰 vs PDF vs DOCX 페이지 수 비교 | 페이지 수 동일(다르면 `@page` 여백 설정 불일치) |
| 5 | 벡터 PDF | PDF 텍스트 드래그 | 선택됨(래스터 아님) |
| 6 | DOCX 개통 | 생성된 .docx를 Word(또는 LibreOffice)로 열기 | 페이지 분할·헤더/바닥글·표·목록 정상 렌더 |
| 7 | 왕복 무결성 | 편집 없이 열기→저장 | 원본 마크다운과 바이트 동일(수동 `---pb---`만 보존, 자동 break 소스 오염 없음) |
| 8 | 기존 회귀 방지 | `MSYS_구축완료보고서.md`(23개 수동 break 보유)로 P1~P6 전 구간 재실행 | §7 기존 검증 기준(a4-authoring-guide.md) 7개 항목 모두 유지 |

## 8. 리스크 및 제약

- **Paged.js 학습/통합 비용**: 신규 의존성이며 API(`Previewer.preview()`, `Handler` 훅)를 처음 도입 — P1에서 프로토타입 검증 없이 P2로 넘어가지 않는다(로드맵 의존 관계로 강제).
- **`next build` 기존 실패는 본 작업과 무관**: Next.js 16 / `@serwist` Turbopack↔webpack 충돌로 이미 실패 중(15_01/20_01 계획에 기록) — 검증은 `next dev` + `tsc --noEmit` 기준.
- **Chrome 미설치 환경**: PDF 벡터화(P4)는 헤드리스 Chrome 필요 — 없으면 `window.print()` 폴백 안내(20_01 계획과 동일 대응).
- **실시간 편집 중 페이지 스냅 여부**: §4-2에서 "편집 중엔 연속 뷰, 분리 미리보기는 디바운스 후 계산"으로 잠정 설계했으나, 사용자가 원한 "Word처럼 타이핑하는 순간 페이지에 맞춰짐"과는 체감 차이가 있을 수 있음 — §9 결정 필요 사항에서 확인.
- **DOCX 표 스타일 재현도**: `docx` 라이브러리의 표 스타일 API가 HWPX만큼 세밀하지 않을 수 있어(테두리색·셀배경 등) 완전 동일 재현은 별도 조정 필요할 수 있음.

## 9. 결정 필요 사항

1. ~~페이지 분할 엔진 방식~~ — **확정: Paged.js 도입** (AskUserQuestion, 2026-07-22).
2. ~~헤더/바닥글 범위~~ — **확정: 반복 헤더/바닥글 + 페이지 번호**.
3. ~~내보내기 범위~~ — **확정: PDF 벡터화 + HWPX 유지 + DOCX 신규 추가**.
4. **미확정 D-1**: 분리(bunri) 화면에서 타이핑 중 실시간으로 페이지 경계가 스냅되길 원하는가(체감상 Word와 더 유사하나 매 키 입력마다 Paged.js 재계산 비용 발생), 아니면 디바운스 후(예: 타이핑 멈추고 300ms~1초 뒤) 페이지 미리보기가 갱신되면 충분한가(현재 자동 나눔과 비슷한 지연이나, 상태 비의존 재계산이라 흔들림은 없음)? — P2 착수 전 확인 필요.
5. **미확정 D-2**: 기존 20_01 계획(`plan/2026/07/20_01_report-pdf-merge`)이 Todo 상태로 남아있다 — 본 계획(22_01)이 그 계획의 §설계3(paginate.ts)·§설계4(PDF)를 대체/흡수하는 것으로 20_01을 상태 갱신(예: `Hold` 처리 후 22_01로 이관 기록) 할지, 두 계획을 병행 유지할지 확인 필요.

---

# rp_gen 보고서 양식·PDF 출력을 md_editor로 통합 + 템플릿 카테고리별 CSS 양식

## 진행 상태 (2026-07-21)

**완료 + 검증됨 (2026-07-21)** — 템플릿 카테고리별 CSS 양식 + WYSIWYG 편집(사용자 이번 요청):
- `npm ci` (745 패키지, node_modules 부재 상태였음) → `tsc --noEmit` **exit 0** (tiptap-editor.tsx:47 의 bare `Editor` 타입을 `import("@tiptap/react").Editor` 로 수정 후 클린).
- `eslint` (편집 7개 파일) **exit 0**. `build-templates.mjs` **exit 0**, templates.json 에 reportTheme 13건 보존.
- `next dev` 부팅 OK, `GET / 200`, 컴파일 에러 없음(report-theme.css import 가 렌더를 깨지 않음).
- **e2e 실측** `e2e/template-report-theme.spec.ts` **passed**: "사용하기"로 report 템플릿 새 문서 생성 → `.report-theme--report` 편집 표면에 적용 + h1 배경 비투명(제목박스 발현) + `.ProseMirror[contenteditable=true]` 에 타이핑 반영(WYSIWYG 편집 유지) 확인.
- 미확장 검증: 나머지 4개 카테고리(meeting/proposal/technical/one-paper)는 동일 코드경로(프론트매터값→클래스)라 report 실증으로 구조상 커버. 원하면 5종 개별 e2e 추가 가능.

**구현 파일:**
- `src/app/report-theme.css` (신규) — 5개 카테고리(report/meeting/proposal/technical/one-paper) CSS 테마. 편집·인쇄·PDF 세 표면 공통.
- `src/app/layout.tsx` — globals.css 다음에 report-theme.css import (캐스케이드 우선).
- `src/lib/report-theme.ts` (신규) — `ReportTheme` 타입, 프론트매터 리더(`reportThemeFromMarkdown/Html`), `reportThemeClass()`.
- `src/lib/markdown.ts` — `injectFrontmatter()` / `frontmatterFromMarkdown()` / `frontmatterFromHtml()` 추가. Tiptap 이 `<template data-frontmatter>` 를 getHTML()에서 떨궈내는 것을 지속 경계에서 재부착해 왕복 보장.
- `src/components/editor/tiptap-editor.tsx` — `reportTheme` prop → `.a4-canvas`(bunri/ilche)·`.print-pages`·PdfExportPreview 에 클래스.
- `src/components/editor/editor-toolbar.tsx` — 양식(테마) 셀렉트 추가(A4 모드에서 노출).
- `src/components/editor/pdf-export-preview.tsx` — `reportTheme` prop → `.pdf-preview-sheet` 클래스.
- `src/components/tab/doc-tab-content.tsx` — `frontmatter` 상태 + `contentForPersist`(주입) → 저장/자동저장에 사용, 테마 변경 시 프론트매터 반영(지속).
- `src/components/tab/template-preview-tab.tsx` — 미리보기에 테마 적용.
- `templates/**/*.md` (13개) — 프론트매터 `reportTheme` 시딩(디렉토리=카테고리 1:1).

**검증 미완 (도구 사용 불가로 대기)**: `tsc --noEmit`, `next dev` 육안 확인, e2e. 셸(Bash) 사용 가능해지는 즉시 수행 필요.

**미착수 (셸/헤드리스 Chrome 필요 → 런타임 검증 없이는 무의미)**: 아래 §설계 3(paginate.ts)·4(PDF 파이프라인). 즉 계획의 실측 페이지 분할 + 벡터 PDF 이식은 보류.

**미해결 가정 1건**: "Tiptap 이 template 노드를 getHTML()에서 제거한다"는 코드 추론 기반이며 **미실증**. injectFrontmatter 는 template 유무와 무관하게 동작하도록(idempotent) 작성했으나, 실증 후 확정 필요.

---

## Context

`D:\dev\md_editor`에는 두 도구가 있다.

- **rp_gen** (Flask/Python): 마크다운을 rp_gen `report.css` 표준양식으로 렌더하고, 실측 A4 페이지 분할(`paginate.js`) 후 헤드리스 Chrome `--print-to-pdf`로 **벡터 다중페이지 PDF**를 만든다. 다만 편집은 블록 클릭 인라인 방식(`app.js`)이라 사용자가 원치 않는다.
- **md_editor** (Next.js 16/React 19/Tiptap 3): 파일트리·탭·자동저장·복구·Tiptap WYSIWYG 편집이 강점. 그러나 PDF는 `html2canvas`+`jsPDF` **래스터**라 A4가 아니라 *문서 길이만큼 긴 1페이지 JPEG*이고(`src/components/editor/pdf-export-preview.tsx:34`), 텍스트 선택/인쇄 품질이 없다.

**목표**: md_editor의 **편집·문서관리를 정본**으로 두고, rp_gen의 **양식·실측 분할·벡터 PDF만 이식**한다. 추가로 사용자 요청에 따라 **md_editor 템플릿 5종(보고서·회의록·제안서·기술문서·원페이퍼)을 각 카테고리 전용 CSS 양식으로** 렌더하되, **수정은 Tiptap WYSIWYG 그대로** 유지한다.

**핵심 성립 근거**: md_editor는 CSS를 편집 표면(`.a4-canvas .ProseMirror`, `globals.css:134`)·인쇄(`.print-pages`)·PDF 미리보기(`.pdf-preview-sheet`) 세 곳에 동일 적용하는 구조가 이미 있다. 따라서 "양식은 CSS가 그리고, 수정은 Tiptap이 담당"이 성립한다 — 양식을 입혀도 그 자리에서 글자·표를 고칠 수 있다. rp_gen이 편집용 `contenteditable` 블록을 따로 만든 이유는 CSS 문제가 아니라 에디터가 없어서였고, md_editor엔 그 문제가 없다.

> 참고: 본 프로젝트의 `.clinerules` 규약상 계획서 정본은 `D:\dev\md_editor\md_editor\plan\2026\07\20_01_report-pdf-merge\20_01_report-pdf-merge.md`에 이미 작성되어 `_index.md`에 등록돼 있다. 승인·실행 시 본 파일 내용을 그 정본에 반영한다.

---

## 채택 요약 (기능별 정본)

| 영역 | 채택 | 버릴 것 |
|------|------|---------|
| 편집 | md_editor Tiptap WYSIWYG | rp_gen `app.js` 인라인 편집, `md_blocks.serialize/replace_block/delete_block` |
| 문서관리 | md_editor 파일트리·탭·자동저장·복구 | rp_gen `DOC_GLOB` 고정 4문서 목록 |
| 보고서 양식 | rp_gen `report.css` (편집 화면까지 WYSIWYG 적용) | — |
| 페이지 분할 | rp_gen `paginate.js` 실측 분할 | md_editor 높이-추정 방식 |
| PDF 출력 | rp_gen Chrome `--print-to-pdf` 벡터 | md_editor html2canvas+jsPDF 래스터 |

---

## 설계

### 1. 카테고리별 양식 CSS — `src/app/report-theme.css` (신규)

- 5개 카테고리 각각의 전용 테마를 `.report-theme--{topic}` 스코프로 작성한다: `report`, `meeting`, `proposal`, `technical`, `one-paper`. 공통 A4 치수·타이포는 `.report-theme` 베이스로 두고, 카테고리별 색/제목박스/강조 요소를 서브클래스에서 오버라이드.
- rp_gen `rp_gen/static/report.css`에서 **양식 규칙만** 이식한다:
  - 이식: `.r-title`(22pt 제목박스, `#F2F2F2`), `.r-sec/.r-sub/.r-sub4`, `.r-tbl`(헤더 `#F2F2F2`), `.r-b1/.r-b2`(개조식 □/○), `.r-code`, `.r-img`, 본문 15pt/27pt.
  - 카테고리 매핑 예: `report`=제목박스+개조식(rp_gen 표준 그대로), `one-paper`=헤드라인(`.r-headline`)+KPI(`.r-kpi`)+붙임배지(`.r-badge`, `#1B1760`), `meeting`=간결 헤더+참석자/결정사항 강조, `proposal`=섹션 넘버링+비교표 강조, `technical`=코드블록·표 가독 우선.
  - **제외**: `.blk/.ed/.colgrip/.blk-tools/.bt-del`(rp_gen 인라인 편집 UI), `.page/.pno`(md_editor `.a4-canvas`/`.a4-sheets`가 이미 담당). 치수·본문 타이포만 CSS 변수로 흡수.
- 이 CSS는 세 표면 모두에 적용: `.a4-canvas .ProseMirror.report-theme--report`, `.print-pages.report-theme--report`, `.pdf-preview-sheet.report-theme--report` — 편집=인쇄=PDF 동형 보장.
- `globals.css`의 `@media print`(`:325`)와 `@page{size:A4;margin:0}`(`:326`)가 rp_gen CSS와 중복되므로 **한쪽으로 단일화**한다. (주의: `globals.css`는 과거 CSS 오류로 앱 전체 렌더가 죽은 전례가 있어 — 14_02의 `.print\:hidden` — 신중히.)

### 2. 양식 선택 — 프론트매터 `reportTheme`

- 기존 패턴 재사용: `src/lib/page-mode.ts`가 이미 `gray-matter`로 프론트매터를 읽고(`pageModeFromMarkdown`), HTML에 심긴 `<template data-frontmatter>`에서도 읽는다(`pageModeFromHtml`). 이와 **대칭**으로 `src/lib/report-theme.ts`(신규) — `reportThemeFromMarkdown()`/`reportThemeFromHtml()` 작성.
- 프론트매터 키 `reportTheme: report | meeting | proposal | technical | one-paper | plain` (기본 `plain`). 값 → `.report-theme--{value}` 클래스.
- **왕복 보존은 기존 메커니즘이 이미 보장**: `src/lib/markdown.ts:76` `mdToHtml()`이 프론트매터를 `<template data-frontmatter>`로 심고, `htmlToMd()`(`:62`)가 저장 시 본문 앞에 재부착 → 양식값이 저장/재열기에 보존.
- **템플릿 시딩**: `templates/report/*.md`(3), `templates/meeting/*`, `templates/proposal/*`, `templates/technical/*`, `templates/one-paper/*`(2) 각 `.md` 프론트매터에 `reportTheme: {해당 topic}` 추가. 템플릿은 이미 `topic:` 필드를 갖고 있으므로(`weekly-report.md`→`topic:"report"`) 값이 그대로 대응한다.
- `scripts/build-templates.mjs`는 `gray-matter`로 프론트매터를 읽어 `public/templates.json` 생성 — `reportTheme` 추가 키가 파이프라인을 깨지 않는지 확인(현재 `TOPIC_DISPLAY`/`TOPIC_ORDER`만 참조하므로 통과 예상).
- 툴바(`src/components/editor/editor-toolbar.tsx`)에 양식 토글 셀렉트 추가(여백 프리셋 셀렉트 `:282` 옆).

### 3. 실측 페이지 분할 — `src/lib/paginate.ts` (신규, `paginate.js` TS 포팅)

- 이식: `makeRuler()`(화면 밖 168mm 측정 컨테이너), `measure()`(`getBoundingClientRect().height`), `splitTable()`(표 행 단위 분할 + `thead` 복제로 헤더 반복), `paginate()`(누적 초과 시 개페이지, 제목 고아 방지 `+mm(22)`, 대형 이미지 축소).
- **중복 제거**: rp_gen `mm()`(px 환산)은 md_editor `src/lib/a4-margins.ts`의 `mmToPx()`와 동일 목적 → `mmToPx()`로 통일.
- **입력 어댑터** `src/lib/report-blocks.ts`(신규): rp_gen은 `md_blocks.parse()`가 만든 `{id,kind,html}` 배열을 받지만 md_editor는 Tiptap HTML을 쓴다. 최상위 요소를 훑어 동등 블록 배열 생성. `kind` 판정은 rp_gen이 특별 취급하는 `pagebreak/heading/badge/image/table`만 구분.
- **자동 분할은 표시 계층 전용**: 결과는 미리보기·인쇄 DOM에만 반영하고 **Tiptap 문서에는 쓰지 않는다**. 현재 `src/hooks/use-auto-page-break.ts`는 자동 분할 결과를 `pageBreak` 노드로 문서에 삽입한다(`:86`) — 이것이 여백/양식 변경 시 재계산되며 왕복 무결성 위험원. 노드 삽입 로직(`:52`~`:89`)을 제거하고 `paginate.ts` 호출로 대체. 사용자가 툴바로 **명시 삽입**한 `pageBreak`만 문서에 남아 `markdown.ts`의 `---pb---` 토큰으로 계속 왕복(기존 동작 유지).

### 4. 벡터 PDF — Chrome 이식

- `src/app/print/page.tsx`(신규): rp_gen `templates/print.html` 역할. 이미지 로드 완료 후 분할, 완료 시 `document.documentElement`에 `data-ready="1"`·`data-pages=N` 설정, 8초 타임아웃 폴백. (rp_gen 신호 규약 그대로.)
- `src/lib/pdf/export.ts`(신규, `export_pdf.py` 포팅): `find_browser()`(Chrome/Edge 7경로+glob 폴백, 미설치 시 탐색 경로 나열 오류), `html_to_pdf()`(`--headless=new --no-sandbox --print-to-pdf-no-header --print-to-pdf=` 등 인자 이식), `page_count()`(`/Type /Page` − `/Type /Pages`, 의존성 없음 — 쪽수 일치 검증에 사용).
  - **개선/결정**: rp_gen은 `--virtual-time-budget=12000`으로 렌더 완료를 추측. md_editor엔 Playwright(`@playwright/test`, devDependency)가 있어 `waitForSelector('html[data-ready="1"]')`로 확정 대기 가능. 단 프로덕션 의존성 승격이 필요 → 승격을 원치 않으면 `child_process.spawn`으로 rp_gen 원본 방식 유지. **실행 전 확인 대상.**
- `src/app/api/pdf/route.ts`(신규): `POST { filePath, root, html, marginPresetId, reportTheme }` → 임시 HTML → 헤드리스 Chrome이 `/print` 인쇄 → PDF 반환. `src/app/api/fs/route.ts`의 `{action, root}`+`ok()` 응답 패턴에 맞춤. 경로 보안은 rp_gen `safe_path()`(ROOT 밖 `abort(403)`) 규약을, 있으면 `src/lib/fs/server.ts` 기존 검증을 재사용.
- **래스터 폐기**: `src/components/editor/pdf-export-preview.tsx`의 `handleSave()` 본체(html2canvas+jsPDF)를 `/api/pdf` 호출로 교체(미리보기 UI 셸은 유지). `package.json`에서 `jspdf`·`html2canvas`·`html2canvas-pro` 제거(실제 import는 `html2canvas-pro` 하나뿐, `pdf-export-preview.tsx:5`).

---

## 신규/수정 파일

**신규**
- `src/app/report-theme.css` — 카테고리별 5개 CSS 테마
- `src/lib/report-theme.ts` — 프론트매터 양식 선택(`page-mode.ts` 대칭)
- `src/lib/paginate.ts` — 실측 A4 분할(`paginate.js` 포팅)
- `src/lib/report-blocks.ts` — Tiptap HTML→블록 어댑터
- `src/lib/pdf/export.ts` — 헤드리스 Chrome 호출(`export_pdf.py` 포팅)
- `src/app/api/pdf/route.ts` — PDF 생성 API
- `src/app/print/page.tsx` — 인쇄 전용 렌더 라우트

**수정**
- `src/hooks/use-auto-page-break.ts` — 분할 엔진 교체 + 노드 삽입 제거 (**위험 높음**: 15_01에서 복원한 bunri 동작의 핵심, 회귀 시 "페이지 구분 사라짐" 재발)
- `src/components/editor/pdf-export-preview.tsx` — 저장 경로를 `/api/pdf`로
- `src/components/editor/editor-toolbar.tsx` — 양식 토글 추가
- `src/components/editor/tiptap-editor.tsx` — `.report-theme--{topic}` 클래스 적용(`.print-pages` `:285`, PdfExportPreview 마운트 `:291`)
- `src/app/globals.css` — `@page`/`@media print` 중복 단일화 (**주의**: 과거 CSS 오류로 앱 렌더 죽은 전례)
- `templates/{report,meeting,proposal,technical,one-paper}/*.md` — 프론트매터 `reportTheme` 시딩
- `package.json` — jspdf·html2canvas·html2canvas-pro 제거, (선택) playwright 승격

---

## 구현 순서

1. `report-theme.css` 5개 카테고리 테마 + `.report-theme` 베이스, `@page` 중복 단일화
2. `report-theme.ts` + 프론트매터 `reportTheme` + 툴바 토글 + 템플릿 5종 시딩
3. `paginate.ts` 포팅 + `report-blocks.ts` 어댑터
4. `use-auto-page-break.ts` 교체(노드 삽입 제거 → 표시 계층)
5. `/print` 라우트 + `data-ready` 신호
6. `pdf/export.ts` + `/api/pdf` + 래스터 경로 폐기 + 의존성 정리
7. (2차 후보) one-paper `.r-headline/.r-badge/.r-kpi`는 표준 마크다운 문법이 없어 Tiptap 커스텀 노드+슬래시 커맨드+왕복 직렬화 필요 → CSS만으로 되는 카테고리 먼저 완성 후 분리 착수

---

## 검증 (실행 결과로만 판정, 예측 금지)

rp_gen README §4 검증 기준을 승계한다. Playwright e2e로 작성(기존 `e2e/pdf-save-flow.spec.ts`가 래스터 전제 단언을 가지면 함께 갱신).

| # | 시나리오 | 방법 | 통과 기준 |
|---|----------|------|-----------|
| 1 | 쪽수 일치 | `/print`의 `data-pages` vs `page_count()` | 동일(다르면 `@page` 여백 불일치) |
| 2 | 왕복 무결성 | 편집 없이 열기→저장 | 원본 마크다운과 바이트 동일 |
| 3 | 표 분할 | 긴 표 문서 PDF | 쪽 넘김 시 헤더 반복 |
| 4 | 양식 보존 | `reportTheme` 문서 저장→재열기 | 양식 유지 |
| 5 | 벡터 확인 | PDF 텍스트 드래그 | 선택됨(래스터 아님) |
| 6 | WYSIWYG 편집 | 양식 적용 상태에서 표 셀·문단 수정 | Tiptap으로 그 자리 수정됨 |
| 7 | 카테고리 5종 | 각 템플릿 새 문서 생성 | 5개 서로 다른 양식으로 렌더 |

- 검증 실행 기준: `next dev`(:3000) + `tsc --noEmit`. **주의**: `next build`는 Next 16/`@serwist` Turbopack↔webpack 충돌로 본 작업과 무관하게 기존부터 실패 중(15_01 기록) → 빌드 복구는 별도 과제.
- Chrome 미설치 환경에서는 PDF 불가 → `find_browser()` 명확한 오류 + `window.print()` 폴백 안내.

---

## 실행 전 확인 대기

1. §4 PDF 대기 방식: Playwright 프로덕션 승격 vs `spawn` 직접 호출(rp_gen 원본과 동일)
2. one-paper의 배지/KPI/헤드라인 3종을 2차(순서 7)로 분리하는 안
3. 이식 완료 후 `D:\dev\md_editor\rp_gen` 폴더 삭제 여부(기본: 보존, 01.legacy-protection)
