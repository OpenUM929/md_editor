# 계획서 — 제목(헤딩) 개별 글자 크기/굵기 + 번호 매기기 동기화

> 상태: Pre-Done | 작성일: 2026-07-27
> 작업 유형: B (기능 개선) — 부 유형 A(버그 수정) 겸함
> 선행: `plans/2026/07/27_02_heading-numbering-toggle`
> 관련 버그: `plans/2026/07/27_03_heading-size-reset` (본 계획서로 원인 확정·수정)

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-27 | 최초 작성 | 사용자와의 대화로 원인 확정(27_03 가설 D 보강) 후 계획+구현 동시 진행 |

---

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | 헤딩(H1~H4)에 이 헤딩만의 글자 크기를 지정할 수 있는가? | Y | Y — `custom-heading.ts`의 `fontSize` 노드 속성 + `editor-toolbar.tsx` "제목 스타일 설정" 드롭다운의 글자 크기 Select |
| 1.2 | 굵기를 기본/보통/굵게 3상태로 지정할 수 있는가? | Y | Y — `bold` 노드 속성(`null`/`false`/`true`) + 드롭다운 3버튼 |
| 1.3 | 이 크기/굵기를 지정한 뒤 "번호 매기기" 토글을 켜면, 번호(`::before`)가 텍스트와 같은 크기·굵기로 보이는가? | Y | Y — `fontSize`/`bold`가 h 태그 자체의 인라인 스타일이 되므로 `::before`가 CSS 상속으로 동일 값을 받음(추가 CSS 불필요) |
| 1.4 | 저장 후 다시 열어도 이 크기/굵기가 유지되는가? | Y | Y — `markdown.ts`의 `headingStyleDirective` turndown 규칙 + `applyHeadingDirectives()`로 왕복 |
| 1.5 | 기존에 이미 있던 "강조 바 색상/두께"(`accentBorderColor`/`accentBorderWidth`)도 같은 방식으로 저장 후 유지되는가? | Y (기존 버그였음) | Y — 같은 turndown 규칙이 4개 속성을 함께 처리. 기존에는 이 속성들도 저장 시 유실되고 있었음(§2.4) |
| 1.6 | 크기/굵기를 지정하지 않은 기존 헤딩은 저장 시 마크다운이 그대로인가(회귀 없음)? | Y | Y — turndown 규칙의 `filter`가 style이 있는 헤딩에만 걸림(§6 검증) |
| 1.7 | 이 기능은 문서 전체의 "H2는 모두 이 크기" 같은 스타일이 아니라, 지금 커서가 있는 그 헤딩 하나에만 적용되는가? | Y (사용자 확인 필요 시 후속 논의) | Y — `updateAttributes("heading", ...)`는 현재 커서의 헤딩 노드에만 적용(기존 accentBorderColor와 동일 패턴) |

---

## 1. 배경 및 목적

### 1.1 문제

사용자가 제목을 H2로 지정하고 폰트 크기 셀렉터로 22pt + Bold를 준 뒤 "번호 매기기" 토글을 켜면, 번호가 텍스트 크기를 따라가지 않아 부자연스러워 보였다(`27_03_heading-size-reset`, Doing).

원인은 대화 중 실측으로 확정했다: 기존 "폰트 크기" 셀렉터(`editor-toolbar.tsx`)는 `TextStyle`/`FontSize` **인라인 마크**를 선택한 글자에만 씌운다(`<span style="font-size:22pt">`). 반면 번호는 `globals.css`의 `h2::before`(CSS counter)로 그려지는데, `::before`는 h2 태그 **자신의** 스타일을 상속받지 h2 안의 `<span>` 마크는 상속받지 않는다. 그래서 텍스트는 22pt인데 번호만 h2 기본 크기로 그려져 어긋나 보였다.

이는 Word에도 실제로 존재하는 동작이다 — OOXML의 번호 서식은 `abstractNum > lvl > rPr`(수준 단위 고정 서식) 또는 문단 시작 지점의 서식을 따르지, 선택한 글자에만 건 로컬 서식을 따르지 않는다. 즉 "번호가 텍스트를 따라가게" 하려면 로컬 인라인 마크가 아니라 **헤딩 자체의 서식**으로 크기/굵기를 지정해야 한다.

### 1.2 목적

1. 헤딩 자체에 글자 크기/굵기를 지정하는 UI를 제공한다(이 헤딩 하나 단위 — 기존 `accentBorderColor`/`accentBorderWidth`와 동일한 범위).
2. 이 값이 h 태그 자체의 인라인 스타일이 되게 하여, 번호 매기기(`::before`)가 항상 텍스트와 같은 크기·굵기로 그려지게 한다.
3. **부수 발견**: 이 작업 중 기존 `accentBorderColor`/`accentBorderWidth`도 저장 시 유실되고 있었음을 실측으로 확인(§2.4) — 같은 수정으로 함께 고친다.

---

## 2. 현재 시스템 분석

### 2.1 헤딩 노드 확장 (기존)

`src/components/editor/extensions/custom-heading.ts` — `Heading`을 확장해 `accentBorderColor`/`accentBorderWidth`를 노드 속성으로 갖고, `renderHTML`에서 `style="border-left-color:...; border-left-width:..."`로 렌더한다. `editor-toolbar.tsx:302-401`(수정 전 줄번호)의 "강조 바 설정" 드롭다운이 `editor.getAttributes("heading")` / `editor.chain().updateAttributes("heading", {...})`로 이 값을 읽고 쓴다 — **현재 커서가 있는 헤딩 노드 하나에만** 적용되는 인스턴스 단위 속성이다.

### 2.2 번호 매기기 렌더링 (기존, 무변경)

`globals.css:169-219` — `.heading-numbered h2::before { content: counter(hn1) "." counter(hn2) " "; }`. `font-size`/`font-weight`를 선언하지 않으므로 h2 요소 자신의 computed style을 상속한다(CSS 스펙상 기본 동작).

### 2.3 폰트 크기 셀렉터 (기존, 무변경 — 헤딩과 무관하게 유지)

`editor-toolbar.tsx`의 일반 "Font size select"는 `TextStyle`/`FontSize` 마크를 선택 영역에 건다. 이건 본문 문단 등 임의 텍스트에 쓰는 범용 기능으로 그대로 둔다. 헤딩 전용 크기 지정은 이번에 만드는 **별도의** 헤딩 속성이다(§3).

### 2.4 마크다운 왕복 — 실측으로 확인한 기존 버그

`saveMdFile()`(`fs-access.ts:308`)은 항상 `htmlToMd()`를 거치고, `htmlToMd`는 `turndown.turndown()`을 쓴다. turndown의 기본 heading 규칙은 attrs 없이 `#`/`##` 접두사만 만든다 — 직접 실행해 확인:

```js
turndown.turndown('<h2 style="border-left-color:red;border-left-width:6pt;font-size:22pt;font-weight:bold;">제목</h2>')
// → "## 제목"   (style 전부 소실)
```

`markdown.ts`에는 heading 전용 turndown 규칙이 **없었다**(전수 확인). 즉 **기존에 이미 배포된 `accentBorderColor`/`accentBorderWidth` 기능도 저장 후 다시 열면 사라지는 상태였다** — 이번 요구사항(1.5)으로 함께 해결한다.

---

## 3. 구현 상세 (완료)

### 3.1 `src/components/editor/extensions/custom-heading.ts`

`fontSize: string | null`, `bold: boolean | null` 노드 속성을 추가. `renderHTML`이 `font-size`/`font-weight`를 인라인 스타일에 포함(있을 때만). `bold === true`→`font-weight:bold`, `false`→`font-weight:normal`, `null`→선언 안 함(테마/prose 기본값 유지).

### 3.2 `src/components/editor/editor-toolbar.tsx`

- `getHeadingFontAttrs`/`updateHeadingFontSize`/`updateHeadingBold` 헬퍼 추가(기존 `getHeadingAccentAttrs`/`updateHeadingAccent`와 동일 패턴).
- 기존 "강조 바 설정" 드롭다운(`headingAccentOpen` state 재사용)에 "글자 크기"(Select, 기본값+`FONT_SIZES`) + "굵기"(기본/보통/굵게 3버튼) 섹션을 추가. 드롭다운 라벨을 "제목 스타일 설정(강조 바·글자 크기·굵기)"로 갱신.
- 새 드롭다운을 만들지 않고 기존 것을 확장한 이유: 이미 "이 헤딩 하나의 스타일"이라는 같은 범위·같은 UI 패턴이라 별도 아이콘을 늘리는 것보다 응집도가 높음.

### 3.3 `src/lib/markdown.ts`

- `turndown.addRule("headingStyleDirective", ...)`: `h1~h6` 중 `border-left-color`/`border-left-width`/`font-size`/`font-weight` 중 하나라도 인라인 스타일로 있으면, 해당 값들을 `<!-- heading: k=v k=v -->` 주석으로 헤딩 줄 바로 앞에 적고 이어서 표준 ATX 헤딩(`# ` 등)을 그대로 출력. **style이 없는 헤딩은 이 규칙이 걸리지 않아 기존 출력과 100% 동일**(회귀 없음, §6 검증).
- `applyHeadingDirectives(html)`: `mdToHtml()`이 `marked.parse()` 결과에 대해 `<!-- heading: ... --><h2>` 패턴을 찾아 해당 헤딩 태그에 `style` 속성을 복원하고 주석을 제거. `FRONTMATTER_TEMPLATE_RE`와 동일한 "숨은 메타데이터 왕복" 패턴.
- 실측 검증(node 직접 실행, 아래 §6.1)으로 인코딩·정규식 양방향 모두 확인 완료.

### 3.4 CSS 변경 없음

`fontSize`/`bold`가 h 태그 자신의 인라인 스타일이 되므로, `::before`(번호)는 **추가 코드 없이** CSS 상속 규칙만으로 텍스트와 같은 크기·굵기를 받는다. 이것이 이번 수정의 핵심 — 인라인 마크(span)와 노드 속성(h 태그 자체)의 차이만으로 문제가 해결된다.

### 3.5 구현 순서 (실제 진행 순서, 완료됨)

| 순서 | 작업 내용 | 상태 |
|------|-----------|------|
| 1 | 원인 확정(대화 중 실측 — turndown 헤딩 규칙 테스트, marked 주석+헤딩 출력 테스트) | 완료 |
| 2 | `custom-heading.ts`: `fontSize`/`bold` 속성 + renderHTML | 완료 |
| 3 | `markdown.ts`: `headingStyleDirective` turndown 규칙 | 완료 |
| 4 | `markdown.ts`: `applyHeadingDirectives` + `mdToHtml` 연결 | 완료 |
| 5 | `editor-toolbar.tsx`: 헬퍼 3개 + 드롭다운 UI(글자 크기/굵기) 추가 | 완료 |
| 6 | `npx tsc --noEmit` | 완료 — EXIT 0 |
| 7 | `npx eslint` (변경 파일 3개) | 완료 — 0 errors (무관 경고 1건, §6.2) |
| 8 | 브라우저 실동작 확인(편집 화면에서 번호·텍스트 크기 일치, 저장 후 재열람) | **미완료 — 사용자 승인 후 진행(§6.3)** |

---

## 4. 영향도 분석

| 파일 | 변경 내용 | 영향 |
|------|-----------|------|
| `src/components/editor/extensions/custom-heading.ts` | 속성 2개 추가 + renderHTML 확장 | 기존 `accentBorderColor`/`accentBorderWidth` 로직 무변경(순수 추가) |
| `src/components/editor/editor-toolbar.tsx` | 헬퍼 3개 + 드롭다운 UI 확장 + 라벨 변경 | 기존 강조 바 UI 동작 무변경, 같은 드롭다운에 섹션만 추가 |
| `src/lib/markdown.ts` | turndown 규칙 1개 추가 + `mdToHtml`에 후처리 1단계 추가 | style 없는 헤딩은 무영향(필터 미통과). **부수 효과**: 기존 accentBorderColor/Width도 이제 저장 후 유지됨(버그 수정) |
| `docx-export.ts`, `hwpx-plan.ts`, `hwpx_gen.py` | **변경 없음** | 이 기능은 편집 화면 전용(헤딩 개별 서식은 DOCX/HWPX에 아직 미반영 — §7 제약) |
| `globals.css`, `report-theme.css` | **변경 없음** | `::before` 상속은 기존 CSS 규칙만으로 이미 성립 |

---

## 5. 테스트/검증 계획

### 5.1 정적 검증 (완료)

| # | 항목 | 기대 | 실측 결과 |
|---|------|------|-----------|
| 1 | `npx tsc --noEmit` | 에러 0건 | **완료** — EXIT:0 |
| 2 | 변경 파일 3개 `eslint` | 신규 에러 0건 | **완료** — 0 errors, 무관 경고 1건(`headingAccentDropdownRef` 미사용 — 기존 코드, 본 작업 무관) |
| 3 | turndown 규칙: style 있는 헤딩 → 주석+ATX 생성 | `<!-- heading: fontSize=22pt bold=true -->\n## 제목` | **완료** — node 직접 실행으로 확인(§6.1) |
| 4 | turndown 규칙: style 없는 헤딩 → 기존과 동일 | `## 제목` (주석 없음) | **완료** — 회귀 없음 확인 |
| 5 | marked+`applyHeadingDirectives` 왕복 | 주석이 `<h2 style="...">`로 복원, 주석 제거 | **완료** — node 직접 실행으로 확인 |

### 5.2 브라우저 실동작 (미검증 — 사용자 승인 필요)

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| 6 | H2 헤딩에 "제목 스타일 설정"에서 글자 크기 22pt + 굵게 지정 | 헤딩 텍스트가 즉시 22pt bold로 표시 |
| 7 | 이어서 "번호 매기기" 토글 ON | 번호(`1.` 등)가 텍스트와 같은 22pt bold로 표시 — 어긋남 없음 |
| 8 | 저장 → 탭 닫고 다시 열기 | 글자 크기/굵기/번호 모두 유지 |
| 9 | 강조 바 색상을 파란색으로 지정 → 저장 → 재열람 | 색상 유지(기존 버그 수정 확인) |
| 10 | 크기/굵기를 지정하지 않은 기존 문서 저장 | `.md` 파일 diff 0 |
| 11 | 인쇄 미리보기 | 화면과 동일한 크기로 번호·텍스트 표시 |

> §6.2(§3.5 표 8번) 사유로 **#6~#11은 dev 서버 기동 승인 후** 검증 필요.

---

## 6. 리스크 및 제약

- **DOCX/HWPX 미반영**: 이번 수정은 편집 화면(및 그 결과물인 `.md` 저장)에 한정된다. 헤딩 개별 글자 크기/굵기를 DOCX/HWPX 내보내기에도 반영하려면 `docx-export.ts`/`hwpx-plan.ts`의 헤딩 처리 로직에 `fontSize`/`bold` 파싱을 추가하는 별도 작업이 필요하다(현재 두 내보내기 모두 마크다운 텍스트 토큰만 순회하며 헤딩 인라인 스타일을 읽지 않음). 이번 논의에서 사용자가 선택한 "작은 범위"에는 포함하지 않았다.
- **인스턴스 단위 vs 문서 전체 단위**: 이 기능은 Word의 "스타일"(문서 전체 H2에 공통 적용)이 아니라 "이 헤딩 하나"에만 적용되는 로컬 서식이다(기존 `accentBorderColor`와 동일 범위). 사용자가 "이 문서의 모든 H2를 22pt로" 원한다면 각 H2마다 반복 지정해야 한다 — 문서 단위 "제목 스타일" 프로필은 향후 별도 계획서 대상(원 대화에서 언급한 `27_07_list-bullets-numbering` PRD의 설계와 유사한 방향).
- **`bold` 3상태 UX**: "기본" 선택 시 `bold: null`로 속성 자체를 지움 — 이후 테마가 바뀌어도 항상 테마 기본 굵기를 따라간다(의도된 동작).
- **정규식 안전성**: `HEADING_DIRECTIVE_RE`는 속성 값에 공백이 없다는 가정(`\S+`)에 의존한다. 색상(hex)·pt 단위·`true`/`false` 값은 공백을 포함하지 않으므로 안전하다.
