# Heading Accent Bar & HR 스타일 커스터마이징

## 목적
- Heading accent bar (`|` = `border-left` on h2) 색상을 개별 heading마다 선택적으로 변경
- HR 두께/색상을 개별 삽입 시 지정 (에디터에서 `-▽`으로 표시, `▽` 클릭 시 설정)

## 변경 이력
1. **1차 구현 (글로벌 CSS 변수 방식)** — 완료 후 반려
   - `--rt-accent-override`, `--hr-thickness`, `--hr-color` CSS 변수로 모든 요소 일괄 변경
   - 사용자 반려: "전체 변경을 원한게 아니야"
2. **2차 구현 (커스텀 확장자 + 인라인 스타일)** — 현재 구현 중
   - HR: 커스텀 HorizontalRule 확장자 + NodeView로 개별 설정
   - Heading: 커스텀 Heading 확장자로 개별 accent 바 설정

## 기술적 접근

### HR
- `HorizontalRule.extend()` — `addAttributes()`로 `thickness`, `color` 추가
- React NodeView로 에디터에서 `-▽` 렌더링
- `▽` 클릭 시 드롭다운에서 두께 콤보박스(7개 프리셋) + 색상 선택(최근 3색상 + 피커)
- `renderHTML()`에서 인라인 스타일 적용 → 최종 HTML 출력

### Heading
- `Heading.extend()` — `addAttributes()`로 `accentBorderColor`, `accentBorderWidth` 추가
- `renderHTML()`에서 인라인 `border-left` 스타일 적용
- 툴바에서 팔레트 아이콘 + 두께 콤보박스(6개 프리셋)로 현재 heading 수정

### 최근 사용 색상
- `localStorage`에 전역 저장 (`recentColors` 키)
- 최대 3개 유지, 새 색상 선택 시 자동 업데이트

## 파일 변경 목록

| 파일 | 상태 | 설명 |
|------|------|------|
| `lib/recent-colors.ts` | 신규 | 최근 사용 색상 관리 유틸리티 |
| `extensions/custom-horizontal-rule.tsx` | 신규 | HR 커스텀 확장자 + NodeView |
| `extensions/custom-heading.ts` | 신규 | Heading 커스텀 확장자 |
| `tiptap-editor.tsx` | 수정 | 커스텀 확장자 추가, 글로벌 prop/cssVars 제거 |
| `editor-toolbar.tsx` | 수정 | HR 드롭다운 제거, Heading 팔레트/두께 UI 추가 |
| `doc-tab-content.tsx` | 수정 | 글로벌 state/핸들러 제거 |
| `globals.css` | 수정 | CSS 변수(`--hr-thickness`, `--hr-color`) 제거 |
| `report-theme.css` | 수정 | CSS 변수(`--rt-accent-override`, `--hr-thickness`, `--hr-color`) 제거 |

## 두께 프리셋

### HR
`0.5pt`, `1pt` (기본), `1.5pt`, `2pt`, `3pt`, `4pt`, `5pt`

### Heading Accent
`2pt`, `3pt` (기본), `4pt`, `5pt`, `6pt`, `8pt`
