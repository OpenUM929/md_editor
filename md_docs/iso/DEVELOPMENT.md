<style>
@page { size: A4 portrait; margin: 18mm 16mm 20mm; }
@media print {
  .pagebreak { page-break-after: always; }
  .chapter { page-break-before: always; }
  img, table, pre { page-break-inside: avoid; }
  h2, h3, h4 { page-break-after: avoid; }
}
body {
  max-width: 178mm; margin: 0 auto;
  font-family: "Pretendard","맑은 고딕","Malgun Gothic",-apple-system,sans-serif;
  font-size: 9.6pt; line-height: 1.65; color: #151515;
}
/* 제목블록 (엔지니어링 도면 규격) */
table.titleblock { width:100%; border-collapse:collapse; margin:0 0 20px; font-size:8.3pt; table-layout:fixed; }
table.titleblock td { border:1pt solid #151515; padding:5px 8px; vertical-align:top; }
table.titleblock .label { display:block; font-size:6.8pt; color:#666; letter-spacing:.06em; text-transform:uppercase; margin-bottom:2px; }
table.titleblock .val { font-weight:700; color:#151515; }
table.titleblock .doctitle { font-size:13pt; font-weight:800; padding:10px 10px; }
/* H1은 제목블록이 대신하므로 숨김 */
h1 { display:none; }
/* 조항 번호 체계 */
h2 { font-size:11.5pt; font-weight:800; margin:22px 0 8px; padding-bottom:4px; border-bottom:1pt solid #151515; color:#151515; font-variant-numeric:tabular-nums; }
h3 { font-size:10.2pt; font-weight:700; margin:12px 0 6px; color:#151515; font-variant-numeric:tabular-nums; }
h4 { font-size:9.5pt; font-weight:700; margin:10px 0 5px; color:#3a3a3a; }
h5 { font-size:9.2pt; font-weight:700; margin:8px 0 4px; color:#555; }
p { margin:5px 0; color:#2a2a2a; }
/* 데이터 표 (마크다운 표에도 적용) */
table:not(.titleblock) { width:100%; border-collapse:collapse; font-size:8.8pt; table-layout:fixed; word-break:break-word; margin:8px 0 14px; }
table:not(.titleblock) th { border:0.75pt solid #151515; background:#ececec; padding:5px 8px; text-align:left; font-weight:700; font-size:8pt; }
table:not(.titleblock) td { border:0.5pt solid #999; padding:5px 8px; color:#2a2a2a; }
/* 목록 */
ol, ul { margin:6px 0 12px; padding-left:20px; }
li { margin:3px 0; color:#2a2a2a; }
blockquote { margin:10px 0; padding:7px 10px; border:0.75pt solid #999; background:#f7f7f7; font-size:8.7pt; color:#444; }
pre { font-size:8pt; background:#f2f2f2; padding:8px 10px; border:0.5pt solid #ccc; margin:6px 0 12px; white-space:pre-wrap; word-break:break-all; }
code { font-size:8.3pt; background:#ececec; padding:1px 4px; font-family:"SFMono-Regular",Consolas,monospace; word-break:break-all; }
pre code { background:none; padding:0; }
img { max-width:100%; height:auto; border:0.5pt solid #ccc; }
/* 통합본 장 구분 */
.chapter { font-size:15pt; font-weight:800; color:#151515; margin:0 0 14px; padding:10px 0 8px; border-top:2.5pt solid #151515; border-bottom:0.75pt solid #151515; letter-spacing:.01em; }
.chapter .docno { float:right; font-size:8.5pt; font-weight:700; color:#767676; font-variant-numeric:tabular-nums; }
.doc-footer { margin-top:30px; padding-top:6px; border-top:1pt solid #151515; display:flex; justify-content:space-between; font-size:7.5pt; color:#444; }
.doc-footer b { color:#151515; }
</style>

<table class="titleblock">
<tr>
  <td class="doctitle" colspan="2">세부 문서 작성 개발 가이드</td>
  <td><span class="label">문서번호</span><span class="val">MSYS-DEV-00</span></td>
</tr>
<tr>
  <td><span class="label">분류</span><span class="val">개발 가이드</span></td>
  <td><span class="label">개정번호</span><span class="val">Rev. 1.0</span></td>
  <td><span class="label">시행일</span><span class="val">2026-07-22</span></td>
</tr>
<tr>
  <td colspan="2"><span class="label">적용 범위</span><span class="val">메뉴얼 세부 문서 작성 규칙 및 템플릿</span></td>
  <td><span class="label">승인</span><span class="val">운영팀장</span></td>
</tr>
</table>

# 세부 문서 작성 개발 가이드

> 본 문서는 MSYS 운영자 메뉴얼의 각 세부 문서를 작성할 때 따르는 규칙과 템플릿을 정의합니다.

---

## 1. 파일 작성 규칙

### 1.1 네이밍 규칙

- 파일명: `NN-영문-메뉴-명.md` (예: `01-dashboard.md`)
- 이미지 폴더: 각 문서와 동일한 위치에 `images/` 폰더 생성
- 이미지 파일명: `{메뉴ID}-{기능명}-{영역명}.png` (예: `dashboard-status-panel.png`)

### 1.2 문서 구조

모든 메뉴 문서는 다음 구조를 따릅니다:

```markdown
# [메뉴 한글명]

## 1. 메뉴 접속 방법
- **경로**: 상단 메뉴 → [메뉴 경로]
- **URL**: `/[path]`
- **필요 권한**: [권한명]
- **상세 권한**: [권한 상세]

## 2. 화면 구성

<img src="images/[파일명].png" width="800">

| 번호 | 영역 | 설명 |
|------|------|------|
| ① | [영역명] | [기능 설명] |

## 3. 주요 기능 및 조작 방법

### 3.1 [기능명]
**목적:** [이 기능은 무엇을 하는가]

**조작 절차:**
1. [첫 번째 단계]
2. [두 번째 단계]
3. [세 번째 단계]

**확인 방법:** [정상 처리 여부를 어떻게 확인하는가]

**주의사항:** [실수하면 안 되는 점]

## 4. 모니터링 체크리스트
- [ ] [확인 항목 1]
- [ ] [확인 항목 2]

## 5. 자주 발생하는 문제
| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| [증상] | [원인] | [해결] |
```

---

## 1.3 🔴 A4 용지 규격

> **공통지침 [30.document-output-standard.md](../../../common/core/30.document-output-standard.md) 1장을 따른다.**
> `<style>` 블록 전문, 각 선언의 목적, 본문 폭 산출식이 해당 문서에 있다.

- 모든 메뉴얼 문서의 **첫 줄**에 A4 세로 `<style>` 블록을 삽입한다
- 이미지의 `width="800"` 속성은 수정하지 않는다 (CSS `max-width:100%`가 자동 축소)

---

## 2. 이미지 캡처 규칙

> **캡처 원칙·가독성 검산·사전조건은 공통지침 [30.document-output-standard.md](../../../common/core/30.document-output-standard.md) 2장을 따른다.**
> 본 절에는 msys 고유 사항만 기재한다.

### 2.0 msys 캡처 실행

| 항목 | 값 |
|------|-----|
| 스크립트 | `scripts/manual-capture/capture_manual_screenshots.py` (Selenium) |
| 접속 주소 | `http://localhost:18080` |
| 계정 | `admin` / `admin` |
| 저장 경로 | `.clinerules/projects/msys/operator-manual/04-common-menus/images/` |

> ⚠️ 저장 경로는 **문서가 참조하는 `images/` 경로와 반드시 일치**해야 한다.
> 과거 스크립트가 존재하지 않는 `.clinerules/docs/msys/...`를 가리켜 실행해도 메뉴얼에 반영되지 않는 문제가 있었다.

### 2.1 캡처 원칙

- 🔴 **전체 화면 캡처 금지**: 설명 대상 영역만 요소 단위로 캡처한다
  → A4 지면에서 과도하게 축소되어 글자를 읽을 수 없다 (공통지침 30 - 2.1)
- **가독성 검산 필수**: 캡처 원본 폭 기준 렌더 글자크기 7px 이상 (공통지침 30 - 2.2)
- **화살표/번호 사용**: 설명 대상에 빨간색 원 또는 화살표 표시
- **민감 정보 마스킹**: 비밀번호, API 키, 개인정보는 흐리게 처리

### 2.2 캡처 영역 예시

| 메뉴 | 캡처 대상 영역 |
|------|---------------|
| 대시보드 | 상태 요약 패널, 알림 영역, 차트 범례 |
| 수집 스케줄 | 필터 패널, 상태 뱃지, 상세 보기 버튼 |
| API 키 관리 | 등록 폼, 만료일 달력, 메일 테스트 버튼 |
| 사용자 관리 | 권한 체크박스 그룹, 데이터 권한 트리 |
| 관리자 설정 | 코드/색상 선택기, 아이콘 업로드 영역 |

### 2.3 이미지 삽입 방법

```markdown
<!-- Markdown 문법 -->
![설명](images/파일명.png)

<!-- HTML 태그 (크기 조절 필요시) -->
<img src="images/파일명.png" width="600" alt="설명">

<!-- 테두리 있는 이미지 (강조 필요시) -->
<div style="border: 2px solid #ddd; padding: 10px;">
  <img src="images/파일명.png" width="100%" alt="설명">
</div>
```

---

## 3. 관리자 설정(mngr_sett) 작성 특이사항

`05-mngr-sett.md`는 정보가 방대하므로 별도 파일로 관리합니다.

### 3.1 추가 섹션 구조

| 섹션 | 내용 |
|------|------|
| 10. API 관리 | API 키 등록/수정/조회, 만료일 관리, 메일 테스트 |

### 3.2 API 관리 상세

**10.1 API 키 목록 조회**
- 페이징, 검색 기능
- 코드, 만료일, 담당자 정보 확인

**10.2 API 키 등록/수정**
- 코드, 만료일, 담당자 이메일 입력
- 저장 시 유효성 검사

**10.3 API 키 삭제**
- 선택 삭제, 일괄 삭제

**10.4 만료 알림 설정**
- 30일 전/7일 전/당일 메일 발송
- 메일 스케줄 설정

**10.5 메일 테스트**
- 테스트 메일 발송 기능
- SMTP 연결 확인

---

## 4. 공통 작성 규칙

### 4.1 한글 작성 원칙

- 모든 문서는 한글로 작성
- 영문 용어는 괄호로 병기: "대시보드(Dashboard)"
- 메뉴ID는 영문 그대로: `mngr_sett`, `api_key_mngr`

### 4.2 테이블 작성 규칙

```markdown
| 컬럼1 | 컬럼2 | 컬럼3 |
|-------|-------|-------|
| 값1   | 값2   | 값3   |
```

### 4.3 경고/주의사항 강조

```markdown
> ⚠️ **주의**: 이 작업은 되돌릴 수 없습니다.

> 💡 **팁**: 단축키 `Ctrl+F`를 사용하세요.

> 🔴 **위험**: 삭제된 데이터는 복구할 수 없습니다.
```

---

## 5. 작성 완료 체크리스트

- [ ] 파일명 규칙 준수
- [ ] 문서 구조 템플릿 준수
- [ ] **A4 `<style>` 블록이 문서 첫 줄에 있는가** (공통지침 30 - 1장)
- [ ] **전체화면 캡처가 삽입되어 있지 않은가** (공통지침 30 - 2.1)
- [ ] **깨진 이미지 참조 0건** (00-core.md 참조 검증)
- [ ] **문서가 기술한 화면·탭·메뉴가 실제 소스와 일치하는가** (02.hallucination-prevention.md 5️⃣)
- [ ] 한글 작성 원칙 준수
- [ ] 테이블 마크다운 문법 정확
- [ ] 링크 경로 정확 (상대 경로 사용)
- [ ] 민감 정보 마스킹 확인

<div class="doc-footer">
  <span><b>MSYS-DEV-00</b> · Rev. 1.0</span>
  <span>1 / 1</span>
</div>
