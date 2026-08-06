# 계획서 — 제목(헤딩) 자동 번호 매기기 툴바 토글 기능

> 상태: Pre-Done | 작성일: 2026-07-27
> 작업 유형: B (기능 개선)
> 선행: -

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-27 | 최초 작성 | 코드 구현이 지침의 계획서 작성 절차 없이 먼저 진행되어, 완료된 구현을 근거로 계획서를 사후 작성함(§실행 로그 참조) |

---

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | 번호 매기기는 항상 켜진 기본값이 아니라 툴바의 On/Off 토글 버튼으로 제공되는가? | Y (사용자 확답: "툴바 토글 버튼") | Y — `src/components/editor/editor-toolbar.tsx:387-393` `ToolButton`(아이콘 `ListTree`), `isActive={headingNumbering}` |
| 1.2 | 토글 상태는 앱 전역 설정이 아니라 문서(파일)별로 따로 저장되는가? | Y | Y — 문서 프론트매터 필드 `headingNumbering: true`로 저장. `src/components/tab/doc-tab-content.tsx:152-163` `handleHeadingNumberingChange`가 `frontmatter.headingNumbering`을 갱신하고 `injectFrontmatter`로 탭 콘텐츠에 즉시 반영 |
| 1.3 | 토글을 켜면 편집 화면에서 h1~h4 제목 앞에 `1 / 1.1 / 1.1.1 / 1.1.1.1` 형식 번호가 자동으로 붙는가? | Y | Y — `src/app/globals.css:169-219`, CSS counter(`hn1~hn4`)로 `::before` 콘텐츠 생성. 본문 텍스트는 변경하지 않음(제목 추가·삭제·재배치 시 자동 재계산) |
| 1.4 | 같은 번호가 인쇄 미리보기/PDF 출력에도 동일하게 반영되는가? | Y | Y — `src/components/editor/tiptap-editor.tsx:125,370,386,398`: `headingNumberingClass()`가 반환한 클래스를 편집 화면(`a4-canvas--bunri`, `a4-canvas--ilche`) 컨테이너와 인쇄용 `print-pages` 컨테이너(`printRef`) 3곳 모두에 동일하게 적용 |
| 1.5 | DOCX로 내보내면 번호가 실제 텍스트로 문서에 삽입되는가(뷰어 없이도 보이는가)? | Y (사용자 확답: "DOCX/HWPX 내보내기까지 포함") | Y — `src/lib/docx-export.ts:205-211` `headingParagraph()`: `HeadingNumberer.next(depth)`로 계산한 번호를 굵은 `TextRun`으로 헤딩 런 배열 맨 앞에 삽입. `buildDocx()`(:327,335)가 마크다운 프론트매터에서 플래그를 읽어 numberer 생성 |
| 1.6 | HWPX로 내보내도 동일하게 번호가 텍스트로 삽입되는가? | Y | Y — `src/lib/hwpx-plan.ts:120-129` `blockToPlan()`이 동일한 `HeadingNumberer.next(depth)` 값을 `{text, bold:true}` run으로 헤딩 앞에 삽입. `mdToHwpxPlan()`(:203,208)이 플래그·numberer 생성 |
| 1.7 | HWPX 내보내기에서 한글(HWP) 자체 다단계 번호(가./나.) 기능과 충돌해 번호가 중복 표시되지 않는가? | Y | Y — 번호를 OWPML 아웃라인 레벨(`outlineLevel`) 속성이 아닌 **일반 텍스트**로 헤딩 문자열에 선삽입하는 방식만 사용. `scripts/hwpx_gen.py`는 런 텍스트를 그대로 이어 붙이는 기존 로직을 그대로 사용하므로 Python 쪽 수정 없이 호환됨(코드 변경 없음, 읽기로만 확인) |
| 1.8 | 토글을 끈 문서는 기존 동작과 완전히 동일한가(회귀 없음)? | Y | Y — 모든 신규 로직이 `headingNumbering`(boolean, 기본 `false`) 분기 뒤에서만 동작. CSS는 `.heading-numbered` 클래스가 없으면 미적용, export의 `numberer`는 `null`이면 헤딩 앞 텍스트 삽입을 건너뜀(`docx-export.ts:208`, `hwpx-plan.ts:126`) |
| 1.9 | h5/h6 제목에는 번호가 매겨지지 않는가? | Y | Y — CSS는 h4까지만 규칙 존재(`globals.css:210-219`), export 쪽도 `depth <= 4`일 때만 번호 삽입(`docx-export.ts:208`, `hwpx-plan.ts:126`) |

---

## 1. 배경 및 목적

md_editor는 리포트 테마(`report-theme.ts`)·페이지 모드(`page-mode.ts`)처럼 문서 단위 서식 옵션을 프론트매터에 저장하는 패턴을 이미 갖고 있으나, 제목(헤딩)에 Word/한글(HWP)의 "다단계 목록"과 같은 자동 번호를 매기는 기능은 없었다.

사용자는 이 번호 매기기 기능을 다음 조건으로 요청했다:
1. 항상 켜진 기본값이 아니라 **툴바의 별도 토글 버튼**으로 제공될 것(Word/한글처럼)
2. **DOCX/HWPX 내보내기까지** 실제 번호가 반영될 것(편집 화면 미리보기에서만 보이는 것으로는 부족)

## 2. 현재 시스템 분석 (구현 시점 실측)

### 2.1 기존 문서 단위 토글 패턴 (참고 선례)

- `src/lib/report-theme.ts` — `reportThemeFromMarkdown(md)` / `reportThemeFromHtml(html)` / `reportThemeClass(value)` 3분법: 마크다운 프론트매터 읽기, 편집 중 HTML의 `<template data-frontmatter="...">` 읽기, CSS 클래스명 반환
- `src/components/tab/doc-tab-content.tsx:45-57` — `pageMode`/`reportTheme`을 문서 로드 시 `tab.content`(HTML) 또는 파일(md)에서 초기 state로 복원
- `src/components/tab/doc-tab-content.tsx:73-92` — 파일 최초 로드 시 `readMdFile` → 마크다운 기준으로 각 state 재설정

이 선례를 그대로 `headingNumbering`에 대칭 적용했다(§2.2).

### 2.2 3면 렌더링 표면 (반영 필요 지점)

`tiptap-editor.tsx`에는 서식 클래스를 받아야 하는 3개의 서로 다른 DOM 컨테이너가 있다(triple-selector 패턴):
- `.a4-canvas.a4-canvas--bunri` (분리 모드 편집 화면, :370)
- `.a4-canvas.a4-canvas--ilche` (일체 모드 편집 화면, :386)
- `.print-pages` (인쇄/PDF, `printRef`, :398)

globals.css의 `.heading-numbered` 규칙(:169-219)도 이 3개 선택자에 동일하게 정의되어 있다(`.a4-canvas.heading-numbered .ProseMirror`, `.print-pages.heading-numbered`, `.pdf-preview-sheet.heading-numbered`).

> 참고: `.pdf-preview-sheet` 선택자는 CSS에 존재하지만, 실측 결과(`grep`) 현재 어떤 `.tsx`도 이 클래스를 렌더링하지 않는다 — `git status`상 `src/components/editor/pdf-export-preview.tsx`가 삭제(`D`) 상태로 이 세션 작업과 무관하게 이미 제거되어 있었기 때문이다(본 계획서 작업 범위 밖, 기존 상태).

### 2.3 내보내기 파이프라인 (DOCX/HWPX)

- `docx-export.ts` / `hwpx-plan.ts` 둘 다 `marked.lexer()`로 동일한 마크다운 토큰을 순회하며 각각 `docx` 라이브러리 객체 / HWPX용 JSON plan을 만든다.
- `hwpx-plan.ts`가 만든 plan은 `scripts/hwpx_gen.py`(Python, `python-hwpx` 라이브러리)에 JSON으로 전달되어 실제 OWPML을 조립한다.
- `scripts/hwpx_gen.py`의 런(run) 처리 로직은 헤딩의 모든 run 텍스트를 그대로 이어붙이는 방식이므로, 번호를 별도 run으로 앞에 추가해도 **Python 쪽 코드 변경 없이** 그대로 반영된다(읽기로 확인, 수정 없음).
- 코드 주석(`hwpx-plan.ts` 기존 관련 로직 확인 결과)상 한글(HWP) 문서의 네이티브 아웃라인 번호(`outlineLevel` 기반 자동 "가./나.")는 텍스트 번호와 별개로 자체 발동하므로, **아웃라인 속성이 아닌 순수 텍스트 삽입**으로 우회해야 중복 번호를 피할 수 있음을 사전에 확인했다.

## 3. 구현 상세 (완료됨)

### 3.1 신규 파일: `src/lib/heading-numbering.ts`

`report-theme.ts`와 대칭 구조로 작성:

```typescript
// heading-numbering.ts 전체 구조(43줄)
const FRONTMATTER_KEY = "headingNumbering"
function normalize(value: unknown): boolean  // true 또는 "true" 문자열만 인정
export function headingNumberingFromMarkdown(md: string): boolean   // gray-matter로 프론트매터 파싱(:15-22)
export function headingNumberingFromHtml(html: string): boolean     // <template data-frontmatter> 정규식 추출 후 파싱(:24-36)
export function headingNumberingClass(enabled: boolean): string     // "heading-numbered" | ""(:39-41)
export class HeadingNumberer {                                       // (:45-54)
  private counters = [0, 0, 0, 0]
  next(depth: number): string  // depth 1~4로 clamp, 해당 레벨 증가 + 하위 레벨 리셋, "1.2.3" 형식 join
}
```

### 3.2 CSS: `src/app/globals.css:169-219`

`table { margin: 1em 0; }` 규칙(:163-167) 바로 뒤에 삽입. `.heading-numbered` 클래스가 붙은 3개 표면 선택자에 대해 h1~h4까지 `counter-reset`/`counter-increment`/`::before { content: counter(...) }` 체인을 정의. h5/h6은 대상 아님.

### 3.3 툴바 버튼: `src/components/editor/editor-toolbar.tsx`

- Props 확장(:119-131): `headingNumbering?: boolean`, `onHeadingNumberingChange?: (enabled: boolean) => void`
- 아이콘 임포트: `ListTree`(:55)
- 버튼 배치(:384-393): heading-accent 색상 드롭다운 다음, 폰트 크기 select 이전. 클릭 시 `onHeadingNumberingChange?.(!headingNumbering)` 토글, `isActive={headingNumbering}`로 On 상태 표시

### 3.4 편집기 컨테이너: `src/components/editor/tiptap-editor.tsx`

- Props 확장(:117): `headingNumbering?: boolean`(기본 `false`)
- `numberingClass = headingNumberingClass(headingNumbering)`(:125)
- 3개 컨테이너에 `cn(..., numberingClass)`로 적용: bunri(:370), ilche(:386), print(:398)

### 3.5 상태·영속화: `src/components/tab/doc-tab-content.tsx`

- state 추가(:52-54): `headingNumbering`, 초기값은 `tab.content`(HTML)에서 복원
- 파일 최초 로드 시(:82) 마크다운 기준으로 재설정
- `handleHeadingNumberingChange`(:152-163): `report-theme` 핸들러(:140-149)와 동일 패턴 — state 갱신 + `frontmatter.headingNumbering` 갱신(꺼짐이면 키 삭제, 켜짐이면 `true`) + `injectFrontmatter`로 탭 콘텐츠 즉시 반영 + dirty 표시
- `<EditorToolbar>`(:321), `<TiptapEditor>`(:337)에 각각 `headingNumbering`/`onHeadingNumberingChange` prop 전달

> API 라우트(`src/app/api/export/docx/route.ts`, `.../hwpx/route.ts`)와 저장/자동저장 fetch 바디는 **변경하지 않음** — 토글 값이 프론트매터 왕복(`injectFrontmatter`/추출)에 이미 실려 저장되므로, 내보내기 시 마크다운을 다시 읽는 `buildDocx`/`mdToHwpxPlan`이 자체적으로 값을 읽는다.

### 3.6 DOCX 내보내기: `src/lib/docx-export.ts`

- import 추가(:24): `headingNumberingFromMarkdown`, `HeadingNumberer`
- `headingParagraph(t, accent, numberer)`(:205-211): `numberer`가 있고 `depth <= 4`면 `numberer.next(depth)` 값을 굵은 `TextRun`으로 런 배열 맨 앞에 삽입
- `blockToElements(token, accent, numberer)`(:244,247): 헤딩 처리 시 `numberer`를 그대로 전달
- `buildDocx()`(:320-339): 마크다운 프론트매터에서 `headingNumbering` 플래그를 읽고(:327), 켜져 있으면 새 `HeadingNumberer` 인스턴스를 만들어(:335) 토큰 순회 동안 공유

### 3.7 HWPX 내보내기: `src/lib/hwpx-plan.ts`

- import 추가(:7): 동일
- `blockToPlan(token, out, numberer)`(:120-129): 헤딩 처리 시 `numberer.next(depth)` 값을 `{text, bold:true}` run으로 선삽입
- `mdToHwpxPlan()`(:195-217): 플래그 읽기(:203), numberer 생성(:208), 토큰 순회 동안 공유(:209)

### 3.8 구현 순서 (실제 진행 순서, 완료됨)

| 순서 | 작업 내용 | 상태 |
|------|-----------|------|
| 1 | `heading-numbering.ts` 신규 작성(프론트매터 헬퍼 + `HeadingNumberer`) | 완료 |
| 2 | `globals.css`에 `.heading-numbered` CSS counter 규칙 추가 | 완료 |
| 3 | `editor-toolbar.tsx`에 토글 버튼 추가 | 완료 |
| 4 | `tiptap-editor.tsx`에 prop 연결 + 3개 컨테이너에 클래스 적용 | 완료 |
| 5 | `doc-tab-content.tsx`에 state/핸들러/prop 전달 배선 | 완료 |
| 6 | `docx-export.ts`에 번호 삽입 로직 추가 | 완료 |
| 7 | `hwpx-plan.ts`에 번호 삽입 로직 추가(`scripts/hwpx_gen.py`는 무변경으로 호환 확인) | 완료 |
| 8 | `tsc --noEmit` + `eslint` 검증 | 완료 (§실행 로그) |
| 9 | 브라우저 실동작 확인(편집/인쇄/DOCX/HWPX 내보내기 육안 확인) | **미완료 — 본 계획서에서 Pre-Done으로 표시하는 이유** |

---

## 4. 영향도 분석

| 파일 | 변경 내용 | 영향 |
|------|-----------|------|
| `src/lib/heading-numbering.ts` | 신규 | 없음(신규 모듈) |
| `src/app/globals.css` | `.heading-numbered` 규칙 추가 | 기존 규칙 변경 없음(신규 클래스 조합에만 적용), 클래스 미부여 시 기존 동작과 동일 |
| `src/components/editor/editor-toolbar.tsx` | Props 확장 + 버튼 1개 추가 | 툴바 레이아웃에 버튼 1개 추가, 기존 버튼 동작 무변경 |
| `src/components/editor/tiptap-editor.tsx` | Props 확장 + `numberingClass` 3곳 적용 | `headingNumbering` 미전달 시 기본값 `false`로 기존 동작과 동일 |
| `src/components/tab/doc-tab-content.tsx` | state/핸들러/prop 전달 추가 | `report-theme` 패턴을 그대로 복제, 기존 흐름 변경 없음 |
| `src/lib/docx-export.ts` | `headingParagraph`/`blockToElements`/`buildDocx` 시그니처에 `numberer` 매개변수 추가 | `numberer`가 `null`(토글 꺼짐)이면 분기 없이 기존과 동일한 출력 |
| `src/lib/hwpx-plan.ts` | `blockToPlan`/`mdToHwpxPlan` 동일 패턴 | 상동 |
| `scripts/hwpx_gen.py` | **무변경** | 런 텍스트 이어붙이기 로직이 선삽입된 번호 텍스트를 그대로 처리하므로 수정 불필요(읽기로 확인) |
| `src/app/api/export/docx/route.ts`, `.../hwpx/route.ts` | **무변경** | 신규 파라미터 없음(프론트매터 왕복만으로 충분) |

---

## 5. 테스트/검증 계획

| # | 시나리오 | 기대 결과 | 실측 상태 |
|---|----------|-----------|-----------|
| 1 | `npx tsc --noEmit` | 에러 0건 | **완료** — exit 0 (§실행 로그) |
| 2 | 관련 파일 `eslint` | 신규 에러 0건 | **완료** — 0 errors, 기존 무관 경고 2건(§실행 로그) |
| 3 | 문서를 열고 툴바의 "번호 매기기" 버튼 토글 | h1~h4 앞에 `1 / 1.1 / 1.1.1 / 1.1.1.1` 표시, 버튼이 active 상태로 표시 | 미검증(브라우저 미실행) |
| 4 | 분리 모드(bunri)/일체 모드(ilche) 전환 후에도 번호 유지 | 두 모드 모두 번호 표시 | 미검증 |
| 5 | 인쇄 미리보기/PDF 출력 | 편집 화면과 동일한 번호 표시 | 미검증 |
| 6 | 번호 매기기 켠 문서를 DOCX로 저장 후 열기 | 제목 텍스트 앞에 `1.1 ` 등 번호가 실제 문자로 포함 | 미검증 |
| 7 | 번호 매기기 켠 문서를 HWPX로 저장 후 한글에서 열기 | 번호가 정확히 1회만 표시(한글 자체 자동번호와 중복 없음) | 미검증 |
| 8 | 토글을 끄고 저장 → 다시 열기 | 번호 없이 기존과 동일하게 표시, 프론트매터에 `headingNumbering` 키 없음 | 미검증 |
| 9 | 제목을 추가/삭제/순서 변경 | 번호가 자동으로 재계산됨(수동 편집 불필요) | 미검증 |

> §9(3.8 표) 사유로 **#3~#9는 사용자 실행 또는 dev 서버 기동 승인 후** 검증 필요. 서버는 사용자 허락 없이 임의 실행하지 않는다는 기존 합의에 따라 본 세션에서는 실행하지 않았다.

---

## 6. 리스크 및 제약

- **DOCX/HWPX 번호는 "실제 텍스트"다**: 워드/한글의 네이티브 다단계 목록 번호 매기기(자동 갱신되는 필드)가 아니라 내보내기 시점에 계산되어 고정 삽입되는 일반 텍스트다. 내보낸 파일을 워드/한글에서 직접 제목을 추가·삭제하면 번호가 자동으로 재계산되지 않는다(다시 md_editor에서 편집 후 재내보내기해야 함). 이 트레이드오프는 HWP 네이티브 아웃라인 자동 번호와의 충돌(§2.3)을 피하기 위한 의도적 선택이다.
- **`.pdf-preview-sheet` 미연결**: CSS 규칙은 존재하나 현재 연결된 컴포넌트가 없다(§2.2, 기존 상태·본 작업 범위 밖). 향후 PDF 미리보기 컴포넌트가 복구되면 `numberingClass`를 동일하게 전달해야 한다.
- **저장소 상태**: `D:\dev\md_editor\md_editor`는 본 작업 이전부터 다수의 미커밋 변경·미추적 파일이 존재하는 상태였다(`git status --porcelain` 실측, §실행 로그). 커밋 시 본 계획서 관련 파일만 선별해 스테이징해야 한다.

---

## 실행 로그(수행일·작업자)

- **수행일**: 2026-07-27 (코드 구현은 계획서 작성 이전 세션에서 선행됨 — §수정 이력 참고)
- **명령 1** — 타입 체크
  ```
  cd /d/dev/md_editor/md_editor && npx tsc --noEmit; echo "EXIT:$?"
  ```
  결과: `EXIT:0` (에러 0건)

- **명령 2** — 관련 파일 lint
  ```
  cd /d/dev/md_editor/md_editor && npx eslint src/lib/heading-numbering.ts src/lib/docx-export.ts src/lib/hwpx-plan.ts src/app/globals.css src/components/editor/editor-toolbar.tsx src/components/editor/tiptap-editor.tsx src/components/tab/doc-tab-content.tsx
  ```
  결과: `✖ 2 problems (0 errors, 2 warnings)` — 경고 2건은 본 작업과 무관(`globals.css` eslint 설정 미대상 안내, `editor-toolbar.tsx:200` `headingAccentDropdownRef` 미사용 — 별개 계획서 `23_03_heading-accent-hr-style` 관련 기존 코드)

- **명령 3** — 신규/변경 대상 파일 확인
  ```
  grep -rn "headingNumbering|heading-numbered|HeadingNumberer|ListTree" src/
  ```
  결과: §3.1~3.7에 기술한 파일·줄번호와 일치(모두 실측 확인)

- **미실행 항목**: dev 서버 기동, 브라우저 육안 확인, DOCX/HWPX 파일 열어보기 — 사용자 승인 필요(§6, §5 표 하단 주석)
