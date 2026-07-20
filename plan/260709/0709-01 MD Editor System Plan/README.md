# MD Editor System Plan

> **작성일:** 2026-07-09 (260709)
> **프로젝트명:** MD File WYSIWYG Editor Web System
> **폴더명 규칙:** `YYMMDD/MMDD-NN Plan name`
> - YYMMDD: 계획서 작성일
> - MMDD: 해당 계획의 기준일
> - NN: 해당일 내 순번 (01, 02...)
> - Plan name: 영문 짧은 설명

---

## 1. 개요

**MD 문법을 몰라도** 일반 문서 편집기(MS Word, 한글, Notion)처럼 **보이는 대로(WYSIWYG)** `.md` 파일을 편집할 수 있는 웹 시스템 개발. 내부적으로만 Markdown으로 저장하여 개발자 친화적이면서도 비개발자도 사용 가능.

사용자는 **루트 폴더를 자유롭게 선택**하여 원하는 디렉토리 기준으로 파일을 탐색하고 편집할 수 있음.

## 2. 기술 스택

| 계층 | 기술 | 비고 |
|---|---|---|
| Framework | Next.js 15 App Router | 최신 안정 버전 |
| Language | TypeScript 5.x | 엄격 모드 |
| 스타일링 | TailwindCSS | 유틸리티 퍼스트 |
| UI 컴포넌트 | ShadcnUI + Lucide-react | Radix 기반, 접근성 우수 |
| **WYSIWYG 엔진** | **Tiptap** (`@tiptap/core` + `@tiptap/react`) | **가장 보편적 (12.2M/week)** |
| MD 변환 | `@tiptap/html` + `turndown` | HTML ↔ Markdown 변환 |

## 3. 라이브러리 선정: Tiptap

### 3.1 선정 근거 (WYSIWYG 엔진 비교)

| 라이브러리 | npm 주간 다운로드 | GitHub Stars | React 지원 | 최근 릴리스 | MD 출력 | 비고 |
|---|---|---|---|---|---|---|
| **Tiptap** | **12.2M** | **37k** | ✅ **1st-class** | **어제** | ✅ Extension | ★ **선택** |
| Lexical | 3.0M | 22.5k | ✅ | 20일 전 | ⚠️ 플러그인 필요 | Meta 제작, 아직 v0.x |
| Slate | 2.3M | 31.6k | ⚠️ | 2달 전 | 직접 구현 | 러닝커브 큼 |
| Quill | 3.3M | 47k | ❌ | 1년 전 | 직접 구현 | 유지보수 정체 |

**Tiptap 선택 이유:**
- **npm 12.2M/week** = Lexical(3M)의 **4배**, 가장 널리 사용됨
- GitHub 37k stars, 1736 dependents로 생태계 최대
- `@tiptap/react` (10M/week)로 **React 네이티브 지원**
- 100+ extension 생태계 (Markdown, Table, Image 등 기본 제공)
- ProseMirror 기반으로 안정성 검증 (NYT, The Guardian, Atlassian 사용)
- Headless → ShadcnUI와 완전한 자유도로 커스텀 UI 가능
- Notion-like 템플릿 제공 (참고 가능)

### 3.2 관련 패키지

```
@tiptap/core          # 코어 엔진 (12.2M/week)
@tiptap/react         # React 바인딩 (10M/week)
@tiptap/starter-kit   # 필수 extension 모음 (9.7M/week)
@tiptap/html          # HTML <-> ProseMirror 변환
turndown              # HTML -> Markdown 변환
```

### 3.3 Tiptap Extensions 구성

| Extension | 패키지 | 기능 |
|---|---|---|
| **StarterKit** | `@tiptap/starter-kit` | Bold, Italic, Heading, List, Blockquote, Code, 수평선 등 기본 서식 |
| **Task List** | `@tiptap/extension-task-list` + `@tiptap/extension-task-item` | 체크 박스 (클릭 토글) |
| **Table** | `@tiptap/extension-table`, `-table-header`, `-table-row`, `-table-cell` | 표 생성/편집, 셀 병합 |
| **Link** | `@tiptap/extension-link` | 하이퍼링크 삽입/편집 |
| **Image** | `@tiptap/extension-image` | 이미지 삽입 (Drag & Drop) |
| **Emoji** | `@tiptap/extension-emoji` | 이모지 입력 (`:smile:`) |
| **Code Block Lowlight** | `@tiptap/extension-code-block-lowlight` | 100+ 언어 syntax highlight |
| **Placeholder** | `@tiptap/extension-placeholder` | 빈 문서 안내 문구 |
| **Character Count** | `@tiptap/extension-character-count` | 글자 수 카운트 (선택) |
| **Slash Command** | 커스텀 Extension | `/` 입력 시 Notion 스타일 명령어 메뉴 |

**패키지 설치:**
```
npm install @tiptap/core @tiptap/react @tiptap/starter-kit @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-table @tiptap/extension-link @tiptap/extension-image @tiptap/extension-emoji @tiptap/extension-code-block-lowlight @tiptap/extension-placeholder
```

## 4. 아키텍처

### 4.1 핵심 UX 컨셉

```
[사용자 시점]
┌──────────────────────────────────────────────────┐
│  사이드바                     │  WYSIWYG 편집 영역   │
│  ┌────────────────────┐      │                     │
│  │ 📁 루트 선택: [___]│      │  • Notion/한글처럼    │
│  │ 📁 content/        │      │  • 보이는 대로 편집   │
│  │   ├ 📄 index.md    │      │  • MD 문법 몰라도 됨  │
│  │   ├ 📁 docs/       │      │                     │
│  │   │ └ 📄 guide.md  │      │  [B] [I] [U] [H]    │
│  │   └ 📁 api/        │      │  ┌───────────────┐  │
│  │     └ 📄 ref.md    │      │  │ 문서 내용을     │  │
│  └────────────────────┘      │  │ 바로 여기서     │  │
│                              │  │ 편집합니다.     │  │
│                              │  └───────────────┘  │
└──────────────────────────────────────────────────┘
```

### 4.2 데이터 흐름

```
Browser (Client Component)          Next.js Server
  │                                       │
  ├── sidebar/file-tree.tsx               │
  │   ← root 파라미터로 파일 목록 fetch    │
  │   ← 사용자 폴더 선택 시 root 변경      │
  │                                       │
  ├── [[...path]]/page.tsx                │
  │   ← Server Component가 .md raw 읽음   │
  │   ← turndown으로 HTML 변환             │
  │   ← tiptap-editor (Client)에 전달     │
  │                                       │
  ├── tiptap-editor.tsx                    │
  │   ← @tiptap/react (useEditor)        │
  │   ← WYSIWYG 편집 (contenteditable)    │
  │   ← onChange → HTML 추출              │
  │   ← turndown → Markdown 변환          │
  │   ← saveFile Server Action 호출       │
  │                                       │
  └── Server Action (saveFile)            │
      → fs.writeFile → content/*.md       │
      → revalidatePath → 캐시 갱신        │
```

### 4.3 루트 폴더 선택 흐름

```
┌─ 사용자 폴더 선택 ───────────────────────────────────┐
│                                                       │
│  [파일트리 상단]                                       │
│  ┌───────────────────────────────────────────┐        │
│  │ 📁 루트 폴더                                │        │
│  │ ┌───────────────────────────────┐ ────┐   │        │
│  │ │ C:\Users\me\MyNotes          [적용] │   │        │
│  │ └───────────────────────────────┘ ────┘   │        │
│  │                                           │        │
│  │ 🕐 최근 경로                              │        │
│  │   C:\dev\my-docs                   ✕      │        │
│  │   D:\projects\wiki                 ✕      │        │
│  └───────────────────────────────────────────┘        │
│                                                       │
│  ┌─ 텍스트 직접 입력 ──────────────────────────┐      │
│  │ Enter 또는 [적용] 버튼으로 적용              │      │
│  │ 존재하지 않는 경로는 빨간 에러 메시지         │      │
│  │ 적용된 경로는 localStorage에 저장 (최근 10개) │      │
│  └──────────────────────────────────────────────┘      │
│                                                       │
│  변경 시 → ?root=C%3A%5CUsers%5Cme%5CMyNotes          │
│  → 서버에서 해당 경로 기준 트리 재구성                 │
│  → revalidatePath → 파일 목록 갱신                    │
└───────────────────────────────────────────────────────┘
```

**URL 상태 유지:** `?root=<encoded-path>` 쿼리 파라미터로 루트 경로 유지
**기본값:** `content/`
**최근 경로:** localStorage `md_editor_root_history` 키에 최대 10개 저장, 개별 삭제 가능
**참고:** OS 네이티브 폴더 선택 다이얼로그는 웹 브라우저에서 불가능하므로, 텍스트 직접 입력 + 최근 경로 히스토리 방식 채택

### 4.4 디렉토리 구조

```
md-editor/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                       # 환영/리다이렉트 페이지
│   ├── (markdown)/
│   │   ├── layout.tsx                 # 파일트리 + 에디터 레이아웃
│   │   └── [[...path]]/page.tsx       # 동적 라우팅
│   └── api/
│       └── files/route.ts             # 파일 CRUD API
├── components/
│   ├── editor/
│   │   ├── tiptap-editor.tsx           # Tiptap 에디터 래퍼 (핵심)
│   │   ├── editor-toolbar.tsx          # 툴바 (Bold, Italic, Heading...)
│   │   └── extensions/                 # 커스텀 Tiptap 확장
│   ├── file-tree/
│   │   ├── file-tree.tsx               # 파일 트리 + 루트 선택기 포함
│   │   ├── file-tree-node.tsx          # 단일 노드
│   │   ├── root-folder-selector.tsx    # 루트 폴더 선택 UI
│   │   └── file-tree-actions.tsx       # 생성/삭제/이름변경
│   └── ui/                            # ShadcnUI
├── lib/
│   ├── fs-server.ts                   # 파일 시스템 유틸 (서버 전용)
│   ├── markdown.ts                    # MD ↔ HTML 변환 유틸
│   └── constants.ts
└── content/                           # 기본 MD 파일 저장 디렉토리
    └── ...
```

## 5. 디자인 선행 접근법

### 5.1 목업 범위 (WYSIWYG + 루트 선택)

| 영역 | 내용 | 비고 |
|---|---|---|
| 사이드바 상단 | **루트 폴더 선택 입력** + 버튼 | 드롭다운/직접 입력 |
| 사이드바 | 선택된 루트 기준 파일 트리 (폴더/파일) | Lucide 아이콘, indent |
| 헤더 | 파일명, 저장 버튼, 저장 상태, 다크모드 토글 | |
| 툴바 | H1~H6, Bold, Italic, Underline, Strike, List, Table, Code, Link, Image | Shadcn 스타일 |
| 편집 영역 | **Tiptap WYSIWYG** (contenteditable, textarea 아님) | Notion/한글 스타일 |
| 상태 표시 | 저장 완료/실패 토스트 | |

### 5.2 컬러 팔레트

Shadcn 기본 테마(oklch) 기반 Light/Dark 모드 대응.

## 6. 구현 단계 (총 8단계)

| 단계 | 작업 내용 | 산출물 |
|---|---|---|
| **1단계** | **HTML/CSS WYSIWYG 목업 제작** | `mockups/` 내 HTML (Tiptap CDN 사용) | ✅ |
| **2단계** | 디자인 피드백 및 수정 | 목업 최종본 확정 | ✅ |
| **3단계** | Next.js 16 + ShadcnUI + TailwindCSS v4 초기화 | 프로젝트 베이스 (완료) | ✅ |
| **4단계** | 목업 → React 컴포넌트 전환 | Tiptap 에디터 + 툴바 + 파일트리 + 자동저장 | ✅ |
| **5단계** | 파일 트리 + 루트 선택 + 라우팅 구현 | 파일 탐색 + 동적 라우팅 + 루트 쿼리 | ✅ |
| **6단계** | Tiptap ↔ MD 변환 + 저장 + 자동 저장 구현 | Server Action + turndown + 2초 debounce + 복구 | ✅ |
| **7단계** | 다크모드 + 반응형 + 에러 처리 | next-themes + Sheet(모바일) + 에러 토스트 | ✅ |
| **8단계** | 통합, 보안, 최종 완성 | Path 검증 + XSS 방어 + Playwright MCP 설정 | ✅ |

## 7. 보안 규칙

- `path` 경로 이탈 방지 (`path.resolve` + `path.normalize`)
- `.md` 확장자 화이트리스트
- 저장 경로를 선택된 루트 디렉토리 내로 제한
- HTML 입력 sanitize (Tiptap 내장 + DOMPurify 검토)

## 8. UX 결정 사항

- **파일 저장 위치:** 사용자가 선택한 루트 폴더 기준
- **파일 탐색:** 좌측 파일 트리 + **상단 루트 폴더 선택기**
- **편집 방식:** **WYSIWYG (Notion/한글 스타일)** — Tiptap 엔진
- **저장 트리거:** 저장 버튼 클릭 + Ctrl+S
- **MD 변환:** turndown 라이브러리로 HTML → Markdown 변환
- **트리 경로:** 루트 기준 상대 경로 (`index.md`, `docs/guide.md`) — URL 중복 방지
- **루트 기본값:** `content/`
- **루트 상태:** URL 쿼리 파라미터 `?root=` 로 유지
- **다크모드:** Shadcn 시스템 테마 연동
- **사용자:** MD 문법을 몰라도 사용 가능

## 9. 자동 저장 및 복구 시스템

### 9.1 개요

편집 중인 내용을 **임시 파일(.tmp)**로 자동 저장하여, 브라우저 종료/충돌 시에도 데이터 손실을 방지하고 **diff 다이얼로그**를 통해 복구할 수 있음.

### 9.2 임시 파일 구조

```
content/
├── index.md                       # 원본 파일 (수동 저장 시만 변경)
├── .temp/
│   ├── index.md.tmp              # 자동 저장된 임시 파일
│   └── index.md.tmp.meta         # 메타데이터 (JSON)
│       ├── lastAutoSaveAt        # 마지막 자동 저장 시간
│       ├── originalMd5           # 원본 파일 체크섬
│       └── filePath              # 원본 파일 경로
├── docs/
│   ├── getting-started.md
│   └── .temp/
│       ├── getting-started.md.tmp
│       └── getting-started.md.tmp.meta
└── guides/
```

### 9.3 저장 프로세스

```
[사용자 편집]
     │
     ▼
2초 debounce (추가 입력 없으면 저장 트리거)
     │
     ├──→ localStorage 저장 (클라이언트, 즉시)
     │    • key: "md_editor_draft:{filePath}"
     │    • value: { content, savedAt }
     │    • 브라우저 crash 대비 1차 방어선
     │
     └──→ Server Action: 자동 저장 (throttle 10초)
          • fs.writeFile → content/.temp/{file}.md.tmp
          • 원본 파일은 절대 건드리지 않음
     │
     ▼
[수동 저장: Ctrl+S / Save 버튼]
     │
     ├──→ content/.temp/{file}.md.tmp 삭제
     ├──→ fs.writeFile → content/{file}.md (원본 저장)
     ├──→ revalidatePath → 캐시 갱신
     └──→ localStorage 초안 삭제
```

### 9.4 복구 다이얼로그 (Diff 방식)

재접속 시 서버에 `.temp` 파일이 존재하면 아래 다이얼로그 표시:

```
┌──────────────────────────────────────────────────────────┐
│  ⚠️  저장되지 않은 변경사항이 있습니다                      │
│                                                          │
│  ┌──────────────────────┬──────────────────────────────┐  │
│  │  원본 (마지막 저장)   │  임시 파일 (편집 중)          │  │
│  ├──────────────────────┼──────────────────────────────┤  │
│  │  # Welcome           │  # Welcome to MD Editor      │  │
│  │                      │                              │  │
│  │  ## Intro            │  ## Getting Started          │  │
│  │                      │  여기에 새로운 내용이          │  │
│  │  마지막 저장:         │  추가되었습니다.              │  │
│  │  10:30 AM            │                              │  │
│  │                      │  마지막 자동 저장:             │  │
│  │                      │  10:45 AM                    │  │
│  ├──────────────────────┴──────────────────────────────┤  │
│  │  [-- 추가된 라인] [++ 삭제된 라인]                    │  │
│  │  @@ -1,3 +1,5 @@                                    │  │
│  │   # Welcome                                         │  │
│  │  +# Welcome to MD Editor                            │  │
│  │   ## Intro                                          │  │
│  │  -## Getting Started                                │  │
│  │  +여기에 새로운 내용이 추가되었습니다.                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│     [복구 (임시 파일 적용)]       [임시 파일 삭제]        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**동작:**
- **복구:** `.tmp` 내용을 원본으로 승격 (원본 덮어쓰기)
- **삭제:** `.tmp` 및 `.tmp.meta` 파일 제거, 원본 유지
- **취소:** 다이얼로그 닫기, `.tmp` 유지 (다음 접속 시 재표시)

### 9.5 자동 저장 규칙

| 항목 | 값 | 설명 |
|---|---|---|
| Auto-save debounce | **2초** | 키 입력 후 2초 동안 추가 입력 없으면 저장 |
| Server throttle | **10초** | 너무 잦은 서버 호출 방지 |
| localStorage 저장 | **즉시** | 모든 변경 시 localStorage에 즉시 기록 |
| 임시 파일 보관 | **최대 7일** | 7일 지난 .tmp 파일은 서버 시작 시 자동 정리 |
| 최대 temp 파일 수 | **50개** | 초과 시 가장 오래된 파일부터 삭제 |
| 복구 확인 | **매 접속 시** | `.tmp` 존재하면 항상 다이얼로그 표시 |

### 9.6 관련 컴포넌트

| 컴포넌트 | 역할 |
|---|---|
| `hooks/use-auto-save.ts` | debounce + localStorage + 서버 자동 저장 오케스트레이션 |
| `components/editor/auto-save-indicator.tsx` | 저장 상태 표시 (Saving... / Saved / Unsaved changes) |
| `components/editor/recovery-dialog.tsx` | 복구 다이얼로그 (diff 뷰 포함) |
| `lib/auto-save-server.ts` | 서버 측 .tmp 파일 CRUD 유틸 |

## 10. 미결정 사항

- [ ] GitHub 연동 (`@octokit/rest`) 여부
- [ ] Vercel 배포 계획
- [ ] 인증/권한 시스템 필요 여부
- [ ] 파일 생성/삭제/이름변경 UI
- [ ] 검색 기능 (파일 내/파일 명)
- [ ] 협업 편집 (Y.js + Hocuspocus)
- [x] 루트 선택 UI 방식 (텍스트 직접 입력 + 최근 경로 히스토리)
  - 텍스트 입력: 로컬 PC의 아무 경로나 직접 입력 (`C:\Users\me\MyNotes`)
  - OS 네이티브 폴더 선택 다이얼로그는 웹 브라우저에서 사용 불가 → webkitdirectory 제거
  - 최근 경로: localStorage에 최대 10개 저장, 목록 클릭 시 즉시 적용, 개별 삭제 가능
  - 존재하지 않는 경로: 파일트리 영역에 빨간 에러 메시지 표시
- [ ] auto-save 복구 diff 알고리즘 (단순 라인 비교 / git diff)
- [ ] .tmp 파일 정리 주기 (서버 시작 시 / 스케줄러)
- [ ] localStorage 용량 제한 대책 (5MB)

## 11. 참고 자료

- Tiptap: https://tiptap.dev / https://github.com/ueberdosis/tiptap
- @tiptap/react: https://www.npmjs.com/package/@tiptap/react
- Tiptap Notion-like 템플릿: https://tiptap.dev/c/notion-like-editor
- ShadcnUI Sidebar: https://ui.shadcn.com/docs/components/sidebar
- turndown (HTML→MD): https://github.com/mixmark-io/turndown
- Lucide icons: https://lucide.dev

---

## 12. Recovery Dialog 레이아웃 버그 분석 (2026-07-09)

### 12.1 문제 상황

복구 다이얼로그의 Comparison section (`flex-[35]`)이 모달 전체 높이를 차지하고, Diff section (`flex-[65]`)은 공간을 전혀 차지하지 않는 현상 발생.

### 12.2 높이 전파 체인 (실패 분석)

```
DialogContent (max-h-[60vh], flex, flex-col, overflow-hidden)
  ├── DialogHeader (shrink-0)                         ← OK
  ├── ScrollArea Root (flex-1, min-h-0)               ← 잔여공간 채움
  │     └── ScrollArea Viewport (h-full, overflow-auto) ← Root 높이 상속
  │           └── div.h-full.flex.flex-col             ← ❌ 실패
  │                 ├── flex-[35] Comparison            ← 전체 차지
  │                 └── flex-[65] Diff                  ← 0px
  └── DialogFooter (shrink-0)                         ← OK
```

### 12.3 근본 원인

| 레이어 | 문제 | 설명 |
|---|---|---|
| **ScrollArea** | `overflow: auto` 내장 | Viewport가 자식 콘텐츠를 제약하지 않고 확장시킴. 불필요한 레이어로 최종 구조에서 제거 |
| **Flex item `flex-grow` 무시** | `overflow: visible`(기본값) | flex 아이템은 `overflow: visible`일 때 `min-height: auto`가 적용되어 **콘텐츠 최소 크기 이하로 축소되지 않음**. `min-h-0`과 `overflow:hidden`을 설정해도 Chrome에서 `flex-grow` 기반 비율 분배가 정상 동작하지 않음 (브라우저 버그로 추정) |
| **CSS Grid `fr` 해결** | `fr` 단위는 항상 정확 | `grid-rows-[35fr_65fr]`는 gap을 제외한 공간을 정확히 35:65로 분배. Grid는 flex보다 비율 분배에 강건함 |

### 12.4 최종 해결책

**CSS Flex → CSS Grid 전환**

```diff
-  <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden px-1">
-    <div className="min-h-0 flex flex-col border-t pt-4" style={{ flex: '35 1 0%' }}>
+  <div className="flex-1 min-h-0 grid grid-rows-[35fr_65fr] gap-3 overflow-hidden px-1">
+    <div className="min-h-0 flex flex-col border-t pt-4 overflow-hidden">
```

| 방식 | 비교 (%) | Diff (%) | 정확도 |
|---|---|---|---|
| Flex `flex-grow` | 49.5% | 11.2% | ❌ flex-[35]가 49.5% 차지 |
| Inline `height: 35%` | 49.5% | 11.2% | ❌ 부모 높이가 definite이 아니어서 % 무시 |
| Inline `flex: 35 1 0%` | 49.5% | 11.2% | ❌ min-height auto로 인해 flex-grow 무시 |
| **Grid `35fr_65fr`** | **35.0%** | **65.0%** | **✅ 정확** |

### 12.5 Playwright 검증 결과

```typescript
// e2e/recovery-dialog-layout.spec.ts
test("recovery dialog sections are 35/65 of available height", async ({ page }) => {
  await page.goto("http://localhost:3000/index.md")
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 })

  const compBox = await page.evaluate(() => {
    const d = document.querySelector('[data-testid="comparison-section"]')
    return d ? d.getBoundingClientRect() : null
  })
  const diffBox = await page.evaluate(() => {
    const d = document.querySelector('[data-testid="diff-section"]')
    return d ? d.getBoundingClientRect() : null
  })

  const totalHeight = compBox!.height + diffBox!.height
  const compRatio = compBox!.height / totalHeight
  const diffRatio = diffBox!.height / totalHeight

  // 35% ± 2%, 65% ± 2%
  expect(compRatio).toBeGreaterThan(0.33)
  expect(compRatio).toBeLessThan(0.37)
  expect(diffRatio).toBeGreaterThan(0.63)
  expect(diffRatio).toBeLessThan(0.67)
})
```

**실행 결과:**
```
Comparison: 101.46px (35.0%)
Diff: 188.45px (65.0%)
Total: 289.91px
✓ 통과
```

### 12.6 수정된 파일

| 파일 | 변경 |
|---|---|
| `src/components/editor/recovery-dialog.tsx` | ScrollArea 제거 → `div`로 대체, Flex → Grid `35fr_65fr` 전환, `overflow-hidden` 추가 |
| `e2e/recovery-dialog-layout.spec.ts` | 35/65 비율 검증 E2E 테스트 |
| `playwright.config.ts` | webServer 설정 추가 (자동 dev 서버 실행) |

### 12.7 최종 레이아웃 구조

```
DialogContent (max-h-[60vh], flex, flex-col)
  DialogHeader (shrink-0)
  div.grid.grid-rows-[35fr_65fr].gap-3 (flex-1, min-h-0)   ← Grid가 비율 담당
    ├── row 1 (35fr): Comparison Section
    │     └── grid.grid-cols-2.grid-rows-[1fr] (원본 | 임시)
    └── row 2 (65fr): Diff Section
          ├── header (shrink-0)
          └── content (flex-1, overflow-y-auto)
  DialogFooter (shrink-0)
```