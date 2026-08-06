# 계획서 — 테이블 다중 선택 시 높이/너비 일괄 적용 + 최소 높이 10

> 상태: Doing | 작성일: 2026-07-22
> 작업 유형: B (기능 개선)
> 선행: 없음

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-22 | 최초 작성 | 다중 셀 선택 시 높이/너비 일괄 적용 + 최소 높이 10 |

## 1. 요구사항

1. 테이블에서 여러 셀을 선택(드래그)한 후 높이 슬라이더를 조절하면, 선택된 **모든 행**에 동시에 높이가 적용되어야 한다
2. 테이블에서 여러 셀을 선택(드래그)한 후 너비 슬라이더를 조절하면, 선택된 **모든 열**에 동시에 너비가 적용되어야 한다
3. 높이 슬라이더의 최소값을 20px → 10px으로 변경

## 2. 현재 시스템 분석

- **row-height-slider.tsx**: `update()`에서 커서 아래 단일 셀의 행 인덱스만 추출 → `applyRowHeight()`에서 `cellsInRect({top: ri, bottom: ri+1})`로 단일 행만 순회하여 `rowHeight` 적용. CellSelection 감지 로직 없음.
- **column-width-slider.tsx**: `update()`에서 `getColumnInfo()`로 단일 열 인덱스 추출 → `applyWidth()`에서 `cellsInRect({left: ci, right: ci+1})`로 단일 열만 순회하여 `colwidth` 적용. CellSelection 감지 로직 없음.
- **관련 파일/함수**: `row-height-slider.tsx:76-106` (`applyRowHeight`), `column-width-slider.tsx:58-95` (`applyWidth`), `@tiptap/pm/tables`의 `CellSelection`, `TableMap`

## 3. 구현 상세

### 3.1 row-height-slider.tsx

| 항목 | 변경 |
|------|------|
| import | `CellSelection` 추가 (`@tiptap/pm/tables`) |
| ref 추가 | `selectedRowsRef = useRef<number[]>([])` |
| `update()` | `selection instanceof CellSelection`이면 `$anchorCell`/`$headCell`로 행 범위 수집 → `selectedRowsRef`에 저장. 단일 셀일 때도 해당 행 세팅. 슬라이더 값은 첫 번째 선택 셀 기준 |
| `applyRowHeight()` | `selectedRowsRef.current` 배열 순회 → 각 행의 모든 셀에 `rowHeight` 적용 |
| MIN | `20` → `10` |

### 3.2 column-width-slider.tsx

| 항목 | 변경 |
|------|------|
| import | `CellSelection` 추가 (`@tiptap/pm/tables`) |
| ref 추가 | `selectedColsRef = useRef<number[]>([])` |
| `update()` | `selection instanceof CellSelection`이면 선택 셀들의 열 인덱스 수집 → `selectedColsRef`에 저장. 단일 셀일 때도 해당 열 세팅. 슬라이더 값은 첫 번째 선택 셀 기준 |
| `applyWidth()` | `selectedColsRef.current` 배열 순회 → 각 열의 모든 셀에 `colwidth` 적용 |

### 3.3 CellSelection 처리

```
selection instanceof CellSelection →
  $anchorCell → TableMap.findCell() → anchorRect
  $headCell → TableMap.findCell() → headRect
  행 범위: min(top) ~ max(bottom)
  열 범위: min(left) ~ max(right)
```

## 4. 구현 순서

| 순서 | 작업 내용 | 의존 |
|------|-----------|------|
| 1 | `row-height-slider.tsx`: import + ref + update() CellSelection 분기 + applyRowHeight() 다중 행 적용 + MIN=10 | - |
| 2 | `column-width-slider.tsx`: import + ref + update() CellSelection 분기 + applyWidth() 다중 열 적용 | - |
| 3 | 수동 테스트: 단일 선택/다중 선택/최소값 동작 확인 | 1, 2 |

## 5. 영향도 분석

| 파일 | 변경 범위 | 영향 |
|------|-----------|------|
| `row-height-slider.tsx` | import, ref, update(), applyRowHeight(), MIN | 높이 조절 |
| `column-width-slider.tsx` | import, ref, update(), applyWidth() | 너비 조절 |

다른 컴포넌트·스타일 영향 없음. 기존 단일 선택 동작 유지 (CellSelection 아닐 때 분기).

## 6. 테스트/검증 계획

| # | 시나리오 | 기대 |
|---|---------|------|
| 1 | 단일 셀 → 높이 조절 | 해당 행만 변경 (기존 동작) |
| 2 | 2행 이상 드래그 → 높이 조절 | 선택된 모든 행 동시 변경 |
| 3 | 단일 셀 → 너비 조절 | 해당 열만 변경 (기존 동작) |
| 4 | 2열 이상 드래그 → 너비 조절 | 선택된 모든 열 동시 변경 |
| 5 | 높이 최소값 | 10px까지 조절 가능 |

## 7. 리스크 및 제약

- `@tiptap/pm/tables`의 `CellSelection` API에 의존 — 안정적으로 제공됨
- 슬라이더 값은 첫 번째 선택 셀 기준 표시 (값이 다를 때 혼동 가능, 향후 개선 여지)
