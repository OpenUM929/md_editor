# 템플릿 기능 수정 계획 (v4 - 최종, 실제 버그 발견·수정 완료)

## 실제 근본 원인 (2가지)

### 원인 1: 페이지 로드 시 `requestPermission` SecurityError (콘솔 에러)
위치: `src/lib/fs-access.ts:61-73` `verifyPermission`

`WorkspaceProvider`가 페이지 로드 시 `initRootHandle()`을 자동 호출.
이전 세션의 저장된 폴더 핸들을 꺼내 `verifyPermission()` 실행:
- `queryPermission()` → `"prompt"`
- **사용자 클릭(activation) 없이 `requestPermission()` 자동 호출 → SecurityError throw**
- `verifyPermission`가 잡지 않아 `initRootHandle()` promise reject
- 호출 측(`workspace-provider.tsx`)에 `.catch()` 없음 → **Uncaught (in promise)**
- 콘솔의 `SecurityError: User activation is required` 발생

### 원인 2: 문서 로드 실패 시 템플릿 탭이 렌더되지 않음 (클릭 무반응의 진짜 원인)
위치: `src/components/tab/workspace.tsx`

사용자가 `README.md?root=C:\dev\md_editor` 등 파일 URL로 진입할 때,
해당 문서가 워크스페이스에 없으면 `error`가 세팅되고 `Workspace`가
`isFileNotFound` / `error` 분기에서 **early-return** 합니다.
이 early-return은 `TabBar`와 활성 탭 렌더보다 먼저 실행되어,
사이드바에서 템플릿을 클릭해도 메인 영역이 에러 화면에 고정되고
**미리보기 탭이 아예 그려지지 않아 "아무 반응 없음"** 이 됩니다.

> Playwright로 재현 성공: README.md가 없는 환경에서 템플릿 클릭 시
> `tabTitles: []`(탭 미생성), 메인 영역 "파일을 찾을 수 없습니다" 유지 확인.

## 수정 내역

### 수정 1: `verifyPermission` SecurityError 처리
`src/lib/fs-access.ts:61-80`
```ts
try {
  if ((await h.queryPermission(opts)) === "granted") return true
  if ((await h.requestPermission(opts)) === "granted") return true
} catch {
  return false  // 자동 복원 경로(activation 없음)에서는 권한 없음으로 처리
}
return false
```

### 수정 2: `workspace-provider.tsx` 미처리 reject 방지
`src/components/workspace/workspace-provider.tsx:19-28`
```ts
initRootHandle()
  .then((ok) => { if (ok) { setRootHandleState(getRootHandle()); setReady(true) } })
  .catch(() => { /* 권한 복원 실패 → FolderSetup 유도 */ })
```

### 수정 3: `Workspace`가 템플릿 탭은 항상 렌더
`src/components/tab/workspace.tsx`
- 활성 탭이 `template` 이면 문서 `error`와 무관하게 항상 `TemplatePreviewTab` 렌더
- 그 외에는 기존 `isFileNotFound` / `error` early-return 유지
- 남은 분기에서 `activeTab`은 `DocTab`만 가능하므로 `DocTabContent`로 단순화

### 수정 4: `package.json` dev 스크립트
```diff
- "dev": "next dev"
+ "dev": "node scripts/build-templates.mjs && next dev"
```
(`public/templates.json`이 git 미추적 → dev만 돌리면 생성 안 됨 방어)

## 되돌린 변경
- `template-browser-modal.tsx` Suspense 추가 — 실제 원인 아님, 되돌림
- `template-detail-modal.tsx` loading 리셋 — 실제 원인 아님, 되돌림

## 검증 (Playwright, 모두 통과)
- `e2e/template-click.spec.ts` — 기존 클릭→미리보기 (통과)
- `e2e/template-security-error.spec.ts` — 저장 핸들 + requestPermission SecurityError 시나리오:
  unhandled SecurityError 없음, 템플릿 클릭 정상 (통과)
- `e2e/template-file-error.spec.ts` — 문서 로드 실패 상태에서 템플릿 클릭 → 미리보기 정상 (통과)
- `e2e/fsa-folder-setup.spec.ts` — 기존 4개 (통과)
- `npm run lint` — 0 errors

## 교훈
- 초기 테스트가 `requestPermission`을 항상 성공하는 mock으로 치환해 실제 브라우저의
  "User activation required" 보안 제약을 모사하지 못함 → SecurityError 놓침 (사용자 지적 정당)
- 충실한 재현(activation 없으면 throw하는 mock, 문서 없는 파일 URL)으로 실제 버그 발견
