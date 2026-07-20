# 프린트(인쇄) + 온스크린 A4 페이지화

> 상태: Done | 완료일: 2026-07-14
> 작업 유형: 기능 개선/신규 기능 (Type B)
> 작성일: 2026-07-14

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-14 | §전체 | 최초 작성 (네이티브 인쇄 + 온스크린 A4 가이드) |
| 2026-07-14 | §요구 6 | 인쇄 A4 적용 범위를 "A4 모드일 때만" → "항상 A4"로 변경 (사용자 확인) |
| 2026-07-14 | §요구 7,8 | 온스크린 A4 페이지화(시각적 용지 가이드) 추가 (사용자 확인) |

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1 | 에디터 툴바에 '인쇄' 버튼이 노출되는가? | Y | Y — editor-toolbar.tsx Print ToolButton |
| 2 | 버튼 클릭 시 `window.print()` 인쇄 대화상자가 열리는가? | Y | Y — onClick={() => window.print()} |
| 3 | 인쇄 시 사이드바/탭바/툴바/저장버튼이 숨겨지는가? | Y | Y — print:hidden 적용 |
| 4 | 인쇄물 하단에 `현재페이지 / 전체페이지` 번호가 찍히는가? | Y | Y — @page @bottom-center counter(page)/counter(pages) |
| 5 | 다크모드여도 인쇄는 흰바탕·검은글씨인가? | Y | Y — @media print 강제 #fff/#000 |
| 6 | 인쇄 시 뷰 모드와 무관하게 항상 210mm·15mm/20mm A4로 나오는가? | Y | Y — @media print .ProseMirror width 210mm |
| 7 | 편집 화면(A4 모드)에 297mm 간격 흰 A4 용지+여백이 반복 표시되어 페이지 경계가 보이는가? | Y | Y — .a4-canvas repeating gradient |
| 8 | A4 가이드 모드에서도 내용을 끊김 없이 편집할 수 있는가? | Y | Y — 단일 contenteditable 유지 |

## 현재 시스템 분석

- `src/components/editor/tiptap-editor.tsx:64-70` — `pageMode==="a4"` 시 `.ProseMirror`에 `min-h-[297mm] w-[210mm] mx-auto bg-white dark:bg-card shadow-lg rounded-none px-[15mm] py-[20mm]`. 현재 1장 긴 시트.
- `tiptap-editor.tsx:107-118` — 외곽 `.tiptap-editor`(a4 시 `flex flex-col items-center py-8 bg-muted/30`), 내부 `<div className={space-y-8}><EditorContent/></div>`.
- `src/components/editor/editor-toolbar.tsx` — 공용 툴바(A4/Wide 토글 마지막).
- chrome 숨김 대상: `src/app/(markdown)/layout.tsx`(aside 103, SheetTrigger 109, 외곽 101, main 117), `src/components/tab/tab-bar.tsx`(29), `src/app/(markdown)/[[...path]]/editor-page.tsx`(헤더 100, 스크롤랩 124), `src/components/tab/doc-tab-content.tsx`(헤더 132, 스크롤랩 173).

## 구현 상세

### 1. 툴바 Print 버튼 — `editor-toolbar.tsx`
- `import { Printer } from "lucide-react"` 추가. A4/Wide 토글 뒤 `ToolButton`: `onClick={() => window.print()}`, label `"Print (Ctrl+P)"`, `<Printer className="size-4" />`.

### 2. 온스크린 A4 용지 가이드 — `tiptap-editor.tsx`
- `editorProps.attributes.class` A4 분기: `bg-white dark:bg-card shadow-lg` → `bg-transparent`(캔버스 용지가 비침), `shadow-lg` 제거.
- `EditorContent`를 A4 모드에서 `<div className="a4-canvas">`로 래핑(wide 모드는 기존 그대로).

### 3. `.a4-canvas` + 인쇄 CSS — `src/app/globals.css`
- `.a4-canvas`: 230mm 캔버스, 210mm 흰 용지가 297mm마다 반복, 14mm 회색 간격.
- `@media print`: @page margin 0 + 페이지 번호, 강제 흰바탕/검은글씨, chrome 숨김 대체, `.ProseMirror` 210mm·20mm/15mm, `.a4-canvas` 배경 제거.

### 4. chrome 숨김/리셋 — Tailwind `print:` variant
- `layout.tsx`: aside·SheetTrigger→`print:hidden`; 외곽→`print:h-auto print:overflow-visible`; main→`print:overflow-visible`.
- `tab-bar.tsx` 래퍼→`print:hidden`.
- `editor-page.tsx` 헤더→`print:hidden`; 스크롤랩→`print:overflow-visible`.
- `doc-tab-content.tsx` 헤더→`print:hidden`; 스크롤랩→`print:overflow-visible`.

## 구현 순서

| 순서 | 작업 | 의존 |
|------|------|------|
| 1 | 툴바 Print 버튼 추가 | — |
| 2 | tiptap-editor A4 래핑(a4-canvas) + ProseMirror 투명화 | — |
| 3 | globals.css .a4-canvas + @media print(항상 A4) | — |
| 4 | chrome 요소 print:hide/reset | — |
| 5 | npm run lint + 인쇄 미리보기·화면 A4 가이드 확인 | 1-4 |

## 알려진 한계
- 시각 가이드는 연속 편집이라 내용 높이가 정확히 297mm 단위가 아니면 용지 경계와 미세 정렬 오차 가능. 인쇄는 `@page`로 정확히 A4 페이지화됨.
