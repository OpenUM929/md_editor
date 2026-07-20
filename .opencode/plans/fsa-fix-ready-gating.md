# FSA 폴더 선택 후 앱이 동작하지 않는 버그 수정

> 날짜: 2026-07-13
> 상태: 계획 (plan mode)

## 현상
- 첫 방문 시 폴더 선택 모달(`FolderSetup`)이 뜨고, 사용자가 폴더를 선택하면 모달은 사라지지만 **사이드바 파일 트리와 메인 편집기에 계속 에러("워크스페이스 폴더가 선택되지 않았습니다")가 표시됨**.
- 사용자 문의: "왜 안 되는 거야?", "매번 폴더를 선택해야 해?"

## 원인 (코드 확인 완료)
- `src/app/(markdown)/layout.tsx`의 `MarkdownLayoutInner`(line 90)가 `SidebarInner`(내부 `FileTree`)와 `{children}`(page.tsx)을 **항상 마운트**함.
- 이 컴포넌트들은 마운트 즉시 `getFileTree()` / `readMdFile()` 실행 → 폴더 미선택 상태라 `ensureRoot()`가 `"워크스페이스 폴더가 선택되지 않았습니다"` 예외 발생.
- `fs-access.ts`의 `getFileTree`/`readMdFile`은 이를 try-catch로 잡아 `error` 상태로 저장.
- `ready`가 `false → true`로 바뀌어도 `MarkdownLayoutInner`·`FileTree`·`page.tsx`는 `ready`를 의존성으로 갖지 않아 **effect가 재실행되지 않음** → 캐싱된 에러가 그대로 화면에 남음.

## "매번 폴더 선택?" 답변 (기술적 사실)
- `showDirectoryPicker`(폴더 탐색기)는 **최초 1회만** 호출. 핸들은 IndexedDB에 저장.
- 같은 브라우저 세션 내 새로고침(F5) → 권한 유지, 프롬프트 없음.
- 브라우저 완전 종료 후 재시작 → Chrome이 가벼운 **"이 폴더 편집 허용?" 동의 다이얼로그** 노출(폴더 탐색기 아님). 거부 시에만 `FolderSetup` 재노출.
- 즉 "매번 폴더를 직접 찾아가는" 건 아니며, 이는 File System Access API의 근본 제약(우회 불가).

## 수정 계획

### 1. layout.tsx — 앱 콘텐츠를 `ready` 뒤로 게이팅
- `MarkdownLayoutInner`에서 `useWorkspace()`로 `ready` 가져오기.
- `<aside>` 렌더 조건: `open && ready` 로 변경 (FileTree가 폴더 선택 후에만 마운트되게).
- `<main>` 콘텐츠: `ready ? children : <콘텐츠 로딩 상태>` 로 변경 (page.tsx가 폴더 선택 후에만 마운트되게).
- 효과: `ready`가 true로 바뀌면 `children`/`FileTree`가 **새로 마운트**되어 effect가 유효한 핸들로 실행됨 → 캐싱 에러 해소.

### 2. (선택) sidebar에 현재 폴더 표시 + 변경 버튼
- `RootFolderSelector`에 "현재 폴더: <이름>" 표시 및 "변경" 버튼 추가 → `resetWorkspace()` 호출해 재선택 유도.
- 사용자가 "기억됨"을 인지하고, 필요 시 쉽게 바꿀 수 있게.

### 3. (선택) 권한 거부 시 부드러운 fallback
- `initRootHandle` 실패(권한 거부) 시 `ready=false` 유지 + `FolderSetup` 노출(이미 동작).
- 추가로 IndexedDB 폴백은 하지 않음(단순 유지보수 위해 FSA 단일 경로).

## 영향 파일
- 수정: `src/app/(markdown)/layout.tsx` (게이팅), `src/components/file-tree/root-folder-selector.tsx` (폴더 표시/변경, 선택)
- 불필요: 추가 라이브러리 없음.

## 검증
- `npm run dev` → localhost:3000 → 폴더 선택 → 사이드바에 `.md` 트리 정상 표시, 파일 클릭 시 편집기 로드.
- 모달 닫힌 뒤 에러 문구 없음 확인.
- F5 새로고침 → 재선택 없이 바로 동작(세션 내 권한 유지).
- `npm run build` / `npm run lint` 통과.
