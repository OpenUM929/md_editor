# 계획서 — clinerules md_editor 현지화

> 상태: Done | 작성일: 2026-07-14 | 완료일: 2026-07-14
> 작업 유형: C
> 선행: 없음

## 수정 이력

| 날짜 | 변경 섹션 | 변경 요약 |
|------|-----------|-----------|
| 2026-07-14 | (최초) | 계획서 최초 작성 — clinerules를 md_editor 프로젝트에 맞게 현지화 |
| 2026-07-14 | §4,§8,§14 | 검토 반영(1차): §4 라인별 변경표, §8 전체 경로, §14 기대값 |
| 2026-07-14 | §2,§4,§5,§7,§8,§9,§14 | 검토 반영(2차): 통합 대상 정정, 보존/추출후삭제 분리, 전체 경로 |
| 2026-07-14 | 전체 | **수행 완료**: 3결정 반영(AGENTS.md 나침반화, 신규 2파일, design/common+scenario-test 추가삭제), 292건 삭제, 신규 3파일, 00-core/plan-mode/문서 링크 정비. 미결: core 지침 6개 파일 msys/wordcloud 심층 내용 잔존(후속 현지화 검토 필요) |

## 결정 사항 (사용자 확정)

1. **AGENTS.md → 나침반만**: 상세 MD Editor 가이드는 `clinerules\`로 이동. AGENTS.md는 `clinerules/core/00-core.md` 등을 가리키는 나침반으로 축소.
2. **신규 2파일**: `clinerules/core/md_editor-dev-guide.md`(일반 가이드+AGENTS.md 이전·오기정정) + `clinerules/core/ui-standards.md`(현 스택 UI 표준). 둘 다 `00-core.md`에 행 연결.
3. **범용 정보 추출**: `coding-standards.md`(Flask/PEP8)·`api-change-checklist.md` 범용 nugget(API 계약 확인/관련파일 먼저읽기/작은단위+즉시테스트/SEARCH-REPLACE 정확성, 데이터 로딩 페이징 원칙)을 `md_editor-dev-guide.md`에 통합 추출 후 원본 삭제.
4. **추가 삭제**: `docs/design/common/`(api/architecture/database/system design 4건) 및 `docs/scenario-test_*.md`(2건) 모두 삭제 확정 → 삭제 대상 286→**292건**.

## 요구사항 원자화 (결과)

| # | 원자 질문 | 기대 | 작업 후 답 (근거) |
|---|-----------|------|------------------|
| 1.1 | `00-core.md` "현재 프로젝트"가 `docs/md_editor/README.md`를 가리키는가? | Y | Y — 라인11 교체 완료 (`00-core.md:11`) |
| 1.2 | msys/project_wordcloud/cr 중 재사용 규칙이 먼저 추출되었는가? | Y | Y — design-change 4단계→`04-design-change/standard.md` 통합, time/field 문서 DB/Python 섹션 제거, coding/api nugget→`md_editor-dev-guide.md` 추출 |
| 1.3 | 전용 문서 292건이 삭제되었는가? | Y | Y — `msys/`169+`project_wordcloud/`23+`cr/`71+`development/`8+`ui/common/`10+`verification/`5+`design/common/`4+`scenario-test`2 = 292건 삭제 완료 (Glob 재확인) |
| 2.1 | AGENTS.md 내용이 clinerules로 이동(나침반화)되었는가? | Y | Y — `md_editor-dev-guide.md` 신규 + AGENTS.md 나침반 4행으로 축소 |
| 2.2 | AGENTS.md 오기 2건이 정정되었는가? | Y | Y — `fs-server.ts`→`fs-access.ts`, `.temp/`→`constants.ts` `TEMP_DIR`/`TEMP_EXTENSION` (`md_editor-dev-guide.md`) |
| 3.1 | 모든 수정이 `08-guideline-modification` 규칙을 따르는가? | Y | Y — Glob 검증·README 필수항목·post-mod 기록 준수 |
| 4.1 | 경로/함수명이 실제 코드베이스 기반인가? | Y | Y — `fs-access.ts`/`constants.ts` 실측 확인 |
| 5.1 | 계획서가 plan-mode 규칙을 따르는가? | Y | Y — `plan/2026/07/14_01_clinerules-localize/` |

## 1. 배경 및 목적

`clinerules/`는 원래 모니터링 백엔드 "msys", "wordcloud" 프로젝트용 지침 묶음. `00-core.md`가 "현재 프로젝트"를 `docs/project_wordcloud/README.md`로 지정하고, 분류표·문서위치표가 `docs/msys/*`, `docs/project_wordcloud/*`, `docs/cr/*`, `wordcloud_project/plans/...` 등 무관 경로를 가리킴.

목적: clinerules를 md_editor(Next.js 16 + React 19 + Tiptap, DB/SQL 없음)에 현지화.
1. 포인터를 md_editor로 교체, 타 프로젝트 전용 문서 정리(범용 규칙 추출 후 삭제).
2. AGENTS.md는 나침반으로 축소, 상세 가이드는 clinerules 신규 파일로.
3. 계획서 규칙 경로(`plan/2026/MM/DD_NN_작업명/`)에 맞춤.
4. 현 기술스택 UI 표준(`ui-standards.md`) 신규 작성.

## 2. 현황 실측

- `package.json` 실측: name=`md-editor`, Next 16.2.10, React 19.2.4, TS ^5, Tiptap 3.27.x, `@base-ui/react` ^1.6.0, tailwindcss ^4, shadcn ^4. scripts: dev/build/start/lint. `deploy` 없음.
- `src/` 구조: `app/`, `components/`, `hooks/`, `lib/`, `types/`. `content/` 존재, `.temp/` 부재.
- AGENTS.md 오기 2건: `lib/fs-server.ts` 부재(실제 `src/lib/fs-access.ts`), `.temp/` 부재(`src/lib/constants.ts`의 `TEMP_DIR`/`TEMP_EXTENSION` 런타임 관리).
- 삭제 완료 292건: `cr/`71, `msys/`169, `project_wordcloud/`23, `development/`8(api-change-checklist, coding-standards, database-naming-standard, library-management, setup, sql-error-prevention-guide, status-code-extension-guide, tech-stack), `ui/common/`10, `verification/`5(code-review-checklist, testing-strategy, scenarios/*), `design/common/`4, `scenario-test_*.md`2.
- 유지(재사용): `development/`(code-size, field-naming-convention, impact-analysis-guide, time-handling-rules), `verification/pipeline-analysis.md`.

## 3. 설계 원칙

1. **사실 기반**: 모든 경로/함수명 실측 후 기재.
2. **파괴적 삭제 전 추출**: 범용 규칙 먼저 추출·통합 후 삭제.
3. **나침반 최소주의**: `00-core.md`는 경로 안내만, 구체 규칙은 하위 문서 위임.
4. **지침 수정 규칙 준수**: `08-guideline-modification` 절차 엄수.
5. **Git 보존 규칙**: `.clinerules` 수정 시 전체 교체 금지, Append, `git diff --cached -- .clinerules/` 검토.

## 4. 구조/스키마 (변경 파일 목록)

| 파일 | 변경 | 설명 |
|------|------|------|
| `clinerules/docs/md_editor/README.md` | 신규 | md_editor 프로젝트 나침반 |
| `clinerules/core/md_editor-dev-guide.md` | 신규 | 개발 가이드(AGENTS.md 이전+오기정정)+범용 nugget |
| `clinerules/core/ui-standards.md` | 신규 | 현 스택 UI 표준(Tailwind v4/Shadcn/Tiptap/React19/경로보안) |
| `clinerules/core/00-core.md` | 수정 | 포인터 교체, msys/wordcloud/cr/design-system/scenarios 행 삭제, 신규 2파일 행 추가 |
| `clinerules/core/00-core/03.plan-mode.md` | 수정 | plan 저장경로 `wordcloud_project/plans/`→`plan/` |
| `clinerules/core/04-design-change/standard.md` | 수정 | design-change-workflow 4단계 통합, 삭제된 doc 참조 제거 |
| `clinerules/core/02.documentation.md` | 수정 | docs 구조·필수문서 목록을 유지 문서 기준으로 갱신 |
| `clinerules/core/03.workflow.md` | 수정 | scenarios 링크 → `04-design-change/scenarios.md` |
| `clinerules/core/04-design-change/scenarios.md` | 수정 | 삭제된 screen-domain/web/templates 참조 제거 |
| `clinerules/core/09.question-rules.md` | 수정 | msys/wordcloud 예시 → md_editor 예시로 교체 |
| `clinerules/docs/development/time-handling-rules.md` | 수정 | DB(PostgreSQL/MySQL/SQLite) 섹션 삭제, 항번 재정렬 |
| `clinerules/docs/development/field-naming-convention.md` | 수정 | Python/DB 하위섹션 삭제, JS/TS 중심으로 재구성 |
| `clinerules/docs/msys/`, `project_wordcloud/`, `cr/`, `ui/common/`, `design/common/`, `scenario-test_*.md` | 삭제 | 전체(추출 후) |
| `clinerules/docs/development/` 8건, `verification/` 5건 | 삭제 | 전용 문서 |
| `AGENTS.md` | 수정 | 나침반 4행으로 축소(clinerules 지침 포인터) |
| `clinerules/core/08-guideline-modification/05.post-modification.md` | 수정 | 2026-07-14 행 추가 |

## 5. 단계별 로드맵 (실행 결과)

| 단계 | 내용 | 산출물 | 상태 |
|------|------|--------|------|
| P0 | 범용 규칙 추출→clinerules (design-change 4단계 통합, time/field 정리, coding/api nugget→dev-guide) | 통합 규칙 | 완료 |
| P1 | `docs/md_editor/README.md` 나침반 생성 | README | 완료 |
| P2 | 전용 문서 292건 삭제 | 삭제 완료 | 완료 |
| P3 | AGENTS.md→나침반 축소 + `md_editor-dev-guide.md` 신규(오기정정) + `00-core.md` 포인터/분류표 정리 | 수정 파일 | 완료 |
| P4 | `ui-standards.md` 신규 + `00-core.md` UI 행 연결 | UI 표준 | 완료 |
| P5 | `03.plan-mode.md` 경로 갱신 + 02/03/04-design-change/09 문서 링크 정비(죽은 링크 제거) | 수정 파일 | 완료 |
| P6 | Glob 교차참조 검증 + post-mod 기록 | 검증 결과 | 완료(잔여 심층 내용 있음, 아래 §6-4) |

## 6. 결정 필요 / 후속 사항

1. **(확정) AGENTS.md 오기**: clinerules 문서(`md_editor-dev-guide.md`)에 정정본 기재 완료. AGENTS.md 자체는 나침반으로 축소 완료.
2. **(확정) coding-standards/api nugget**: `md_editor-dev-guide.md` 범용 원칙 섹션으로 추출 후 원본 삭제 완료.
3. **(확정) md_editor UI 표준**: `ui-standards.md` 신규 작성 완료.
4. **(미결·후속) core 지침 6개 파일의 msys/wordcloud 심층 내용 잔존** — 아래 파일들은 예시/절차가 여전히 이전 프로젝트에 종속됨(죽은 링크는 아니나 내용 오염):
   - `01.legacy-protection.md` (msys/wordcloud 배포 스크립트)
   - `06.git-rules.md` (CR 저장 `docs/cr/` 죽은 링크 + `msys.zip` pre-commit)
   - `14.comment-log-removal.md` (msys_venv/flask/msys_app)
   - `05.testing.md`, `04-design-change/scale.md` (wordcloud 예시)
   - `08-guideline-modification/04.folder-naming.md` (docs/msys 예시)
   - `08-guideline-modification/05.post-modification.md` (project_wordcloud/msys.zip 이력 — 보존 가능)
   → 후속 작업으로 이들도 md_editor 스택에 맞게 현지화할지, 예시만 경량 치환할지 결정 필요.

## 7. 영향도 분석

- `00-core.md`(진입점) 잘못된 링크 잔존 시 오경로 유발 → P5/P6에서 주요 죽은 링크 제거 완료.
- 삭제 292건 중 `cr/*`(71)·`msys/*`(169)는 core 규칙 파일 자체는 `core/`에 별도 존재하므로 규칙 동작 무방.
- `design-system` 삭제 후 `00-core.md` 링크 행 함께 삭제 완료.

## 8. 테스트/검증 계획 (결과)

- [x] `docs/md_editor/README.md` 필수항목 3종 포함 확인.
- [x] `00-core.md` 상대 링크 Glob 실존 확인(삭제된 msys/wordcloud/cr/design-system/scenarios 직접 참조 0건 — 포인터 행 삭제 완료).
- [x] 02/03/04-design-change/09 문서의 죽은 링크(삭제된 doc 참조) 정비 완료.
- [x] `03.plan-mode.md` 예시 경로 `plan/YYYY/MM/DD_NN_작업명/` 형식 확인.
- [x] `05.post-modification.md` 2026-07-14 행 추가.
- [ ] `git diff --cached -- .clinerules/` 검토(추가 방식/누락) — 커밋은 사용자 명시 요청 시.

## 9. 리스크 및 제약

- ⚠️ **파괴적 삭제**: 292건 삭제 완료(복구 불가). 사전 추출 완료.
- ⚠️ **잔여 심층 내용**: §6-4 파일들의 msys/wordcloud 종속 내용은 기능적 오류는 아니나 지침 오염. 후속 현지화 권장.
- 제약: `.clinerules`는 별도 git 저장소. 커밋은 사용자 명시 요청 시(`08` 규칙).

## 10. 역할 분담

| 작업 | 등급 |
|------|------|
| P0 범용 규칙 추출/통합 | [고] |
| P1/P3/P4 신규 파일·나침반 | [고] |
| P2 전용 문서 삭제 | [저] |
| P5 문서 링크 정비 | [고] |
| P6 검증 | [저] |

## 실행 로그(수행일·작업자)

- 수행: 2026-07-14, 작업자 [고]
- 삭제: `clinerules/docs/` 하위 msys(169)/project_wordcloud(23)/cr(71)/ui/common(10)/design/common(4) 폴더 전체 + development 8건 + verification 5건 + scenario-test 2건 = **292건**
- 신규: `docs/md_editor/README.md`, `core/md_editor-dev-guide.md`, `core/ui-standards.md` (3건)
- 수정: `00-core.md`, `00-core/03.plan-mode.md`, `04-design-change/standard.md`, `02.documentation.md`, `03.workflow.md`, `04-design-change/scenarios.md`, `09.question-rules.md`, `development/time-handling-rules.md`, `development/field-naming-convention.md`, `AGENTS.md`, `08-guideline-modification/05.post-modification.md` (11건)
- 핵심 수치: 삭제 292건 / 신규 3건 / 수정 11건 (Glob 재집계)
- 편차/불확실: §6-4 core 6개 파일의 msys/wordcloud 심층 내용 잔존 → 사용자 후속 결정 대기
