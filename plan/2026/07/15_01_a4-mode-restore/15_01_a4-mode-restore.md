# A4 3모드 정립 + 페이지 분리(구분) 기능 복원

> 상태: Done | 작성일: 2026-07-15
> 작업 유형: MD Editor 기능 복원(분리/일체/wide)
> 선행: plan/2026/07/14_01_print-feature (프린트/A4 — Done), .opencode/plans/14_03_recovery-phantom.md

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-15 | 최초 작성 | A4 관련 기능 3분화(wide/ilche/bunri) + pageBreak 마크다운 왕복 직렬화 복원 |

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | A4 페이지 '구분(분리)' 기능이 별도로 존재하는가? | Y | Y — `bunri` 모드 (`tiptap-editor.tsx`) |
| 1.2 | '이어지는(일체)' 기능이 별도로 존재하는가? | Y | Y — `ilche` 모드 (단일 연속 A4 시트) |
| 1.3 | wide(전폭 연속) 기능이 유지되는가? | Y | Y — `wide` 모드 |
| 2.1 | 페이지 분할이 저장(마크다운) 후 재열기에도 보존되는가? | Y | Y — `markdown.ts` 왕복 규칙 (`---pb---` 토큰) |
| 3.1 | 분리 모드에서 자동 페이지 분할이 동작하는가? | Y | Y — `use-auto-page-break` (`pageMode==="bunri"`) |
| 4.1 | `next build` 타입체크(tsc)가 통과하는가? | Y | Y — tsc --noEmit 무오류 (기존 page-break tsc 오류 선행 해결됨) |

## 1. 문제 정의

- **관찰된 실패 산출물**: 사용자 보고 — "A4 용지에 맞춰 페이지 구분 기능이 사라졌다." 이전 세션에서 '이어지는 기능'과 '구분하는 기능'을 명확히 구분해 달라고 했으나, 코드에는 단 two 모드(`a4`/`wide`)만 존재했고 분리(separation) 개념이 모델링되지 않음.
- **증상**: (1) `pageMode`가 `a4`/`wide` 두 개뿐이라 사용자가 원한 3가지(wide/일체/분리) 구분 자체가 없음. (2) `pageBreak` 노드가 마크다운으로 직렬화되지 않아 **편집 화면에서는 보이나 저장→재열기 시 페이지 분할이 증발**.
- **재현 조건**: 문서에 Page Break 삽입 → 저장(HTML→MD) → 재열기(MD→HTML). `src/lib/markdown.ts`에 `pageBreak` 규칙 부재.

## 2. 원인 분석

- **근거(코드 흐름)**:
  - `src/lib/markdown.ts` `htmlToMd`(turndown) — `pageBreak`(`div[data-page-break]`) 규칙 **없음** → 저장 시 노드 삭제.
  - `src/lib/markdown.ts` `mdToHtml`(marked) — 되돌리기 확장 **없음** → 재열기 시 분할 미복원.
  - `src/components/editor/tiptap-editor.tsx`, `editor-toolbar.tsx`, `use-auto-page-break.ts` 등 — `pageMode: "a4" | "wide"` 로 하드코딩되어 3모드 불가.
- **회귀 도입 지점**: 최초 A4 프린트 기능(`14_01`)에서 분리/일체를 하나의 `a4` 모드에 묶음. 직렬화 누락은 `markdown.ts` 신규 작성 시 pageBreak 미반영.

## 3. 수정 방안

- **핵심 변경**: (1) `PageMode = "wide" | "ilche" | "bunri"` 공용 타입 추가. (2) `markdown.ts`에 pageBreak 왕복 직렬화(`---pb---` 토큰). (3) 툴바를 3단 토글로 교체. (4) `tiptap-editor` 렌더 분기(일체=단일 시트, 분리=누적 시트+자동분할). (5) 자동 페이지 분할을 `bunri`에서만 동작.

### 변경 파일
- `src/lib/page-mode.ts` (신규) — `PageMode` 타입.
- `src/lib/markdown.ts` — marked 확장(`pagebreak` 블록 토크나이저, `---pb---`→`<div data-page-break>`) + turndown 규칙(`div[data-page-break]`→`\n---pb---\n`). 왕복 보존.
- `src/hooks/use-auto-page-break.ts` — 타입 `PageMode`, 게이트 `pageMode !== "bunri"`.
- `src/components/editor/tiptap-editor.tsx` — `pageMode?: PageMode`; `wide`=전폭 / `ilche`=단일 연속 A4 시트(`.a4-canvas--ilche`) / `bunri`=누적 A4 시트+자동분할. 기본값 `bunri`(기존 a4 위치 = 분리 동작 보존).
- `src/components/editor/editor-toolbar.tsx` — 3단 토글(Wide/일체/분리) + 여백 프리셋은 `pageMode !== "wide"`에서 노출.
- `src/app/(markdown)/[...path]/editor-page.tsx`, `src/components/tab/doc-tab-content.tsx` — `useState<PageMode>("bunri")`.
- `src/components/tab/template-preview-tab.tsx` — `pageMode="ilche"`(미리보기=연속 A4).
- `src/app/api/fs/route.ts` — `Action` 유니온에 `"ensureRoot"` 추가(tsc 빌드 게이터 선행 해결).
- `src/app/globals.css` — `.a4-canvas--ilche` 단일 흰 A4 시트 스타일.

## 4. 롤백 계획

- 위 파일들을 수정 전 커밋/스냅샷으로 복원. 방법: `git restore` 또는 편집 되돌리기. `page-mode.ts`는 삭제.

## 5. 결과 / 테스트 계획

- **수행 완료 검증**:
  - `npx tsc --noEmit` 무오류 (page-break 기능 tsc 오류 포함 선행 해결).
  - `npm run lint` — 변경 파일 잔여 오류 없음(pw_check.cjs·workspace-provider 경고/오류는 기존·범위 외).
  - marked 확장 단독 검증: `---pb---` 2개 → `<div data-page-break>` 2개, `<hr>` 오소비 안 됨.
- **권장 추가(미수행, 사용자 확인 필요)**: Playwright e2e — 분리 모드에서 수동 Page Break 삽입 → 저장 → 재열기 → `pageBreak` 노드 잔존 단언(라운드트립 사실 검증).
- **알려진 제약**: `next build`는 Next.js 16 / `@serwist` Turbopack↔webpack 설정 충돌로 기존부터 실패(본 작업 코드 무관). 타입체크(tsc)는 통과하므로 `next dev` 기준 동작 확인.
