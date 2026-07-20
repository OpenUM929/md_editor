# 회의록/제안서/기술문서 템플릿 — 페이지별 주제 구성 정비 (공통 레이아웃)

## 목표
`templates/meeting`(3), `templates/proposal`(2), `templates/technical`(3) 하위
**8개 템플릿**에 **공통 레이아웃 규칙**을 적용해, 페이지 수와 상관없이
**각 페이지가 동일한 구조(주제별 1페이지 + 가이드 문구)**를 갖도록 정비한다.
(한 장에 다 때우는 게 아님. 여러 페이지 OK. 핵심은 페이지 간 일관성.)

## 공통 레이아웃 규칙 (8종 전체 적용)
1. **헤더 블록**: `# 제목` 바로 아래 메타라인
   - 형식: `**일시/기간:** ...　|　**작성자:** 　|　**부서/팀:** ` (report 템플릿 톤 준용)
   - 메타라인 뒤 `---`(hr) 로 구분.
2. **주제별 1페이지**: 각 `## N. 주제` 가 기본적으로 독립 페이지.
   - 항목 앞 `---pb---` 로 분할(의미상 첫 페이지는 제목+메타+1항목 묶음).
   - **의미 쌍은 같은 페이지 유지**: 예) 결정 사항 ↔ Action Items, 요약 ↔ 핵심 지표.
     → 이런 쌍은 `---pb---` 로 강제 분리하지 않음.
   - 마지막 항목도 반드시 직전 `---pb---` 뒤에 위치(다른 항목과 뭉침 금지).
3. **가이드 문구**: 빈 칸/표에 작성 힌트 삽입(report 스타일 톤).
   - 빈 글머리: `- ` 뒤에 짧은 예시/설명.
   - 표 셀: 첫 행 예시값 또는 `(예: 상/중/하)` 힌트.
   - 블록 설명이 필요하면 `> ` 인용으로 안내 (예: `> 한 달간의 업무를 3줄 이내로 요약합니다.`).
4. **A4 1페이지 분량 유지**: 표 행 3~5행, 글머리 2~4개 수준 유지.
   가이드 문구 추가로 넘침 없도록 행 수는 현재 수준 유지.
5. **프론트매터 보존**: `title/topic/description/order/createdAt` 그대로.
   `pageMode` 미지정 → `bunri` 렌더링(의도 일치), 추가 불필요.
6. **`---pb---` 포맷 유지**: `markdown.ts` 토큰 규칙(`^---pb---\s*(?:\n|$)`) 준수.
   기존 `---`(hr) ↔ `---pb---`(페이지분할) 혼용 패턴 그대로.

## 대상 파일 (콘텐츠만 수정, 코드 변경 없음)
- templates/meeting/team-meeting.md
- templates/meeting/stakeholder-meeting.md
- templates/meeting/one-on-one.md
- templates/proposal/project-proposal.md
- templates/proposal/feature-request.md
- templates/technical/api-document.md
- templates/technical/architecture.md
- templates/technical/release-note.md

## 예상 변경 형태 (팀 회의록 예시)
```
# 팀 회의록
**일시:** YYYY-MM-DD (요일) HH:MM~HH:MM　|　**장소:** 　|　**참석자:** 　|　**작성자:**
---
## 1. 의제
- (예: 전주 미완료 과제 점검)
- (예: 이번 주 우선순위 합의)
---
---pb---
## 2. 논의 내용
### 2.1 (주제)
- (예: 논의 요약)
**결정 사항:**
- (예: OO로 결정, 담당자 박OO)
...
---pb---
## 3. Action Items
| 담당자 | 작업 내용 | 마감일 | 상태 |
|--------|----------|--------|------|
| (예: 김OO) | (예: API 연동) | YYYY-MM-DD | 진행중 |
...
```
(의미 쌍: 결정사항은 2항목 안에, Action Items는 3항목 독립 페이지)

## 검증
1. `node scripts/build-templates.mjs` → `public/templates.json` 재생성,
   8종 모두 포함·body에 `---pb---`/가이드 문구 유지 확인.
2. `npm run lint` (tsx/ts 변경 없으나 사전 확인).
3. `npm run dev` → localhost:3000 에서 각 템플릿 미리보기:
   - 모든 페이지가 동일 레이아웃(메타라인→hr→##주제→가이드)을 따르는지.
   - 페이지 수가 항목 수(의미 쌍 묶음 기준)와 일치하는지.
   - 가이드 문구 표시, A4 1페이지 초과(스크롤/넘침) 없는지 육안 확인.
4. Playwright: bunri 렌더 시 `a4-page` 개수 == 의도한 페이지 수인지 샘플 검증.

## 산출물
- 8개 .md 템플릿 수정(콘텐츠만).
- 재생성된 `public/templates.json`(빌드 산출물).
- 코드(.ts/.tsx) 변경 없음.
