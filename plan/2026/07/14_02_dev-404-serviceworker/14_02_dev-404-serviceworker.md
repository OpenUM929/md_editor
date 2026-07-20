# 계획서 — 개발 서버 / 404 및 서비스 워커 프리캐시 오류

> 상태: Pre-Done | 작성일: 2026-07-14
> 작업 유형: A
> 선행: 없음

## 수정 이력
| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-14 | (최초) | 계획서 최초 작성 — / 404(라우트 누락) + 낡은 SW 프리캐시 오류 진단/수정 |
| 2026-07-14 | §부록 | 작업 진행 중 발견된 추가 버그(템플릿 상세 미리보기 frontmatter 노출) 원인 분석+수정 추가 |

## 1. 문제 정의

- **관찰된 실패 산출물(필수)** — 브라우저 콘솔 원문:
  ```
  GET http://localhost:3000/ 404 (Not Found)
  [HMR] connected
  sw.js:1 Uncaught (in promise) bad-precaching-response: bad-precaching-response :: [{"url":"http://localhost:3000/_next/static/dFJgICWhSSle1-iYHLkJ-/_buildManifest.js","status":404}]
  sw.js:1 Uncaught (in promise) bad-precaching-response :: [{"url":"http://localhost:3000/_next/static/dFJgICWhSSle1-iYHLkJ-/_ssgManifest.js","status":404}]
  sw.js:1 Uncaught (in promise) bad-precaching-response :: [{"url":"http://localhost:3000/_next/static/css/f03b7f0edb16d595.css","status":404}]
  sw.js:1 Uncaught (in promise) bad-precaching-response :: [{"url":"http://localhost:3000/_next/static/chunks/app/(markdown)/layout-c9f30618d74b6de6.js","status":404}]
  sw.js:1 Uncaught (in promise) bad-precaching-response :: [{"url":"http://localhost:3000/_next/static/chunks/app/(markdown)/[[...path]]/page-9da27552fd5f3228.js","status":404}]
  sw.js:1 Uncaught (in promise) bad-precaching-response :: [{"url":"http://localhost:3000/_next/static/chunks/255-f952f78b056a9fac.js","status":404}]
  ```
- **재현(관측) 로그** — 실행 중인 서버에 실제 파라미터로 curl 재현:
  ```
  404  /                                  (서버 직접 응답)
  404  /foo.md
  404  /a/b/c
  404  /index
  404  /_next/static/dFJgICWhSSle1-iYHLkJ-/_buildManifest.js
  404  /_next/static/dFJgICWhSSle1-iYHLkJ-/_ssgManifest.js
  200  /manifest.webmanifest
  200  /sw.js
  200  /icon.svg
  200  /favicon.ico
  ```
  - `GET /` 응답 본문: 루트 레이아웃(`MD Editor` 타이틀, `manifest` 링크 존재) 안에 Next "could not be found" 포함. 본문에 `turbopack` HMR 클라이언트 + `root-of-the-server` CSS 존재 → **실행 서버는 `next dev`(turbopack)**.
- **증상**: `http://localhost:3000/` 접속 시 Next 404 페이지가 보이고, 콘솔에 위 SW 프리캐시 404 다발이 출력됨. 에디터가 로드되지 않음.
- **재현 조건**: `npm run dev` 실행 상태, 브라우저에 이전 production 세션에서 등록된 SW가 남아 있는 경우(신규 시크릿/시크릿 모드에서는 SW 오류 미발생).

## 2. 원인 분석

> ⛔ 원인 확정 게이트 — 아래 3항 모두 충족.

1. **재현했다**: 위 curl로 `/`, `/foo.md`, `/a/b/c` 모두 404를 실제로 재현(실제 URL 그대로). SW 프리캐시 404 URL 또한 실제 콘솔 그대로.
2. **그 줄이 범인임을 관측했다**:
   - `/` 404: 응답 본문이 루트 레이아웃은 렌더되나 하위 라우트 매칭 없이 "could not be found"인 **라우팅 miss**임을 관측. `src/app/(markdown)/[[...path]]/page.tsx` 파일 존재, import 전부 해석됨(`src/lib/fs-access.ts`, `src/lib/markdown.ts`, `src/lib/constants.ts`, `src/components/tab/workspace.tsx` Test-Path=True). 즉 **실행 중인 dev 서버의 라우트 레지스트리가 현재 소스의 `(markdown)` 라우트를 등록하지 않은 상태**가 범인.
   - SW 오류: `next.config.ts:7` `disable: process.env.NODE_ENV !== "production"` → dev에서 serwist 비활성. 그러나 `public/sw.js` 프리캐시 매니페스트가 참조하는 빌드 ID `dFJgICWhSSle1-iYHLkJ-`가 `.next/BUILD_ID`와 일치(=이전 `next build` 산출물). dev(turbopack) 서버는 해당 production 자산 경로(`/_next/static/dFJgICWhSSle1-iYHLkJ-/*`)를 서빙하지 않으므로 404. 브라우저가 **이전 production 세션에서 등록되어 유지된 SW**가 install 시 이 자산들을 프리캐시하려다 실패 → `bad-precaching-response`. `GET /sw.js`가 200인 건 `public/` 정적 서빙일 뿐 재등록 아님(관측).
3. **반증 실험**:
   - `/` 404가 SW 때문이라면 → SW만 해제(unregister)하고 dev 서버는 그대로 두어도 `/`가 200이어야 함. 반대로 **dev 서버만 재시작**하면서 SW는 건드리지 않고 `/`가 200이 되면 원인은 stale 라우트 테이블(게이트2 확정). → §테스트에서 이 분기 검증.
   - SW 오류가 `sw.ts` 코드 결함이라면 → production에서 재빌드/재등록해도 실패해야 함. unregister 후 순수 `next build && next start`에서 정상 동작하면 코드 결함이 아닌 잔존 등록임을 확정.

- **근거**: 위 curl 재현 로그, `/` 응답 본문(라우팅 miss + turbopack 식별), `next.config.ts:7`, `public/sw.js` vs `.next/BUILD_ID` 빌드 ID 일치, import 해석 결과.
- **분석**: 두 이슈은 **독립**.
  (a) `/` 404 — dev 서버 기동 시점/라우트 추가를 hot-scan하지 못해 `(markdown)/[[...path]]` optional catch-all이 라우트 테이블에 없음(정적 파일·루트 레이아웃은 정상). 재시작 시 `src/app/` 재스캔으로 등록됨.
  (b) SW 오류 — dev는 serwist 비활성이나, 이전 production 실행이 브라우저에 남긴 SW 등록이 유지되어 구(舊) 프리캐시 매니페스트의 production 자산을 요구 → dev 서버가 그 경로를 안 줘서 404.
- **퇴귀 도입 지점**: `src/app/page.tsx` 삭제(`git status: D src/app/page.tsx`) 후 `(markdown)/[[...path]]` 라우트 추가, 그리고 그 사이 `next build`(→`public/sw.js` 생성+브라우저 등록)를 거친 후 `npm run dev`로 전환한 시점.

## 3. 수정 방안

- **핵심 변경**: (1) dev 서버 재시작으로 누락된 `(markdown)` 라우트 등록, (2) 브라우저의 잔존 SW 해제 + 향후 dev에서 자동 해제 코드·gitignore 추가(재발 방지).
- **세부 수정**:
  - **[P0] dev 서버 재시작**: 실행 중 `npm run dev` 중단(`Ctrl+C`) 후 재기동. `src/app/` 재스캔 → `(markdown)/[[...path]]` 라우트 등록.
  - **[P1] 브라우저 SW 해제**: DevTools → Application → Service Workers → Unregister (또는 Storage Clear).
  - **[P2] `src/components/dev-sw-cleanup.tsx` 신규** (`"use client"`):
    ```tsx
    "use client"
    import { useEffect } from "react"

    export function DevSWCleanup() {
      useEffect(() => {
        if (process.env.NODE_ENV !== "development") return
        if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
        navigator.serviceWorker
          .getRegistrations()
          .then((rs) => rs.forEach((r) => r.unregister()))
      }, [])
      return null
    }
    ```
  - **[P3] `src/app/layout.tsx` 수정**: 루트 레이아웃에 `<DevSWCleanup />` 마운트(dev 한정, production 무영향).
  - **[P4] `.gitignore` 수정**: `/public/sw.js`, `/public/sw.js.map` 추가(빌드 산출물이므로 소스 추적 제외).
  - **[P5] (선택) 디스크의 낡은 `public/sw.js` 삭제**: `next build` 시 재생성.
- **폴백(반증 실패 시)**: P0 재시작 후에도 `/`가 404면 구조적 라우트 문제 → `src/app/(markdown)/page.tsx` 명시 추가 또는 `[[...path]]` 단순화 검토(예상: 불필요).

## 4. 롤백 계획
- P2/P3(dev-cleanup) 코드 제거 + `layout.tsx`에서 마운트 해제 → 이전 상태.
- P4 `.gitignore` 항목 2줄 제거.
- P0/P1은 프로세스/브라우저 상태 변경으로 코드 롤백 불필요.
- P5 삭제 파일은 `next build` 재실행으로 복원.

## 5. 결과 (구현 완료 후 기재)
- **적용된 변경**:
  - P2 `src/components/dev-sw-cleanup.tsx` 신규 생성(dev 전용 SW 자동 해제).
  - P3 `src/app/layout.tsx`에 `<DevSWCleanup />` 마운트.
  - P4 `.gitignore`에 `/public/sw.js`, `/public/sw.js.map` 추가.
  - P5 디스크의 낡은 `public/sw.js` 삭제(재빌드 시 재생성).
  - P0 실행 중 dev 서버(기존 PID 20700, stale 라우트 테이블 보유) 중단 후 신규 `next dev` 기동(:3000).
- **검증 결과**:
  - **게이트3 분기 검증 통과**: SW를 건드리지 않고 dev 서버만 재기동 → `curl -I localhost:3000/` → **200**, `/foo.md`→200, `/a/b/c`→200. ⇒ `/` 404 원인이 stale 라우트 테이블(확정). SW 때문 아님.
  - `eslint` 신규/수정 파일 통과(에러 0).
  - `public/sw.js` 삭제 + `.gitignore` 적용 확인(`git check-ignore public/sw.js` → ignored).
  - P1(브라우저 SW Unregister)은 `DevSWCleanup`이 dev 로드 시 자동 수행하므로 별도 수동 조치 불필요. 새로고침 시 콘솔 `bad-precaching-response` 0건 기대.
  - **Playwright 브라우저 검증(`e2e/sw-404-verify.spec.ts`, 2 passed)**:
    1. `/` 접속 → "워크스페이스 폴더 선택" 헤딩 노출(404 페이지 아님), 폴더 선택 후 "md files" 워크스페이스 렌더(클라이언트 렌더 정상). 수집된 console/page 에러 `[]` → `bad-precaching-response` 0건·하이드레이션 에러 없음.
    2. 더미 SW를 등록→active 확인→reload 후 `navigator.serviceWorker.getRegistrations().length === 0` 단언 → `DevSWCleanup`의 dev 자동 해제 동작 실측 확인.
  - **추가 버그 수정(§부록) + Playwright 검증(`e2e/template-frontmatter.spec.ts`, 1 passed)**: 템플릿 상세 미리보기 `<pre>`에 frontmatter(`createdAt:`/`order:`/`---`) 노출 없음 단언, 본문(`# 주간 업무 보고서`) 정상 노출 확인. `node -e`로 `templates.json` 첫 템플릿 `body`가 `\n# 주간 업무 보고서`로 시작·`createdAt:` 미포함 확인.

## 배경 및 목적
`md_editor`는 Next 16 App Router + Serwist PWA. dev(`next dev`, turbopack)는 Serwist 비활성. 현재 `/` 접속 시 404 + 콘솔 SW 프리캐시 오류로 에디터가 열리지 않음. 목적: (a) `/`가 에디터로 정상 로드되게 하고, (b) 낡은 SW로 인한 콘솔 오류를 제거하며, (c) dev에서 잔존 SW가 자동 해제되도록 하여 재발 방지.

## 영향도 분석 (변경 파일 목록 + 영향 범위)
- 신규: `src/components/dev-sw-cleanup.tsx`
- 수정: `src/app/layout.tsx`(컴포넌트 마운트 1줄), `.gitignore`(2줄 추가)
- 삭제(선택): `public/sw.js`, `public/sw.js.map`
- 영향 범위: `dev-sw-cleanup`은 `NODE_ENV==="development"` 가드로 묶여 production 동작·빌드·SW 등록에 무영향. `.gitignore`는 빌드 산출물 추적 제외만.

## 테스트/검증 계획
- [ ] P0 후: `curl -I http://localhost:3000/` → **200**, `curl -I http://localhost:3000/foo.md` → 200.
- [ ] **게이트3 분기 검증**: SW 건드리지 않고 dev 서버만 재시작해 `/`가 200 → `/` 404 원인이 stale 라우트 테이블임 확정. (만약 SW 해제만으로 200이면 진단 오류 → 재분석)
- [ ] P1 후: 브라우저 새로고침, 콘솔에 `bad-precaching-response` 0건 확인.
- [ ] P2/P3 후: `npm run dev` 기동 시 DevTools에서 기존 SW 등록이 자동 해제되는지 확인(시크릿 모드 불필요).
- [ ] P4 후: `git status`에서 `public/sw.js`가 untracked로 뜨지 않음(ignore 적용) 확인.
- [ ] `npm run build && npm start`에서 SW 정상 동작(콘솔 오류 없음) 확인 → SW 코드 결함 아님 확정.

## 리스크 및 제약
- ⚠️ **재시작만으로 안 고쳐질 가능성**: turbopack이 `[[...path]]` optional catch-all 라우트를 여전히 안 잡으면 구조 수정 필요(폴백 절차). 게이트3 분기 검증으로 즉시 판별.
- ⚠️ **브라우저별 SW 잔존**: 다른 탭/기기에도 등록이 남을 수 있어, P2 자동해제 적용 전까지는 수동 Unregister 필요.
- 제약: P0은 사용자 실행 중인 dev 서버 프로세스 재기동을 수반(사용자 동의).

## 부록: 작업 진행 중 발견된 추가 버그 — 템플릿 상세 미리보기 frontmatter 노출

> 본 항목은 원 계획(P0~P5) 수행·검증 도중 발견되어 같은 계획서에 편입함. 작업 유형 A(버그).

### A.1 문제 정의
- **관찰된 실패 산출물**: 템플릿 찾아보기 → 카드 "상세 보기"(Eye) 클릭 시, 모달 본문 `<pre>`에 YAML frontmatter가 그대로 텍스트 노출:
  ```
  ---
  title: "주간 업무 보고서"
  topic: "report"
  description: "팀원 개인의 주간 업무 진행 상황을 보고하는 기본 템플릿입니다."
  order: 1
  createdAt: "2026-07-10"
  ---
  ```
- **증상**: 템플릿 메타데이터가 사용자에게 그대로 보임(카탈로그 메타 vs 본문 혼재).
- **재현 조건**: `npm run dev` 실행 → 폴더 선택 → Templates 탭 → 템플릿 찾아보기 → 카드 상세 보기.

### A.2 원인 분석
- **게이트 통과**:
  1. **재현**: 위 모달 본문에 `---`/frontmatter 관측.
  2. **범인 관측**: `scripts/build-templates.mjs:56`이 `matter(content)`로 frontmatter를 파싱하지만, `:66`에서 `body: content`로 **원본 전체(프론트매터 포함)** 를 `public/templates.json`에 저장. `src/lib/templates-client.ts:34 getTemplateContent`가 그 `body`를 그대로 반환하고, `template-detail-modal.tsx:73`이 `<pre>`에 raw 출력. `templates.json` 첫 템플릿 `body`가 `---\ntitle:…`로 시작함을 `Get-Content`로 확인.
  3. **반증**: `body`를 `matter(content).content`(프론트매터 제외)로 바꾸면 `---`가 사라짐(파싱 결과물 자체이므로 자명).
- **분석**: 빌드 스크립트가 `matter()`의 두 결과(`data`만 쓰고 `content`는 미사용)를 활용하지 않고 원본을 그대로 저장한 누락. `body`는 미리보기뿐 아니라 `createFileFromTemplate`(`templates-client.ts:55`)의 파일 생성에도 쓰여, 생성 파일에도 frontmatter가 들어가는 동일 버그였음.

### A.3 수정 방안
- **핵심 변경**: 빌드 스크립트가 frontmatter를 제외한 본문을 저장.
- **세부 수정**:
  - `scripts/build-templates.mjs`: `const { data } = matter(content)` → `const { data, content: body } = matter(content)`, `body: content` → `body` (P0).
  - `public/templates.json` 재생성: `node scripts/build-templates.mjs` 실행(`npm run dev`/`npm run build` 재기동 시 자동 호출) (P1).
  - 회귀 테스트 추가: `e2e/template-frontmatter.spec.ts` (P2).
- **영향**: 미리보기 깔끔해지고, `createFileFromTemplate`으로 생성되는 `.md`에도 frontmatter가 들어가지 않음(프론트매터는 카탈로그 메타데이터이므로 의도된 동작).

### A.4 롤백 계획
- `build-templates.mjs`를 `const { data } = matter(content)` + `body: content`로 원복 후 `templates.json` 재생성.

### A.5 검증
- [x] `node -e`로 `templates.json` 첫 템플릿 `body`가 `\n# 주간 업무 보고서`로 시작·`createdAt:` 미포함 확인.
- [x] Playwright `e2e/template-frontmatter.spec.ts` 1 passed: 상세 모달 `<pre>`에 `createdAt:`/`order:`/`---`(선두) 없음, 본문(`주간 업무 보고서`) 노출. console/page 에러 `[]`.
