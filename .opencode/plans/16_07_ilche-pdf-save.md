# 일체(ilche) 모드 PDF 저장 — 폭 A4 고정 / 길이=내용 연속 한 장 + 인쇄 대화상자 제거

> 상태: Done(구현·검증 완료) | 작성일: 2026-07-16
> 작업 유형: 기능 수정(F) — PDF 저장 플로우 전면 변경
> 관련: globals.css, pdf-export-preview.tsx, tiptap-editor.tsx

---

## 1. 요구사항 (사용자 확정)

- 일체(ilche) 모드에서 "PDF 저장" 시:
  - **폭**: A4(210mm) 고정
  - **길이**: 문서 내용이 있는 만큼 → 용지(흰 배경)가 그 길이만큼 늘어남
  - **텍스트**: 원래 크기, A4 폭에 맞춰 줄바꿈, 축소 없이 연속 배치
  - **미리보기 모달**: 실제 저장될 PDF와 동일하게 폭 210mm·길이=내용인 긴 연속 시트
- **인쇄 대화상자(`window.print`) 의존 금지** — 사용자 명시: "인쇄페이지로 가게 만들지 말라"
- 저장 방식: 브라우저 인쇄 창 없이 **실제 PDF 파일 다운로드**

---

## 2. 원인 분석 (문제 있었던 지점)

1. **미리보기 시트 고정 높이**: `globals.css`의 `.pdf-preview-sheet`에 `min-height: 297mm`(A4 한 장)가 있어, 내용이 넘치면 용지 박스 밖으로 텍스트가 빠짐.
2. **저장이 인쇄 대화상자 경유**: `tiptap-editor.tsx`가 `window.print()`를 호출 → 브라우저 인쇄 대화상자가 `@page size`를 A4로 clamp해서 A4 한 장에 고정·내용 넘침. 사용자가 본 핵심 현상.
3. **dev 서버 CSS 캐시**: 수정 후에도 구 CSS(`min-height:297mm`)를 서빙해서 변화가 없는 것처럼 보임 (HTTP로 확인됨).
4. **html2canvas oklch 크래시**: Tailwind v4가 `oklch()` 색상을 쓰는데 기본 `html2canvas`가 파싱 불가 → 캡처 단계에서 `pageerror`. `html2canvas-pro`로 해결.

---

## 3. 수정 내역

### 3.1 `src/app/globals.css`
- `.pdf-preview-sheet`에서 `min-height: 297mm` 제거 → `width: 210mm`만 유지, 내용만큼 높이 자동 증가.
- ilche 미리보기/화면에서 `.page-break` 숨김 규칙(`display:none`) 유지.
- 미리보기 배경 밝게(`#e5e7eb`), 오버레이 투명도 조정.

### 3.2 `src/components/editor/pdf-export-preview.tsx` (전면 재작성)
- props: `html`, `marginPresetId`, `onClose` (기존 `onSave` 제거 — 저장 로직을 컴포넌트 내부로 흡수)
- "PDF로 저장" 클릭 → `handleSave`:
  1. `.pdf-preview-sheet` DOM을 `html2canvas-pro`로 캡처 (`scale:2`, 배경 `#fff`)
  2. `sheet.scrollWidth/scrollHeight` → mm 변환
  3. `new jsPDF({ unit:'mm', format:[widthMm, heightMm] })` → 폭 210mm·길이=내용 한 장
  4. 캡처 이미지를 `pdf.addImage` → `pdf.output('blob')` → `<a download>`로 실제 파일 저장
  5. 성공 시 `onClose()`, 실패 시 `window.__saveErr` 기록 + 모달 유지
- `window.print` 호출 **없음**.

### 3.3 `src/components/editor/tiptap-editor.tsx`
- `pdfExport`/`pdfHeightMm` state 및 `@page` print 스타일 effect 제거.
- `md-editor:export-pdf` 핸들러: ilche는 미리보기 모달 open (`setPdfPreviewOpen(true)`), 그 외(bunri/wide)는 기존 `window.print()` 백업 유지.
- `pdfExport` 트리거 `window.print()` effect 삭제.
- `PdfExportPreview` 사용 시 `onSave` prop 제거.
- `printRef`/`beforeprint`/`afterprint`는 bunri/wide 인쇄 경로용으로 잔존.

### 3.4 의존성
- `npm install jspdf html2canvas-pro` (jspdf ^4.2.1, html2canvas-pro ^2.2.4)
- 기존 `html2canvas`는 미사용(oklch 크래시) → 교체.

---

## 4. 검증 결과 (Playwright `e2e/pdf-save-flow.spec.ts`)

실제 저장된 PDF 파일을 직접 측정:

```
인쇄 대화상자(window.print) 호출 : 없음 ✓
미리보기 시트 : 폭 A4(≈794px), 높이 A4 한 장(1122px) 초과 연속 ✓
저장 PDF PAGE COUNT : 1
MediaBox(pt) : [0, 0, 595.5, 5755.5]
폭(mm) : 210.1   (A4 고정 ✓)
길이(mm) : 2030.5 (내용분량, A4 한 장 297mm 초과 ✓)
```

- lint 통과, `npm run build` 통과.
- 기존 `pdf-real.spec.ts`, `pdf-export-ilche.spec.ts`는 구 `window.print`/`@page` 방식에 의존해 폐기(삭제), 신규 `pdf-save-flow.spec.ts`로 대체.

---

## 5. 사용자 알림 사항

- **dev 서버 재시작 필요**: 구 CSS(`min-height:297mm`) 캐시 해소를 위해 `next dev` 재시작해야 화면에 반영됨.
- 저장 PDF는 이미지 기반(jspdf 캡처)이라 텍스트 선택 불가 — 미리보기와 100% 동일 외형, 한글 깨짐 없음. (텍스트 선택 필요 시 별도 요청)

---

## 6. 향후 선택적 개선

- 텍스트 선택 가능한 벡터 PDF 생성(레이아웃 재구현) — 현재는 이미지 캡처 방식.
- 미리보기 모달에 실제 저장될 긴 종이 스크롤 미리보기 강화.
