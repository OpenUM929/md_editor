# 계획서 — 사이드바 워크스페이스 경로 표시 + 폴더 열기

> 상태: Done | 작성일: 2026-07-22
> 작업 유형: B (기능 개선)
> 선행: 없음

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-22 | 최초 작성 | 사이드바 상단에 워크스페이스 전체 경로 표시 |
| 2026-07-22 | §3 구현 상세 | 폴더 열기 버튼 기능 추가 (경로 모드 전용) |

---

## 요구사항 원자화

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | 사이드바 상단에 현재 워크스페이스 폴더의 전체 경로가 표시되는가? | Y | Y — root-folder-selector.tsx에서 rootPath 표시 (라인 25~28) |
| 1.2 | FSA 모드에서는 폴더 이름만, 경로 모드에서는 전체 경로가 표시되는가? | Y | Y — isPathMode() 조건부 분기 (라인 14) |
| 1.3 | 경로가 길 때 말줄임(truncate) 처리가 되는가? | Y | Y — truncate 클래스 적용 + title 툴팁 (라인 26~27) |
| 2.1 | 경로 모드에서 폴더 열기 버튼이 표시되는가? | Y | Y — isPathMode()일 때만 버튼 렌더링 (라인 45~52) |
| 2.2 | 폴더 열기 버튼 클릭 시 OS 파일 탐색기가 열리는가? | Y | Y — openRootFolder() → 서버 API → explorer/open/xdg-open (server.ts:37~45) |
| 2.3 | FSA 모드에서 폴더 열기 버튼이 숨겨지는가? | Y | Y — isPathMode() 조건부 렌더링 (라인 45) |

---

## 1. 배경 및 목적

현재 사이드바 상단 `RootFolderSelector`에서는 폴더 이름(`rootHandle.name`)만 표시한다. 사용자가 어떤 경로의 폴더를 작업 중인지 한눈에 파악하기 어렵다. 특히 경로 모드에서는 전체 경로 정보가 존재하지만 UI에 노출되지 않는다. 또한 현재 워크스페이스 폴더를 파일 탐색기에서 바로 열 수 있는 기능이 없다.

**목적**:
1. 사용자가 현재 워크스페이스의 위치(전체 경로)를 사이드바에서 바로 확인할 수 있도록 한다
2. 경로 모드에서 현재 워크스페이스 폴더를 파일 탐색기에서 바로 열 수 있는 버튼을 제공한다

## 2. 현재 시스템 분석

- **RootFolderSelector**: `src/components/file-tree/root-folder-selector.tsx`
  - `useWorkspace()` 훅으로 `rootHandle`과 `resetWorkspace`를 사용
  - `rootHandle?.name` 또는 기본값 "워크스페이스"를 텍스트로 표시
  - 전체 경로 정보는 사용하지 않음

- **WorkspaceProvider**: `src/components/workspace/workspace-provider.tsx`
  - 현재 `rootHandle`(FSA 모드)만 컨텍스트에 노출
  - `rootPath`(경로 모드)는 `fs-access.ts`의 모듈 레벨 변수에 존재하지만 컨텍스트에서 노출하지 않음

- **fs-access.ts**: `src/lib/fs-access.ts`
  - `getRootPath()`: 경로 모드에서 현재 루트 경로 반환
  - `isPathMode()`: 현재 모드가 경로 모드인지 판단
  - `revealInFolder()`: 특정 파일이 있는 폴더를 여는 함수 (이미 구현됨)
  - `openRootFolder()`: 루트 폴더를 여는 함수 (신규 추가)

- **서버 사이드**: `src/lib/fs/server.ts`
  - `revealInFolder()`: OS 파일 탐색기에서 파일이 있는 폴더를 여는 함수 (이미 구현됨)
  - `openRootFolder()`: OS 파일 탐색기에서 루트 폴더를 여는 함수 (신규 추가)

## 3. 구현 상세

### 3.1 workspace-provider.tsx — rootPath 노출

| 항목 | 변경 |
|------|------|
| 타입 확장 | `WorkspaceContextType`에 `rootPath: string \| null` 추가 |
| 상태 추가 | `rootPath` 상태 (`useState<string \| null>(null)`) |
| 초기화 | `useEffect`에서 `storedPath`를 `setRootPathState`로 상태 설정 |
| 갱신 | `setFolderPath` 호출 후 `rootPath` 갱신 |
| 초기화 | `resetWorkspace` 호출 시 `rootPath`를 `null`로 초기화 |

### 3.2 fs-access.ts — openRootFolder 함수

| 항목 | 변경 |
|------|------|
| 함수 추가 | `openRootFolder(): Promise<string \| null>` |
| 동작 | 경로 모드일 때만 서버 API 호출, FSA 모드에서는 null 반환 |
| API 호출 | `api<string>("openRootFolder")` |

### 3.3 서버 사이드 — openRootFolder 함수

| 항목 | 변경 |
|------|------|
| 함수 추가 | `openRootFolder(root: string): Promise<string>` |
| 경로 검증 | `safeRoot(root)`으로 루트 경로 검증 |
| 플랫폼별 명령어 | Windows: `explorer`, macOS: `open`, Linux: `xdg-open` |
| 파일 타입 | `Action` 유니온에 `"openRootFolder"` 추가 |
| API 라우트 | `case "openRootFolder"` 케이스 추가 |

### 3.4 root-folder-selector.tsx — 경로 표시 + 폴더 열기 버튼

| 항목 | 변경 |
|------|------|
| 훅 변경 | `useWorkspace()`에서 `rootPath` 추가 사용 |
| import 추가 | `openRootFolder` from `@/lib/fs-access` |
| import 추가 | `ExternalLink` from `lucide-react` |
| 상태 추가 | `useCallback`으로 `handleOpenFolder` 핸들러 |
| 경로 계산 | `isPathMode()`이면 `rootPath`, 아니면 `null` |
| UI 변경 | 폴더 이름 텍스트下面에 경로 텍스트를 작게 표시 |
| 버튼 추가 | 경로 모드에서만 "폴더 열기" 버튼 표시 (`ExternalLink` 아이콘) |

**UI 변경 상세**:

```
현재:
┌─────────────────────────────────────┐
│ 📂 my-docs        [가져오기] [🔄]  │

변경 후:
┌──────────────────────────────────────────┐
│ 📂 my-docs        [가져오기] [🔗] [🔄]  │
│   D:\Documents\Projects                  │
```

- 경로 텍스트: `text-[10px] text-muted-foreground/70` 스타일
- `truncate` 클래스로 길이 제한
- `title` 속성으로 호버 시 전체 경로 툴팁 표시
- 폴더 열기 버튼: `ExternalLink` 아이콘, 경로 모드에서만 표시

## 4. 구현 순서

| 순서 | 작업 내용 | 의존 |
|------|-----------|------|
| 1 | `workspace-provider.tsx`: `rootPath` 타입 및 상태 추가, 노출 | - |
| 2 | `fs-access.ts`: `openRootFolder()` 함수 추가 | - |
| 3 | `fs/server.ts`: `openRootFolder()` 함수 추가 | - |
| 4 | `api/fs/route.ts`: `openRootFolder` 액션 추가 | 3 |
| 5 | `root-folder-selector.tsx`: 경로 표시 UI + 폴더 열기 버튼 | 1, 2 |
| 6 | TypeScript 검사 + 빌드 확인 | 5 |

## 5. 영향도 분석

| 파일 | 변경 범위 | 영향 |
|------|-----------|------|
| `src/components/workspace/workspace-provider.tsx` | 타입 확장, 상태 추가 | 워크스페이스 컨텍스트 사용 컴포넌트 |
| `src/components/file-tree/root-folder-selector.tsx` | UI 변경, 버튼 추가 | 사이드바 상단 |
| `src/lib/fs-access.ts` | `openRootFolder()` 함수 추가 | 파일 시스템 레이어 |
| `src/lib/fs/server.ts` | `openRootFolder()` 함수 추가 | 서버 사이드 파일시스템 |
| `src/app/api/fs/route.ts` | `openRootFolder` 액션 추가 | API 라우트 |

- 기존 동작 변경 없음
- FSA 모드에서는 기존대로 폴더 이름만 표시, 경로 모드에서만 전체 경로 + 폴더 열기 버튼 표시

## 6. 테스트/검증 계획

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| 1 | 경로 모드에서 워크스페이스 선택 후 사이드바 확인 | 전체 경로가 폴더 이름 아래에 표시 |
| 2 | FSA 모드에서 워크스페이스 선택 후 사이드바 확인 | 폴더 이름만 표시 (경로 미표시) |
| 3 | 경로가 긴 경우 truncate 확인 | 말줄임 처리 + 호버 시 전체 경로 툴팁 |
| 4 | 폴더 변경 후 경로 갱신 확인 | 새 경로로 변경됨 |
| 5 | 경로 모드에서 폴더 열기 버튼 클릭 | OS 파일 탐색기에서 워크스페이스 폴더 열림 |
| 6 | FSA 모드에서 폴더 열기 버튼 확인 | 버튼이 표시되지 않음 |

## 7. 리스크 및 제약

- **FSA 모드의 한계**: 브라우저 File System Access API에서는 전체 파일 경로를 제공하지 않으므로, FSA 모드에서는 폴더 이름만 표시하고 폴더 열기 버튼을 숨김
- **경로 표시 길이**: 사이드바 너비(w-64) 내에서 경로가 잘릴 수 있으므로 truncate 처리 필수
- **폴더 열기 보안**: 서버 사이드에서 `child_process.exec`를 사용하므로, 악성 경로 주입 방지를 위해 `safeRoot()`로 경로 검증 필수
