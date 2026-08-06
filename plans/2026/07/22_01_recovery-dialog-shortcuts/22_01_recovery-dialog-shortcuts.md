# 계획서 — 복구 다이얼로그 키보드 단축키 적용

> 상태: Done | 작성일: 2026-07-22
> 작업 유형: B (기능 개선)

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-22 | 전체 | 최초 작성 |

---

## 1. 배경 및 목적

- 복구 다이얼로그(임시파일 복구/삭제)에서 버튼 클릭만으로 작업 가능하나, 키보드 단축키가 없어 조작 효율이 떨어짐
- 툴바의 Bold(Ctrl+B), Italic(Ctrl+I) 등과 동일한 패턴으로 복구 다이얼로그 버튼에도 단축키를 적용하여 일관된 UX 제공

## 2. 요구사항

1. 복구 다이얼로그가 열려있을 때 `Ctrl+D`로 "임시 파일 삭제" 실행
2. 복구 다이얼로그가 열려있을 때 `Ctrl+Enter`로 "복구 (임시 파일 적용)" 실행
3. 각 버튼에 단축키 텍스트를 표시 (예: `임시 파일 삭제 (Ctrl+D)`)

## 3. 현재 시스템 분석

- **복구 다이얼로그**: `D:\dev\md_editor\md_editor\src\components\editor\recovery-dialog.tsx`
  - `RecoveryDialog` 컴포넌트 — `open`, `onApply`, `onDiscard`, `onClose` props 수신
  - `DialogFooter` 안에 두 개의 `Button` (삭제/복구)
  - 현재 키보드 이벤트 핸들링 없음
- **기존 단축키 패턴**: `D:\dev\md_editor\md_editor\src\components\editor\editor-toolbar.tsx:194-200`
  - `ToolButton` 컴포넌트의 `label` prop에 `"Bold (Ctrl+B)"` 형태로 단축키 포함
  - 버튼의 `title` 속성(호버 툴팁)으로 표시
- **복구 핸들러**: `D:\dev\md_editor\md_editor\src\components\tab\doc-tab-content.tsx:135-166`
  - `handleRecoveryApply` / `handleRecoveryDiscard` — RecoveryDialog에 props로 전달됨
  - 별도 수정 불필요 (props 콜백 방식)

## 4. 구현 상세

### 4.1 수정 파일: `recovery-dialog.tsx`

**변경 1: 키보드 단축키 이벤트 핸들러 추가**

- `useEffect`를 사용하여 `open`이 `true`일 때 `keydown` 이벤트 리스너 등록
- `Ctrl+D` 감지 시 `onDiscard()` 호출 + `preventDefault()` + `stopPropagation()`
- `Ctrl+Enter` 감지 시 `onApply()` 호출 + `preventDefault()` + `stopPropagation()`
- 컴포넌트 언마운트 또는 `open` 변경 시 리스너 정리

**변경 2: 버튼 레이블에 단축키 표시**

| 기존 | 변경 |
|------|------|
| `임시 파일 삭제` | `임시 파일 삭제 (Ctrl+D)` |
| `복구 (임시 파일 적용)` | `복구 (Ctrl+Enter)` |

### 4.2 수정 불필요 파일

- `doc-tab-content.tsx` — 콜백이 props로 전달되므로 변경 불필요
- `editor-toolbar.tsx` — 이미 단축키 표시 패턴 존재, 변경 불필요

## 5. 영향도 분석

| 파일 | 변경 내용 | 영향 범위 |
|------|-----------|-----------|
| `src/components/editor/recovery-dialog.tsx` | 키보드 이벤트 핸들러 + 버튼 레이블 | 복구 다이얼로그 표시 시에만 영향 |

- 다른 컴포넌트나 페이지에 미치는 영향 없음
- Dialog 컴포넌트의 Escape 키 동작(다이얼로그 닫기)과 충돌 없음 (Ctrl+D는 별도 키 조합)

## 6. 테스트/검증 계획

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| 1 | 복구 다이얼로그 열림 상태에서 Ctrl+D 누르기 | 임시 파일 삭제 실행, 다이얼로그 닫힘 |
| 2 | 복구 다이얼로그 열림 상태에서 Ctrl+Enter 누르기 | 복구 실행, 다이얼로그 닫힘 |
| 3 | 복구 다이얼로그 열림 상태에서 Esc 누르기 | 다이얼로그 닫힘 (삭제/복구 아님) |
| 4 | 삭제 버튼 호버 | 툴팁에 "임시 파일 삭제 (Ctrl+D)" 표시 |
| 5 | 복구 버튼 호버 | 툴팁에 "복구 (Ctrl+Enter)" 표시 |

## 7. 리스크 및 제약

- 리스크 없음 — 기존 동작을 변경하지 않고 키보드 이벤트 리스너만 추가
- 다이얼로그가 닫힌 상태에서는 이벤트 리스너가 제거되므로 불필요한 키 입력 방지
