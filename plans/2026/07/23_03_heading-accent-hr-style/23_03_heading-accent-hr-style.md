# 계획서 — Heading Accent 색상 + Horizontal Rule 두께/색상 커스터마이징

> 상태: Todo | 작성일: 2026-07-23
> 작업 유형: B (기능 개선)
> 선행: -

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-23 | 최초 작성 | heading accent(|) 색상 + HR 두께/색상 선택 기능 |

---

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | 리포트 테마 적용 시 h2 앞의 `\|`(border-left) 색상을 테마와 별도로 변경할 수 있는가? | Y | |
| 1.2 | heading accent 색상 변경 시 인쇄/PDF 출력에도 동일하게 적용되는가? | Y | |
| 1.3 | Horizontal Rule의 두께를 1pt~10pt 범위에서 선택할 수 있는가? | Y | |
| 1.4 | Horizontal Rule의 색상을 color picker로 선택할 수 있는가? | Y | |
| 1.5 | HR 설정 변경 시 인쇄/PDF 출력에도 동일하게 적용되는가? | Y | |
| 1.6 | 설정을 변경하지 않은 경우 기존 동작(테마 기본값)과 동일한가? | Y | |
| 1.7 | 테마가 "plain"일 때 heading accent 컬러 피커가 표시되지 않는가? | Y | |

---

## 1. 배경 및 목적

현재 리포트 테마의 heading `border-left`(시각적으로 `|`로 보이는 강조 바) 색상은 `--rt-accent` CSS 변수로 정의되어 있으며, 각 테마별로 하드코딩되어 있다:

- `report-theme.css:58`: `h2 { border-left: 4pt solid var(--rt-accent); }`
- `report-theme.css:303`: `technical` 테마 `h1 { border-left: 8pt solid var(--rt-accent); }`

사용자가 테마 색상과 별도로 이 강조 바의 색상을 지정할 수 없으며, HR의 두께·색상도 CSS에 고정되어 있다(`globals.css:161`, `report-theme.css:214`).

사용자는:
1. heading 앞의 `|` 색상을 테마와 독립적으로 선택하고 싶어 함
2. Horizontal Rule의 두께와 색상을 자유롭게 조절하고 싶어 함

---

## 2. 현재 시스템 분석

### 2.1 Heading accent (`|`) 구조

- **`report-theme.css:15-26`** (`.report-theme` 베이스): `--rt-accent: #1b1760` 정의
- **`report-theme.css:58`**: `h2`에 `border-left: 4pt solid var(--rt-accent)` 적용
- **`report-theme.css:220-226`** (`report-theme--report`): `--rt-accent: #1b1760` (네이비)
- **`report-theme.css:234-236`** (`report-theme--meeting`): `--rt-accent: #0f766e` (청록)
- **`report-theme.css:264-266`** (`report-theme--proposal`): `--rt-accent: #1d4ED8` (파랑)
- **`report-theme.css:293-295`** (`report-theme--technical`): `--rt-accent: #334155` (슬레이트)
- **`report-theme.css:324-326`** (`report-theme--one-paper`): `--rt-accent: #1b1760` (네이비)
- `plain` 테마는 `.report-theme` 클래스가 없으므로 `border-left` 없음 (강조 바 자체가 없음)

### 2.2 Horizontal Rule 구조

- **`globals.css:155-162`** (기본): `border-top: 1px solid var(--border)`
- **`report-theme.css:207-216`** (테마 적용 시): `border-top: 0.6pt solid #999; margin: 12pt 0`
- **`docx-export.ts:282-289`**: HR → Paragraph border (BorderStyle.SINGLE, size 4, color #999999)

### 2.3 데이터 흐름: frontmatter → CSS 변수

현재 프론트매터 기반 CSS 변수 주입 패턴이 이미 존재한다:

- `doc-tab-content.tsx:44-53`: `pageMode`, `reportTheme` 등 frontmatter에서 읽어 state로 관리
- `doc-tab-content.tsx:132-144`: `handleReportThemeChange` → frontmatter 업데이트 + `injectFrontmatter()`로 tab.content에 반영
- `tiptap-editor.tsx:222-226`: `cssVars` useMemo → `--a4-m-tb`, `--a4-m-lr`, `--a4-gap` CSS 변수 생성
- `tiptap-editor.tsx:355`: `style={cssVars}`로 `.tiptap-editor` 컨테이너에 주입
- `tiptap-editor.tsx:388-391`: `printRef` div에도 `style={cssVars}` 주입 (인쇄 시 변수 전달)

### 2.4 관련 파일/함수 (실측)

| 파일 | 핵심 위치 | 역할 |
|------|-----------|------|
| `src/app/report-theme.css:15-26` | `.report-theme` 베이스 | `--rt-accent` 정의 |
| `src/app/report-theme.css:58` | `h2` 스타일 | `border-left: 4pt solid var(--rt-accent)` |
| `src/app/report-theme.css:207-216` | `hr` 스타일 | `border-top: 0.6pt solid #999` |
| `src/app/globals.css:155-162` | `hr` 기본 스타일 | `border-top: 1px solid var(--border)` |
| `src/components/editor/editor-toolbar.tsx:100-110` | `Props` 타입 | toolbar에 전달되는 props 정의 |
| `src/components/editor/editor-toolbar.tsx:438-458` | 테마 Select | 리포트 테마 선택 드롭다운 |
| `src/components/editor/tiptap-editor.tsx:105-115` | `Props` 타입 | editor에 전달되는 props 정의 |
| `src/components/editor/tiptap-editor.tsx:222-226` | `cssVars` | CSS 변수 생성 |
| `src/components/tab/doc-tab-content.tsx:44-53` | state 관리 | frontmatter 기반 상태 |
| `src/components/tab/doc-tab-content.tsx:132-144` | `handleReportThemeChange` | 테마 변경 콜백 |
| `src/lib/docx-export.ts:282-289` | HR 토큰 처리 | DOCX 내보내기 |

---

## 3. 구현 상세

### 3.1 데이터 모델: frontmatter 필드 추가

기존 frontmatter 패턴( `reportTheme`, `pageMode`, `marginPreset`)에 3개 필드 추가:

```yaml
# 기존
reportTheme: report
pageMode: bunri
marginPreset: medium

# 신규
headingAccentColor: "#1B1760"   # null이면 테마 기본값 사용
hrThickness: "0.6pt"            # null이면 테마 기본값 사용
hrColor: "#999999"              # null이면 테마 기본값 사용
```

### 3.2 CSS 변수 주입 전략

**원리**: `--rt-accent-override`, `--hr-thickness`, `--hr-color` CSS 변수를 캔버스 컨테이너(`.tiptap-editor`, `.print-pages`)에 인라인 `style`로 주입. CSS에서 `var(--variable, fallback)` 패턴으로 기본값 유지.

**특정도(priority) 계층**:
1. `report-theme.css`의 `--rt-accent` (테마별 기본값)
2. 인라인 `style`의 `--rt-accent-override` (사용자 오버라이드) → `border-left`에서 `var(--rt-accent-override, var(--rt-accent))`로 fallback

### 3.3 수정 대상: `src/app/report-theme.css`

#### 3.3.1 h2 border-left 오버라이드 (line 58)

```css
/* 변경 전 */
border-left: 4pt solid var(--rt-accent);

/* 변경 후 */
border-left: 4pt solid var(--rt-accent-override, var(--rt-accent));
```

#### 3.3.2 technical 테마 h1 border-left 오버라이드 (line 303)

```css
/* 변경 전 */
border-left: 8pt solid var(--rt-accent);

/* 변경 후 */
border-left: 8pt solid var(--rt-accent-override, var(--rt-accent));
```

#### 3.3.3 기본 HR 오버라이드 (line 212-214)

```css
/* 변경 전 */
border: none;
border-top: 0.6pt solid #999;

/* 변경 후 */
border: none;
border-top: var(--hr-thickness, 0.6pt) solid var(--hr-color, #999);
```

### 3.4 수정 대상: `src/app/globals.css`

#### 3.4.1 기본 HR 오버라이드 (line 160-161)

```css
/* 변경 전 */
border: none;
border-top: 1px solid var(--border);

/* 변경 후 */
border: none;
border-top: var(--hr-thickness, 1px) solid var(--hr-color, var(--border));
```

### 3.5 수정 대상: `src/components/editor/editor-toolbar.tsx`

#### 3.5.1 Props 확장 (line 100-110)

```typescript
type Props = {
  editor: Editor | null
  pageMode?: PageMode
  onPageModeChange?: (mode: PageMode) => void
  marginPresetId?: MarginPresetId
  onMarginPresetChange?: (preset: MarginPresetId) => void
  reportTheme?: ReportTheme
  onReportThemeChange?: (theme: ReportTheme) => void
  onSaveHwpx?: () => void
  onSaveDocx?: () => void
  // 신규
  headingAccentColor?: string | null
  onHeadingAccentColorChange?: (color: string | null) => void
  hrThickness?: string | null
  onHrThicknessChange?: (thickness: string | null) => void
  hrColor?: string | null
  onHrColorChange?: (color: string | null) => void
}
```

#### 3.5.2 Heading accent color picker

테마 Select 옆에 color input + 삭제 버튼 추가. 테마가 `plain`이면 숨김.

```tsx
{/* 보고서 양식(테마) 선택 */}
<Select ...>...</Select>

{/* Heading accent 색상 (테마가 plain이면 숨김) */}
{reportTheme !== "plain" && (
  <>
    <div className="relative flex items-center">
      <input
        type="color"
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        tabIndex={-1}
        value={headingAccentColor || ""}
        onChange={(e) => onHeadingAccentColorChange?.(e.target.value)}
        title="강조 바 색상"
      />
      <ToolButton onClick={() => {}} isActive={false} label="강조 바 색상">
        <Palette className="size-4" />
      </ToolButton>
    </div>
    {headingAccentColor && (
      <ToolButton onClick={() => onHeadingAccentColorChange?.(null)} isActive={false} label="강조 바 색상 초기화">
        <span className="text-xs font-bold leading-none">x</span>
      </ToolButton>
    )}
  </>
)}
```

#### 3.5.3 HR hover 메뉴

`Minus` 버튼 클릭 시 드롭다운 메뉴 표시. 두께 슬라이더 + 색상 피커.

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <ToolButton onClick={() => {}} isActive={false} label="Horizontal Rule">
      <Minus className="size-4" />
    </ToolButton>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="start" className="w-56 p-3">
    <div className="space-y-3">
      {/* 두께 */}
      <div className="space-y-1">
        <label className="text-xs font-medium">두께</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="1" max="10" step="0.5"
            value={parseFloat(hrThickness || "1")}
            onChange={(e) => onHrThicknessChange?.(`${e.target.value}pt`)}
            className="flex-1"
          />
          <span className="text-xs w-8 text-right">{hrThickness || "1pt"}</span>
        </div>
      </div>
      {/* 색상 */}
      <div className="space-y-1">
        <label className="text-xs font-medium">색상</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={hrColor || "#999999"}
            onChange={(e) => onHrColorChange?.(e.target.value)}
            className="size-7 cursor-pointer"
          />
          <ToolButton
            onClick={() => { onHrThicknessChange?.(null); onHrColorChange?.(null) }}
            isActive={false}
            label="기본값으로 초기화"
          >
            <RotateCcw className="size-3" />
          </ToolButton>
        </div>
      </div>
    </div>
  </DropdownMenuContent>
</DropdownMenu>
```

### 3.6 수정 대상: `src/components/editor/tiptap-editor.tsx`

#### 3.6.1 Props 확장 (line 105-115)

```typescript
type Props = {
  content: string
  onChange?: (html: string) => void
  onSave?: () => void
  onEditorReady?: (editor: import("@tiptap/react").Editor) => void
  className?: string
  pageMode?: PageMode
  marginPresetId?: MarginPresetId
  reportTheme?: ReportTheme
  editable?: boolean
  // 신규
  headingAccentColor?: string | null
  hrThickness?: string | null
  hrColor?: string | null
}
```

#### 3.6.2 cssVars 확장 (line 222-226)

```typescript
const cssVars = useMemo(() => ({
  "--a4-m-tb": `${effectiveMargins.top}mm`,
  "--a4-m-lr": `${effectiveMargins.left}mm`,
  "--a4-gap": `${A4_DIMENSIONS.gap}mm`,
  // 신규
  ...(headingAccentColor ? { "--rt-accent-override": headingAccentColor } : {}),
  ...(hrThickness ? { "--hr-thickness": hrThickness } : {}),
  ...(hrColor ? { "--hr-color": hrColor } : {}),
} as Record<string, string>), [effectiveMargins, headingAccentColor, hrThickness, hrColor])
```

#### 3.6.3 printRef에도 cssVars 주입 (line 386-391)

```tsx
<div
  ref={printRef}
  className={cn("print-pages prose max-w-none", themeClass)}
  data-page-mode={pageMode}
  style={cssVars}  {/* cssVars 이미 존재 — 신규 변수가 자동 포함됨 */}
/>
```

### 3.7 수정 대상: `src/components/tab/doc-tab-content.tsx`

#### 3.7.1 state 추가 (line 44-53 근처)

```typescript
const [headingAccentColor, setHeadingAccentColor] = useState<string | null>(() => {
  const fm = frontmatterFromHtml(tab.content || "")
  return (fm.headingAccentColor as string) || null
})
const [hrThickness, setHrThickness] = useState<string | null>(() => {
  const fm = frontmatterFromHtml(tab.content || "")
  return (fm.hrThickness as string) || null
})
const [hrColor, setHrColor] = useState<string | null>(() => {
  const fm = frontmatterFromHtml(tab.content || "")
  return (fm.hrColor as string) || null
})
```

#### 3.7.2 frontmatter 변경 핸들러 추가

```typescript
const handleHeadingAccentChange = useCallback((color: string | null) => {
  setHeadingAccentColor(color)
  setFrontmatter((fm) => {
    const next = { ...fm }
    if (color === null) delete next.headingAccentColor
    else next.headingAccentColor = color
    updateTabContent(tab.id, injectFrontmatter(content, next))
    return next
  })
  setHasUnsaved(true)
  setTabDirty(tab.id, true)
}, [tab.id, setTabDirty, updateTabContent, content])

const handleHrThicknessChange = useCallback((thickness: string | null) => {
  setHrThickness(thickness)
  setFrontmatter((fm) => {
    const next = { ...fm }
    if (thickness === null) delete next.hrThickness
    else next.hrThickness = thickness
    updateTabContent(tab.id, injectFrontmatter(content, next))
    return next
  })
  setHasUnsaved(true)
  setTabDirty(tab.id, true)
}, [tab.id, setTabDirty, updateTabContent, content])

const handleHrColorChange = useCallback((color: string | null) => {
  setHrColor(color)
  setFrontmatter((fm) => {
    const next = { ...fm }
    if (color === null) delete next.hrColor
    else next.hrColor = color
    updateTabContent(tab.id, injectFrontmatter(content, next))
    return next
  })
  setHasUnsaved(true)
  setTabDirty(tab.id, true)
}, [tab.id, setTabDirty, updateTabContent, content])
```

#### 3.7.3 EditorToolbar에 새 props 전달 (line 302)

```tsx
<EditorToolbar
  editor={editor}
  pageMode={pageMode}
  onPageModeChange={setPageMode}
  marginPresetId={marginPresetId}
  onMarginPresetChange={setMarginPresetId}
  reportTheme={reportTheme}
  onReportThemeChange={handleReportThemeChange}
  onSaveHwpx={handleSaveHwpx}
  onSaveDocx={handleSaveDocx}
  // 신규
  headingAccentColor={headingAccentColor}
  onHeadingAccentColorChange={handleHeadingAccentChange}
  hrThickness={hrThickness}
  onHrThicknessChange={handleHrThicknessChange}
  hrColor={hrColor}
  onHrColorChange={handleHrColorChange}
/>
```

#### 3.7.4 TiptapEditor에 새 props 전달 (line 310-318)

```tsx
<TiptapEditor
  content={content}
  onChange={handleContentChange}
  onSave={handleSave}
  onEditorReady={(e) => { setEditor(e); editorRef.current = e }}
  pageMode={pageMode}
  marginPresetId={marginPresetId}
  reportTheme={reportTheme}
  // 신규
  headingAccentColor={headingAccentColor}
  hrThickness={hrThickness}
  hrColor={hrColor}
/>
```

### 3.8 lucide-react 아이콘 추가

`editor-toolbar.tsx` 임포트에 추가:
- `Palette` (heading accent color picker용)
- `RotateCcw` (초기화 버튼용)

### 3.9 DropdownMenu 컴포넌트 임포트

`editor-toolbar.tsx`에 추가:
```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
```

### 3.10 구현 순서

| 순서 | 작업 내용 | 의존 |
|------|-----------|------|
| 1 | `report-theme.css`: h2/h1 border-left에 `--rt-accent-override` fallback 추가 | - |
| 2 | `report-theme.css`: HR에 `--hr-thickness`/`--hr-color` fallback 추가 | - |
| 3 | `globals.css`: HR에 `--hr-thickness`/`--hr-color` fallback 추가 | - |
| 4 | `tiptap-editor.tsx`: Props에 3개 필드 추가 + cssVars 확장 | 1~3 |
| 5 | `editor-toolbar.tsx`: Props에 6개 필드 추가 + 아이콘/DropdownMenu 임포트 | - |
| 6 | `editor-toolbar.tsx`: heading accent color picker UI 구현 | 5 |
| 7 | `editor-toolbar.tsx`: HR dropdown menu UI 구현 | 5 |
| 8 | `doc-tab-content.tsx`: state 추가 + 핸들러 3개 구현 | - |
| 9 | `doc-tab-content.tsx`: EditorToolbar/TiptapEditor에 새 props 전달 | 4, 5~8 |
| 10 | TypeScript 타입 체크 + 빌드 검증 | 1~9 |

---

## 4. 영향도 분석

| 파일 | 변경 내용 | 영향 |
|------|-----------|------|
| `src/app/report-theme.css` | h2/h1 border-left + HR에 CSS 변수 fallback | 기존 동작 unchanged (변수 미설정 시 기존 값 사용) |
| `src/app/globals.css` | HR에 CSS 변수 fallback | 기존 동작 unchanged |
| `src/components/editor/editor-toolbar.tsx` | Props 확장 + UI 2개 추가 | toolbar 레이아웃 확장 (테마 선택 옆 + HR 버튼 개선) |
| `src/components/editor/tiptap-editor.tsx` | Props 확장 + cssVars 확장 | cssVars에 3개 변수 추가 (인쇄에도 전달) |
| `src/components/tab/doc-tab-content.tsx` | state + 핸들러 + props 전달 | 데이터 흐름 확장 |

- `docx-export.ts`, `hwpx-plan.ts` 등 export 모듈은 **변경 없음** (frontmatter에 저장되면 향후 확장 가능)
- `markdown.ts` turndown 규칙은 **변경 없음**

---

## 5. 테스트/검증 계획

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| 1 | report 테마 선택 후 heading accent color picker로 색상 변경 | h2 앞 `|` 색상이 실시간으로 변경 |
| 2 | heading accent color를 빨간색(#FF0000)으로 설정 후 인쇄 | 인쇄 미리보기에서 `|`가 빨간색으로 표시 |
| 3 | heading accent color를 "초기화"하면 테마 기본값으로 복원 | `|`가 테마 accent 색상으로 복원 |
| 4 | HR 버튼 클릭 → 두께 슬라이더를 5pt로 조절 | 수평선 두께가 실시간으로 5pt로 변경 |
| 5 | HR 색상을 파란색으로 변경 | 수평선 색상이 파란색으로 변경 |
| 6 | HR 설정 초기화 | 수평선이 테마 기본값으로 복원 |
| 7 | plain 테마에서 heading accent color 피커 | 피커가 표시되지 않음 |
| 8 | A4 분리 모드에서 HR 두께 변경 후 PDF 저장 | PDF에서도 두께 변경 반영 |
| 9 | `npm run build` 통과 | TypeScript 에러 0건 |

---

## 6. 리스크 및 제약

- **CSS 특정도**: `report-theme.css`의 `--rt-accent-override`는 `var(--rt-accent)`보다 높은 우선순위로 동작. 다만 `!important`를 사용하지 않으므로 인라인 스타일의 높은 특정도에 의존.
- **인쇄 시 CSS 변수 전달**: `printRef` div에 `cssVars`를 주입하면 `.print-pages` 컨테이너에 변수가 설정되므로 자식 `hr`, `h2`에 상속됨. 확인 필수.
- **frontmatter 직렬화**: `injectFrontmatter`는 `encodeURIComponent`로 인코딩. 색상 코드(#FF0000)는 그대로 인코딩되므로 문제 없음.
- **기본값 복원 로직**: `null`이면 CSS fallback이 동작하므로, 프론트매터에서 필드를 완전히 제거하면 테마 기본값으로 복원됨.

---

## 실행 로그(수행일·작업자)

> (수행 시 작성)
