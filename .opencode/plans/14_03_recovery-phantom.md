# 편집 안 한 파일의 phantom 복구 대화상자 해소

> 상태: Todo | 작성일: 2026-07-14
> 작업 유형: 버그 수정(A) — 과거 정상 동작하던 복구 플로우가 잘못 동작
> 관련 계획: plan/2026/07/14_01_print-feature/14_01_print-feature.md (프린트/A4 — Done)

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-14 | 최초 작성 | phantom 복구 대화상자(편집 없는데 unsaved 표시) + 복구 적용 전체 새로고침 2건 버그 계획서 작성 |

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | 편집하지 않은 파일을 열었을 때 복구(unsaved changes) 대화상자가 표시되는가? | N (표시되면 안 됨) | 미검증(수행 대기) |
| 1.2 | `.tmp`(임시파일)가 원본 파일 내용과 동일할 때 복구 대화상자가 뜨지 않는가? | Y | 미검증(수행 대기) |
| 2.1 | 실제 편집분이 든 `.tmp`가 있을 때 복구 대화상자가 표시되는가? | Y | 미검증(수행 대기) |
| 2.2 | 복구 "적용" 클릭 시 에디터에 편집분이 반영되는가? | Y | 미검증(수행 대기) |
| 3.1 | 복구 적용 시 `window.location.reload()`(전체 페이지 새로고침)가 호출되는가? | N (문서만 갱신) | 미검증(수행 대기) |
| 3.2 | 복구 적용 후 탭/사이드바/스크롤 등 페이지 상태가 유지되는가? | Y | 미검증(수행 대기) |

## 1. 문제 정의

- **관찰된 실패 산출물(필수)**: 사용자 보고 — "내가 수정하지도 않았는데 계속해서 '이해관계자 회의록'이라는 것이 저장되지 않은 변경사항이 있다고 뜬다." 즉, 편집 이력이 없는 파일을 열 때도 `저장되지 않은 변경사항이 있습니다`(RecoveryDialog, `src/components/editor/recovery-dialog.tsx:57`) 대화상자가 노출됨.
- **증상**: (1) 편집하지 않은 파일을 열어도 복구 대화상자 표시. (2) 이전 논의에서 복구 "적용" 시 전체 화면이 새로고침됨(`window.location.reload()`).
- **재현 조건**: 파일을 열기만 함(편집 없음) → 복구 대화상자 노출. 선행 조건: 해당 파일에 `.tmp`(임시파일)가 존재함.

## 2. 원인 분석

> ⛔ 원인 확정 게이트
> 1. 재현: 사용자가 실제로 관찰(위 보고). Playwright 재현은 §5 테스트 계획에 명시.
> 2. 그 줄이 범인임을 관측: 아래 코드 흐름 추적.
> 3. 반증 실험: 아래 명시.

- **근거(코드 흐름)**:
  - `src/app/(markdown)/[...path]/page.tsx:30` — `if (recovery?.tempContent) setRecoveryInfo({...})`. `.tmp`가 **존재하기만 하면** 복구 정보를 세팅 → `DocTabContent`가 대화상자를 연다. temp가 원본과 다른지 **비교하지 않는다**.
  - `src/lib/fs-access.ts:289` `getRecoveryInfo` — temp(`.tmp` 원문)와 `originalContent`(`.md` 원문)를 모두 읽되, 둘을 비교하는 로직이 **없다**. `meta.originalMd5`는 하드코딩 `"none"`(`fs-access.ts:329`)으로 실제 해시 비교 불가.
  - 선행 원인: 이전 `useAutoSave`의 **throttle(10초)** 버그로, 파일을 열 때 원본 HTML이 `.tmp`에 기록되었다(`save()`가 마운트 시점 원본을 저장하고 10초간 편집분 저장을 차단). → 해당 `.tmp`는 원본과 동일. 이를 제거하는 baseline 가드(`use-auto-save.ts`)는 신규 빈 `.tmp` 생성은 막으나, **이미 디스크에 남은 stale `.tmp`**는 열 때 덮어씌워지지 않고 그대로 잔존.
- **분석**: 따라서 원본과 동일한 stale `.tmp`가 존재하면, `page.tsx:30` 조건이 참이 되어 편집 이력이 없는 파일에도 "unsaved changes" 대화상자가 뜬다. 이것이 사용자가 본 phantom 증상의 정확한 원인이다.
- **회귀 도입 지점**: `useAutoSave`의 throttle 동작(초기 구현). 이번 세션에서 throttle 제거 + baseline 가드로 신규 발생은 차단했으나, 잔존 stale `.tmp` 처리 누락.
- **반증 실험**: `getRecoveryInfo`가 temp와 original을 **의미 있게 다를 때만** 복구 정보를 반환하도록 하면, 원본과 동일한 `.tmp`는 `null`을 돌려주어 대화상자가 뜨지 않는다. 반대로 "temp와 original이 같을 때도 대화상자가 뜬다"면 원인 미해결(반증).

## 3. 수정 방안

- **핵심 변경**: 복구 판단을 "`.tmp` 존재 여부"에서 "`.tmp`가 원본과 실제로 다른지(의미 있는 변경)"로 변경하고, 동일하면 stale `.tmp`를 삭제. 복구 적용은 전체 새로고침 대신 문서만 갱신.
- **세부 수정**:
  - `src/lib/fs-access.ts` `getRecoveryInfo`(`:289`): temp를 읽은 뒤 `tempDiffersFromOriginal(tempContent, originalContent)` 판별 추가.
    - `tempDiffersFromOriginal`: `mdToHtml`(`src/lib/markdown.ts:29`, async)로 양쪽을 HTML 렌더 → 태그 제거 + 공백 정규화한 텍스트 비교. 포맷 노이즈(markdown 라운드트립)에 강인.
    - 판별 결과 **동일하면** `discardTempFile(_root, filePath)`(`fs-access.ts:360`)로 stale `.tmp` 삭제 후 `return null`. **다르면** 기존처럼 `tempContent` 반환.
    - `mdToHtml` import 추가(현재 `htmlToMd`만 `markdown.ts:2` import 중).
  - `src/components/tab/doc-tab-content.tsx` `handleRecoveryApply`(`:88`): `window.location.reload()`(`:93`) 제거. `applyTempToOriginal` 성공 후 `recoveryInfo.tempContent`(markdown) → `mdToHtml`(이미 `doc-tab-content.tsx:17` import) →
    `editorRef.current.commands.setContent(html, { emitUpdate: false })` + `setContent(html)` + `updateTabContent(tab.id, html)` + `setHasUnsaved(false)` + `setRecoveryDismissed(tab.id, true)` + `setShowRecovery(false)`. `useCallback` deps에 `recoveryInfo` 추가.

## 4. 롤백 계획

- `src/lib/fs-access.ts` `getRecoveryInfo` 변경분 되돌리기(이전 동작: temp 존재 시 무조건 반환).
- `src/components/tab/doc-tab-content.tsx` `handleRecoveryApply`에서 `window.location.reload()` 복원.
- 방법: 해당 두 파일을 수정 전 커밋/스냅샷으로 복원(git restore 또는 편집 되돌리기).

## 5. 결과 (구현 완료 후 기재) / 테스트 계획

- **테스트 범위** (05.testing.md: 모듈 단위 수정 → 해당 모듈+직접 연관 기능): 복구 판단 로직(`getRecoveryInfo`) + 복구 적용(`handleRecoveryApply`).
- **방법**: Playwright(`playwright.config.ts` 설정, chromium 설치됨)로 검증. 기존 `e2e/fsa-folder-setup.spec.ts` 패턴(`window.showDirectoryPicker` 목 주입) 재사용.
  - 시나리오 A(phantom 해소): 목 파일시스템에 `draft.md`(원본)와 그에 대응하는 `.tmp`(원본과 동일한 내용)를 둔다 → 앱 구동 → `draft.md` 열기 → **복구 대화상자 미노출** 단언.
  - 시나리오 B(실제 편집분 복구): `.tmp`에 실제 편집분(예: "EDITED_BY_TEST")을 둔다 → 열기 → 복구 대화상자 **노출** 단언 → "복구 (임시 파일 적용)" 클릭 → (1) `window.location.reload` 미호출(페이지 컨텍스트 마커/로드 카운트 불변) (2) 에디터 DOM에 "EDITED_BY_TEST" 표시 (3) 파일(목 루트)에 편집분 기록.
- **보고 형식** (05.testing.md): 기능별 ✅/⚠️/❌ 구체 보고.
- **적용된 변경**: (수행 후 기입)
- **검증 결과**: (수행 후 기입)
