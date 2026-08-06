# 계획서 — user-auth (사용자 인증)

> 상태: 진행 중 (작업 3/7) | 작성일: 2026-08-05
> 작업 유형: B (기능 개선/신규 기능)
> 선행: 없음

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-08-05 | 생성 | 초기 계획서 작성 |
| 2026-08-05 | §4.1, §4.2 | 작업 1·2 완료 (상수/env + 세션 코어) |

---

## 1. 배경 및 목적

MD Editor(Next.js 16 앱 라우터, React 19, Tiptap 3)는 현재 로컬 파일 시스템 기반 에디터로 인증 모듈이 전무하다. 보호·게스트 전환이 가능한 선택형 사용자 인증을 추가해, 원할 때 파일/이미지/내보내기 API를 특정 사용자 전용으로 봉쇄하고 비활성 시 기존 익명 동작을 유지한다.

## 2. 요구사항

1. 비밀번호 기반 로그인/로그아웃/상태 조회 (OAuth는 후속 범위로 제외)
2. `httpOnly` 쿠키 세션 토큰 (HMAC-SHA-256 서명, 만료 포함)
3. `AUTH_ENABLED` 토글로 게스트(비활성)/보호(활성) 전환, 기본 **활성(true)**
4. 보호 대상: 에디터 페이지 + `/api/asset`, `/api/fs`, `/api/export/*` (서버 헬퍼로 중앙화)
5. 클라이언트 인증 훅 + 로그인 UI/가드
6. **추가 의존성 없이** `node:crypto`로 구현
7. 성공 기준: `npm run lint` + `tsc --noEmit` 통과, 기존 에디터 무회귀

## 3. 현재 시스템 분석 (코드 실측 확인 완료)

### 3.1 인증 인프라 현황 — 없음
- `src` 전역 `process.env` / `cookies()` / 인증 관련 코드 Grep 결과 4건뿐(console/로그용), **세션·쿠키·인증 라이브러리 전무** (`src/app/api/export/hwpx/route.ts:14` 의 `HWPX_PYTHON` env 활용만 존재)
- `next.config.ts` 에 `allowedDevOrigins: ["10.10.102.223"]` 고정, `NODE_ENV==="production"`에서만 Serwist(`withSerwist`) 적용 → dev 홈등의 http 쿠키 허용 필요

### 3.2 Route Handler 패턴 (참조할 기존 패턴)
- `src/app/api/fs/route.ts`: action 문자열 디스패치 후 `ok() → NextResponse.json({data})`, 오류 500. `src/lib/fs/server.ts` 의 `safeRoot`/`safePath` 경로 검증 우회 금지
- `src/app/api/asset/route.ts:11-31`: GET, 쿼리 `root`,`path`, 400/403/404, dev에서 `console.error`
- `src/app/api/export/docx/route.ts:17-56`, `export/hwpx/route.ts`: POST, try/catch 후 `NextResponse.json({error})`, 400 / 바이너리 다운로드

### 3.3 UI/훅 패턴
- `src/components/ui/` Shadcn 컴포넌트, `sonner` toast 사용 (`src/app/(markdown)/layout.tsx`), `(markdown)/layout.tsx` 는 `"use client"`
- 테마 토글(다크/라이트) `next-themes` 사용
- `src/lib/constants.ts` 에 상수 집중 (경로/확장자/자동저장 ms). 새 상수는 여기 추가

### 3.4 패키지 — 인증 의존성 없음
- `package.json` (직접 Read): `next` 16.2.10, `react` 19.2.4, `@serwist/next` 9.5.11, `docx`/`jszip`/`marked`/`gray-matter`. `bcrypt`/`jsonwebtoken`/`cookie` 등 **부재** → `node:crypto` 사용이 올바름

---

## 4. 구현/수정 상세

### 4.1 상수 및 환경 설정
- `src/lib/constants.ts` 하단 추가:
  - `AUTH_SESSION_COOKIE = "__md_auth"`
  - `AUTH_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000`
  - `AUTH_PATH = "/"`
- 신규 `src/lib/auth-config.ts` (상단 `import "server-only"`): `getAuthEnabled()` / `getAuthSecret()` / `getAuthPasswordHash()` / `getAuthSalt()` — 전부 `process.env[AUTH_*]`에서 읽어 클라이언트 번들 유입 차단. 값 부재 시 빈 문자열 반환(require-auth에서 명시 실패)

### 4.2 세션 코어
- 신규 `src/lib/auth.ts` (`import "server-only"`), `node:crypto` 사용:
  - `createSessionToken(clientId?)`: `header {alg:"HS256"}`, `payload {exp:Date.now()+MAX_AGE}`, `sig=HMAC-SHA256(secret, 조각)`, base64url 3조각 join(".")
  - `verifySessionToken(token)` → 유효 시 payload / 위변조·만료 시 `null` (`timingSafeEqual`)
  - `getSessionFromRequest(req)` → 쿠키 토큰 검증
  - `setSessionCookie(res, token)` / `clearSessionCookie(res)` — `httpOnly:true, sameSite:"lax", path:"/", secure: NODE_ENV==="production"`
  - 비밀 검증: `AUTH_SALT`+비밀 sha-256 해시 + `timingSafeEqual` 비교

### 4.3 보호 헬퍼 중앙화
- 신규 `src/lib/require-auth.ts`:
  - `requireAuth(req)`: `!getAuthEnabled()` → `{ok:true}`. 활성이면 `getSessionFromRequest` 후 실패 시 `401 {"error":"인증이 필요합니다"}` Response
  - `requireAuthPage()`: 활성 && 미인증 → `redirect("/login")`(`next/navigation`)

### 4.4 인증 API
- 신규 `src/app/api/auth/login/route.ts` (POST): 비밀 대조 → 성공 시 `setSessionCookie` 후 `{ok:true}`; 실패 시 `401`; `!getAuthEnabled()` 시 `403`. 일정 지연으로 타이밍 어택 완화
- 신규 `src/app/api/auth/logout/route.ts` (POST): `clearSessionCookie` → `{ok:true}`
- 신규 `src/app/api/auth/status/route.ts` (GET): `{authed, enabled}` (시크릿/해시 미포함)

### 4.5 보호 경로 통합
- `src/app/api/fs/route.ts`, `src/app/api/asset/route.ts`, `src/app/api/export/docx/route.ts`, `src/app/api/export/hwpx/route.ts` 각각 최상단에 `const g = requireAuth(req); if (!g.ok) return g.response;` 삽입 (기존 경로 보안 로직은 수정하지 않음)

### 4.6 클라이언트 훅/UI
- 신규 `src/hooks/use-auth.ts`: `/api/auth/status` 조회 → `authed`/`enabled`/`loading`, `login(password)`, `logout()`
- 신규 `src/app/login/page.tsx`: Shadcn `Button`/`Input` + 카드 레이아웃, 비밀번호 입력·로그인·에러 표시
- 에디터 접근 가드: 활성 && 미인증이면 로그인 페이지로 유도 (`requireAuthPage()` 또는 상위 서버 경로)

---

## 5. 영향도 분석

| 파일 | 유형 | 영향 |
|------|------|------|
| `src/lib/constants.ts` | 수정 | 상수 추가(기존 값 무변경) |
| `src/lib/auth-config.ts`, `src/lib/auth.ts`, `src/lib/require-auth.ts` | 신규 | 서버 전용 인증 코어 |
| `src/app/api/auth/{login,logout,status}/route.ts` | 신규 | 인증 API |
| `src/app/api/{fs,asset,export/docx,export/hwpx}/route.ts` | 수정 | 보호 헬퍼 삽입 (경로 보안 로직 무변경) |
| `src/hooks/use-auth.ts`, `src/app/login/page.tsx` | 신규 | 클라이언트 인증 |
| `.env.local` | 신규 | `AUTH_*` 시크릿 설정(문서화) |

- **무변경 보장**: `src/lib/fs/server.ts` 의 `safeRoot`/`safePath`, `asset` 경로 검증, `export`의 `resolveSavePath`, `next.config.ts` 의 `allowedDevOrigins`, Serwist/webpack 빌드
- FSA(브라우저 폴더 선택) 모드는 브라우저 샌드박스라 `/api` 보호와 무관 → 게스트도 파일 트리 사용 가능 유지. path mode(`/api/fs`)만 보호 모드 활성 시 401

---

## 5-1. 작업 체크리스트

| 순서 | 작업 내용 | 상태 | 점수/비고 |
|------|-----------|------|-----------|
| 1 | 상수 + `auth-config.ts` | ✅ 완료 | 90/100 (verify_task) |
| 2 | `auth.ts` 세션 코어 | ✅ 완료 | 92/100 (verify_task) |
| 3 | `require-auth.ts` 보호 헬퍼 | ✅ 완료 | 91/100 (verify_task) |
| 4 | 인증 API 3개 | ✅ 완료 | 92/100 (verify_task) |
| 5 | 보호 경로 통합(4개) | ✅ 완료 | 93/100 (verify_task) |
| 6 | `use-auth.ts` + 로그인 UI + 가드 | ✅ 완료 | 93/100 (verify_task) |
| 7 | 검증 및 회귀 확인 | ✅ 완료 | dev 서버 실동작 검증 + tsc/lint (MCP 도구 단절로 verify_task 미호출, 결과는 아래 §6 참조) |

---

## 6. 테스트/검증 계획

- [x] **작업 1**: `tsc --noEmit` 통과, lint 신규/수정 파일 무에러 (기존 pre-existing 에러만 존재)
- [x] **작업 2**: 코어 로직 재현 테스트 9건 PASS (정상 파싱 / tamper payload·sig → null / 구조 오류 → null / 만료 → null / 미만료 유효 / 정답·오답 비번), `tsc --noEmit` 통과, lint 신규 파일 무에러
- [x] **작업 3**: `requireAuth`/`requireAuthPage` 구현, `tsc --noEmit` 통과, eslint 신규 4파일 무에러 (E2E 401/200은 작업 5·7에서 확인)
- [x] **작업 4**: 로그인/로그아웃/상태 3개 API 구현, `tsc --noEmit` + eslint 신규 3파일 무에러, 타이밍 공격 완화 지연(성공 150ms/실패 250ms)
- [x] **작업 5**: `requireAuth` 4개 경로 삽입(switch/쿼리/body 파싱 전), `tsc --noEmit` + eslint 무오류
- [x] **작업 6**: `use-auth.ts` + 로그인 UI + `AuthGate` 가드, `tsc --noEmit` + eslint 무오류 (set-state-in-effect는 기존 관례대로 disable 처리)
- [x] 1. `npm run lint` + `npx tsc --noEmit` 통과 (최종 회귀) — `next build --webpack`은 Google Fonts fetch 실패(자체 서명 인증서, 인증 코드와 무관)로 중단됨
- [x] 2. 보호 켜짐(`AUTH_ENABLED=true`): 미인증 `/api/fs` → 401 확인 (dev 서버 실동작)
- [x] 3. 보호 켜짐 + 로그인 성공: 세션 쿠키 보유 후 `/api/fs` → 200
- [x] 4. 보호 껐을(`AUTH_ENABLED=false`): 미인증 `/api/fs` → 200, 로그인 시도 → 403 (회귀 없음)
- [x] 5. 잘못된 비밀번호 → 401, 올바른 → 200 + 쿠키
- [x] 6. `logout` 후 쿠키 삭제 확인 (로그아웃 후 `/api/fs` → 401)
- [ ] 7. (있으면) Playwright: 로그인 페이지 → 성공 → 에디터 접근 흐름

---

## 7. 리스크 및 제약

- **클라이언트 번들 시크릿 유출**: `process.env[AUTH_*]` 접근은 `auth-config.ts` 서버 전용 모듈로 제한, `server-only` 로 방어
- **보호 헬퍼 미삽입 시 공개**: 4개 경로 모두에 반드시 `requireAuth` 삽입 (누락 시 보호 무효)
- **페이지 가드와 client layout 충돌**: `(markdown)/layout.tsx`가 `"use client"`라 페이지 접근 제어는 서버 컴포넌트/redirect 방식으로 분리
- **dev http 쿠키**: `secure`는 production에서만 활성 → 10.10.102.223 dev 허용

---

## 8. 구현 순서

| 순서 | 작업 내용 | 의존 |
|------|-----------|------|
| 1 | 상수 + `auth-config.ts` | — |
| 2 | `auth.ts` 세션 코어 | 1 |
| 3 | `require-auth.ts` 보호 헬퍼 | 2 |
| 4 | 인증 API 3개 | 3 |
| 5 | 보호 경로 통합(4개) | 3 |
| 6 | `use-auth.ts` + 로그인 UI + 가드 | 4, 5 |
| 7 | 검증 및 회귀 확인 | 6 |