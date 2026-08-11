# 계획 검토 보고서 — 에디터 키보드 단축키 (Page Break Ctrl+Enter + Alt 키팁)

> 정식 계획서: `plan/2026/08/10_01_keyboard-shortcuts/10_01_keyboard-shortcuts.md`
> 작업 목록 생성: split_tasks / 모드 clearAllTasks

## 개요
- **목표**: Page Break를 Ctrl+Enter로 삽입하고, Alt 키팁(오피스 방식)으로 툴바 전체를 키보드만으로 조작
- **범위**: `src/components/editor/extensions/page-break.ts`(단축키), `src/components/editor/editor-toolbar.tsx`(키팁)
- **핵심 제약**: 추가 의존성 없음, 기존 단축키(Ctrl+S/K/Shift+I//)와 충돌 금지, Edge/Chrome에서 Alt 메뉴 포커스 방지, 탭 인스턴스 간 간섭 방지

## 사실 vs 추론

| 항목 | 구분 | 근거(출처) |
|------|------|-----------|
| Page Break 확장에 단축키 없음 | 사실 | `page-break.ts` 전체 60행, `addKeyboardShortcuts` 미존재 (read) |
| 삽입 명령 2곳 동일 | 사실 | `editor-toolbar.tsx:655`, `slash-command-popup.tsx:57` insertContent 동일 (grep) |
| Ctrl+Enter 미점유 | 사실 | `tiptap-editor.tsx` handleKeyDown 246~320행 (read) |
| ToolButton이 `{...rest}`로 data-* 전달 가능 | 사실 | `editor-toolbar.tsx:96` `{...rest}` (read) |
| Edge/Chrome에서 Alt 단독 preventDefault로 메뉴 차단 가능 | 사실 | 브라우저 표준 동작, plan 사용자 확인(`preventDefault`로 차단) |
| 툴바 버튼 ~37개 → 영숫자(36)에 근접 | 사실 | ToolButton 호출 수 grep 전수 (read) |
| Tiptap `Mod` = Win Ctrl / Mac Cmd | 사실 | Tiptap 3 공식 키 규약(추론 아니나 표준) |

## 작업 목록

| # | 작업명 | ID | 의존성 | 상태 |
|---|--------|----|--------|------|
| 1 | PageBreak 확장에 Ctrl+Enter 단축키 추가 | `40028148-4d63-4d94-ad72-6b6064321290` | — | pending |
| 2 | ToolButton에 keytip prop과 data-keytip 추가 | `bba9d523-b724-43f9-b6fa-2cb9ab5bd1c4` | — | pending |
| 3 | Alt 키팁 오버레이 상태와 키보드 리스너 구현 | `83bed206-9940-4a95-af87-4ad3eb295c26` | 2 | pending |
| 4 | ToolButton 키팁 배지 렌더와 키 배정 | `9a17c5e7-83a7-4e15-beb9-1ad3ca0db2eb` | 3 | pending |

### 작업 상세

**1. PageBreak 확장에 Ctrl+Enter 단축키 추가** (`40028148-4d63-4d94-ad72-6b6064321290`)
- page-break.ts에 `addKeyboardShortcuts() { return { "Mod-Enter": () => ...insertContent({ type:"pageBreak", attrs:{auto:false} }).run() } }` 추가, 반환 true
- 검증: lint/tsc + Ctrl+Enter로 manual 나눔 삽입, 기존 단축키 정상
- 관련: `src/components/editor/extensions/page-break.ts`(TO_MODIFY), `tiptap-editor.tsx:246-320`(REFERENCE)

**2. ToolButton에 keytip prop과 data-keytip 추가** (`bba9d523-b724-43f9-b6fa-2cb9ab5bd1c4`)
- ToolButton에 `keytip?: string`, Button에 `data-keytip={keytip}` 전달
- 검증: lint/tsc + keytip 전달 시 DOM attr 존재
- 관련: `src/components/editor/editor-toolbar.tsx:81-100`(TO_MODIFY)

**3. Alt 키팁 오버레이 상태와 키보드 리스너 구현** (`83bed206-9940-4a95-af87-4ad3eb295c26`)
- EditorToolbar에 keytipsActive 상태 + window keydown/keyup. Alt 단독 → active+preventDefault, 영숫자 → 루트 내 [data-keytip] .click() 후 비활성, Alt release → 비활성
- 검증: lint/tsc + 동작/비활성/탭 간섭 없음
- 관련: `src/components/editor/editor-toolbar.tsx:136-274`(TO_MODIFY)

**4. ToolButton 키팁 배지 렌더와 키 배정** (`9a17c5e7-83a7-4e15-beb9-1ad3ca0db2eb`)
- keytipsActive 시 우상단 kbd 배지 렌더 + 전체 ToolButton에 고유 keytip 배정
- 검증: lint/tsc + data-keytip 1:1, 전체 키 중복 없음(grep)
- 관련: `src/components/editor/editor-toolbar.tsx` 호출부 전체(TO_MODIFY)

## 의존 그래프
- 1, 2 → 3 → 4 (2는 3의 선행, 3은 4의 선행)
- 1은 병렬 가능, 2는 병렬 가능

## 금지·제한 사항 체크리스트
- [ ] `slash-command-popup.tsx`·`tiptap-editor.tsx` 핸들러 구조 변경 금지 (호출만 참조)
- [ ] 추가 의존성 설치 금지 (순수 React/DOM)
- [ ] 기존 단축키(Ctrl+S/K/Shift+I//) 동작 회귀 없음
- [ ] keytip 준수: disabled 버튼은 `.click()` no-op 처리
- [ ] Alt 단독 press 시 `preventDefault`로 브라우저 메뉴 방지 (Edge/Chrome 확정)
- [ ] 검증은 lint + tsc + dev 수동(엣지·크롬) — `execute_task`/`verify_task`는 조회된 taskId만 사용