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
  <td class="doctitle" colspan="2">원본 데이터</td>
  <td><span class="label">문서번호</span><span class="val">MSYS-OPS-04-10</span></td>
</tr>
<tr>
  <td><span class="label">분류</span><span class="val">운영 매뉴얼</span></td>
  <td><span class="label">개정번호</span><span class="val">Rev. 1.0</span></td>
  <td><span class="label">시행일</span><span class="val">2026-07-22</span></td>
</tr>
<tr>
  <td colspan="2"><span class="label">적용 범위</span><span class="val">공통 메뉴 - 원본 데이터</span></td>
  <td><span class="label">승인</span><span class="val">운영팀장</span></td>
</tr>
</table>

# 원본 데이터

> **핵심 기능**: 수집된 원본 데이터를 조회하고, 날짜/Job ID 등 다양한 필터로 검색하여 데이터 품질과 수집 상태를 확인합니다.

---

## 1. 메뉴 접속 방법

- **경로**: 상단 메뉴 → 원본 데이터
- **URL**: `/raw_data`
- **필요 권한**: `raw_data`
- **로그**: 메뉴 접근 시 `tb_user_acs_log` 테이블에 접근 이력이 기록됩니다.

---

## 2. 화면 구성

### 2.1 전체 화면 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  [필터] (접이식)                                                 │
│  시작일: [____]  종료일: [____]  Job ID: [전체▼]  [조회]         │
├─────────────────────────────────────────────────────────────────┤
│  [원본 데이터 테이블]                                            │
│  총 1,234건  [검색] [행 수: 20개▼]                              │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐            │
│  │날짜  │Job ID│상태  │요청  │응답  │소요시간│수집건수│            │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 각 영역 상세 설명

#### ① 필터

| 요소 | 설명 |
|------|------|
| 시작일 | 조회 시작 날짜 |
| 종료일 | 조회 종료 날짜 |
| Job ID | 특정 Job ID 필터 |
| 조회 버튼 | 데이터 갱신 |

#### ② 원본 데이터 테이블

| 컬럼 | 설명 |
|------|------|
| 날짜 | 수집 실행 날짜/시간 |
| Job ID | 수집 작업 ID |
| 상태 | CD901(성공)/CD902(실패)/CD903(미수집) |
| 요청 정보 | API 요청 파라미터 또는 URL |
| 응답 정보 | API 응답 요약 또는 에러 메시지 |
| 소요 시간 | 수집 소요 시간 (ms) |
| 수집 건수 | 실제 수집된 데이터 건수 |

**데이터 출처:** `tb_con_hist`

---

## 3. 조작 방법

### 3.1 원본 데이터 조회

**조작 절차:**
1. 시작일/종료일 선택
2. Job ID 선택 (선택 사항)
3. `조회` 버튼 클릭

**확인 방법:**
- 테이블에 데이터가 표시되는지 확인
- 총 건수 확인

### 3.2 상세 데이터 확인

**조작 절차:**
1. 대상 행 클릭
2. 상세 팝업 또는 확장 영역에서 전체 요청/응답 데이터 확인

---

## 4. 모니터링 체크리스트

- [ ] **실패 상태** 데이터가 있는지 확인
- [ ] **소요 시간**이 비정상적으로 긴 경우가 있는지 확인
- [ ] **수집 건수**가 0인 경우가 있는지 확인
- [ ] **특정 기간**에 데이터가 누락되지 않았는지 확인

---

## 5. 자주 발생하는 문제

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| 테이블이 비어있음 | 날짜 범위 내 데이터 없음 | 날짜 범위 확대 |
| 상태가 모두 실패 | 수집 에이전트 장애 | 에이전트 로그 확인 |
| 소요 시간이 급증 | 네트워크 지연 또는 대상 서버 과부하 | 대상 서버 상태 확인 |

---

> 다음 문서: [11-admin.md](11-admin.md)

<div class="doc-footer">
  <span><b>MSYS-OPS-04-10</b> · Rev. 1.0</span>
  <span>1 / 1</span>
</div>
